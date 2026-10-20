import { z } from 'zod';

// Keep the real repo .env out of these tests; each test sets process.env itself.
jest.mock('dotenv', () => ({ config: jest.fn() }));

type EnvModule = typeof import('./env');

const validEnv: Record<string, string> = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'test_user',
  POSTGRES_PASSWORD: 'test_password',
  POSTGRES_DB: 'test_db',
  SWAGGER_ENABLED: 'false',
  REGION: 'us-east-2',
  AUTH_COGNITO_APP_CLIENT_ID: 'test-client-id',
  AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
};

/** Loads a fresh copy of ./env against the given mock process.env. */
function loadEnv(mockEnv: Record<string, string | undefined>): EnvModule {
  process.env = mockEnv as NodeJS.ProcessEnv;
  let mod: EnvModule | undefined;
  jest.isolateModules(() => {
    mod = require('./env');
  });
  return mod as EnvModule;
}

/** Returns the error thrown while importing ./env with the given env. */
function importError(mockEnv: Record<string, string | undefined>): Error {
  try {
    loadEnv(mockEnv);
  } catch (error) {
    return error as Error;
  }
  throw new Error('Expected importing ./env to throw');
}

describe('backend envUtility', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses and coerces a valid env at import time', () => {
    const { envUtility } = loadEnv(validEnv);

    expect(envUtility).toEqual({
      ...validEnv,
      POSTGRES_PORT: 5432,
      SWAGGER_ENABLED: false,
    });
  });

  it('returns a frozen object containing only declared variables', () => {
    const { envUtility } = loadEnv({ ...validEnv, UNRELATED_VAR: 'x' });

    expect(Object.isFrozen(envUtility)).toBe(true);
    expect(envUtility).not.toHaveProperty('UNRELATED_VAR');
  });

  it('trims surrounding whitespace', () => {
    const { envUtility } = loadEnv({ ...validEnv, REGION: '  us-east-2  ' });

    expect(envUtility.REGION).toBe('us-east-2');
  });

  it('throws naming a missing variable', () => {
    const rest: Record<string, string | undefined> = { ...validEnv };
    delete rest.POSTGRES_HOST;

    expect(importError(rest).message).toBe(
      'Environment validation failed. Missing: POSTGRES_HOST. See example.env for the expected variables.',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('treats an %s value as missing', (_label, value) => {
    expect(importError({ ...validEnv, REGION: value }).message).toContain(
      'Missing: REGION.',
    );
  });

  it('names every missing and invalid variable in a single error', () => {
    const error = importError({
      ...validEnv,
      POSTGRES_HOST: undefined,
      REGION: '',
      POSTGRES_PORT: 'not-a-port',
    });

    expect(error.message).toBe(
      'Environment validation failed. Missing: POSTGRES_HOST, REGION. Invalid: POSTGRES_PORT. See example.env for the expected variables.',
    );
  });

  it.each(['abc', '0', '70000', '30.5'])('rejects %p as a port', (value) => {
    expect(
      importError({ ...validEnv, POSTGRES_PORT: value }).message,
    ).toContain('Invalid: POSTGRES_PORT.');
  });

  it.each([
    ['true', true],
    ['TRUE', true],
    ['1', true],
    ['false', false],
    ['no', false],
  ])('parses SWAGGER_ENABLED=%p as %p', (value, expected) => {
    const { envUtility } = loadEnv({ ...validEnv, SWAGGER_ENABLED: value });

    expect(envUtility.SWAGGER_ENABLED).toBe(expected);
  });

  it('rejects a non-boolean SWAGGER_ENABLED', () => {
    expect(
      importError({ ...validEnv, SWAGGER_ENABLED: 'banana' }).message,
    ).toContain('Invalid: SWAGGER_ENABLED.');
  });

  it('never includes values in the error message', () => {
    const secret = 'super-secret-value-123';
    const error = importError({
      ...validEnv,
      POSTGRES_PASSWORD: '',
      POSTGRES_PORT: secret,
      SWAGGER_ENABLED: secret,
    });

    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain(validEnv.POSTGRES_USER);
  });

  it('rejects VITE_ variables in a backend schema', () => {
    const { parseEnv, requiredString } = loadEnv(validEnv);
    const schema = z.object({ VITE_API_BASE_URL: requiredString });

    expect(() =>
      parseEnv(schema, { VITE_API_BASE_URL: 'http://localhost' }),
    ).toThrow(
      'VITE_ variables are exposed to the browser and belong in the frontend env utility: VITE_API_BASE_URL',
    );
  });
});

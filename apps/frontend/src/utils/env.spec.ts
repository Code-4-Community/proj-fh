type EnvModule = typeof import('./env');

const validEnv: Record<string, string> = {
  VITE_COGNITO_APP_CLIENT_ID: 'test-client-id',
  VITE_COGNITO_USER_POOL_ID: 'us-east-2_test',
  VITE_API_BASE_URL: 'http://localhost:3000',
};

/**
 * In tests, mock the .env module:
 * `jest.mock('<relative path>/utils/env', () => ({ envUtility: { ... } }))`.
 */

/**
 * Loads a fresh copy of ./env against the given mock bundler env.
 * `import.meta.env` is supplied by mocking ./envSource.
 */
function loadEnv(mockEnv: Record<string, string | undefined>): EnvModule {
  let mod: EnvModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('./envSource', () => ({ rawEnv: mockEnv }));
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

describe('frontend envUtility', () => {
  it('parses a valid env at import time', () => {
    const { envUtility } = loadEnv(validEnv);

    expect(envUtility).toEqual(validEnv);
  });

  it('returns a frozen object containing only declared variables', () => {
    const { envUtility } = loadEnv({ ...validEnv, VITE_UNRELATED: 'x' });

    expect(Object.isFrozen(envUtility)).toBe(true);
    expect(envUtility).not.toHaveProperty('VITE_UNRELATED');
  });

  it('trims surrounding whitespace', () => {
    const { envUtility } = loadEnv({
      ...validEnv,
      VITE_COGNITO_USER_POOL_ID: '  us-east-2_test  ',
    });

    expect(envUtility.VITE_COGNITO_USER_POOL_ID).toBe('us-east-2_test');
  });

  it('throws naming a missing variable', () => {
    const rest: Record<string, string | undefined> = { ...validEnv };
    delete rest.VITE_COGNITO_APP_CLIENT_ID;

    expect(importError(rest).message).toBe(
      'Environment validation failed. Missing: VITE_COGNITO_APP_CLIENT_ID. See example.env for the expected variables.',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('treats an %s value as missing', (_label, value) => {
    expect(
      importError({ ...validEnv, VITE_COGNITO_USER_POOL_ID: value }).message,
    ).toContain('Missing: VITE_COGNITO_USER_POOL_ID.');
  });

  it('names every missing and invalid variable in a single error', () => {
    const error = importError({
      VITE_COGNITO_APP_CLIENT_ID: undefined,
      VITE_COGNITO_USER_POOL_ID: '',
      VITE_API_BASE_URL: 'not a url',
    });

    expect(error.message).toBe(
      'Environment validation failed. Missing: VITE_COGNITO_APP_CLIENT_ID, VITE_COGNITO_USER_POOL_ID. Invalid: VITE_API_BASE_URL. See example.env for the expected variables.',
    );
  });

  it('rejects an invalid URL', () => {
    expect(
      importError({ ...validEnv, VITE_API_BASE_URL: 'localhost:3000/api' })
        .message,
    ).toContain('Invalid: VITE_API_BASE_URL.');
  });

  it('never includes values in the error message', () => {
    const secret = 'super-secret-value-123';
    const error = importError({
      ...validEnv,
      VITE_COGNITO_APP_CLIENT_ID: '',
      VITE_API_BASE_URL: secret,
    });

    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain(validEnv.VITE_COGNITO_USER_POOL_ID);
  });

  it('rejects variables without the VITE_ prefix', () => {
    const { parseEnv, requiredString } = loadEnv(validEnv);
    const { z: zod } = jest.requireActual<typeof import('zod')>('zod');
    const schema = zod.object({ POSTGRES_PASSWORD: requiredString });

    expect(() =>
      // @ts-expect-error -- the VITE_ prefix is also enforced by the type
      parseEnv(schema, { POSTGRES_PASSWORD: 'secret' }),
    ).toThrow(
      'Frontend env variables must be prefixed with VITE_: POSTGRES_PASSWORD',
    );
  });
});

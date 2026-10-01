import { generateKeyPairSync } from 'crypto';
import { Passport } from 'passport';
import jwt from 'jsonwebtoken';
import { JwtStrategy } from './jwt.strategy';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret:
    () =>
    (
      _request: unknown,
      _rawToken: string,
      done: (error: Error | null, key?: string) => void,
    ) => {
      const key = process.env.TEST_COGNITO_PUBLIC_KEY;
      done(key ? null : new Error('Test JWKS key is not configured.'), key);
    },
}));

describe('JwtStrategy', () => {
  const issuer =
    'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example';
  const audience = 'example-client-id';
  let strategy: JwtStrategy;
  let passport: Passport;
  let privateKey: string;

  beforeAll(() => {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.REGION = 'us-east-2';
    process.env.AUTH_COGNITO_USER_POOL_ID = 'us-east-2_example';
    process.env.AUTH_COGNITO_APP_CLIENT_ID = audience;
    process.env.TEST_COGNITO_PUBLIC_KEY = keyPair.publicKey;
    privateKey = keyPair.privateKey;
    strategy = new JwtStrategy();
    passport = new Passport();
    passport.use('jwt', strategy);
  });

  it('normalizes the verified Cognito ID-token identity', () => {
    expect(
      strategy.validate({
        sub: 'cognito-subject',
        email: 'person@example.com',
        token_use: 'id',
      }),
    ).toEqual({ sub: 'cognito-subject', email: 'person@example.com' });
  });

  it('rejects access tokens', () => {
    expect(() =>
      strategy.validate({
        sub: 'cognito-subject',
        email: 'person@example.com',
        token_use: 'access',
      }),
    ).toThrow('A Cognito ID token is required.');
  });

  it('rejects ID tokens without an email claim', () => {
    expect(() =>
      strategy.validate({ sub: 'cognito-subject', token_use: 'id' }),
    ).toThrow('The Cognito ID token must include sub and email claims.');
  });

  it('verifies a signed token and returns its normalized identity', async () => {
    const result = await authenticate(makeToken());

    expect(result.user).toEqual({
      sub: 'cognito-subject',
      email: 'person@example.com',
    });
    expect(result.info).toBeUndefined();
  });

  it.each([
    ['wrong issuer', { issuer: 'https://untrusted.example' }],
    ['wrong audience', { audience: 'another-client-id' }],
    ['expired token', { expiresIn: '-1s' }],
  ])('rejects a token with %s', async (_description, options) => {
    const result = await authenticate(makeToken(options));
    expect(result.user).toBeFalsy();
    expect(result.info).toBeTruthy();
  });

  it('rejects a token signed by an untrusted key', async () => {
    const otherKey = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = jwt.sign(
      { sub: 'cognito-subject', email: 'person@example.com', token_use: 'id' },
      otherKey.privateKey,
      { algorithm: 'RS256', issuer, audience, expiresIn: '5m' },
    );

    const result = await authenticate(token);
    expect(result.user).toBeFalsy();
    expect(result.info).toBeTruthy();
  });

  function makeToken(options: jwt.SignOptions = {}): string {
    return jwt.sign(
      { sub: 'cognito-subject', email: 'person@example.com', token_use: 'id' },
      privateKey,
      {
        algorithm: 'RS256',
        issuer,
        audience,
        expiresIn: '5m',
        ...options,
      },
    );
  }

  function authenticate(
    token: string,
  ): Promise<{ user?: unknown; info?: unknown }> {
    return new Promise((resolve, reject) => {
      const middleware = passport.authenticate(
        'jwt',
        { session: false },
        (error: Error | null, user: unknown, info: unknown) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ user, info });
        },
      );

      middleware(
        { headers: { authorization: `Bearer ${token}` } } as never,
        {} as never,
        (error?: Error) => {
          if (error) reject(error);
        },
      );
    });
  }
});

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedIdentity } from './authenticated-identity';

/**
 * Represents the payload of a Cognito ID token (Contains the JWT).
 * 
 * sub: The unique identifier for the user.
 * email: The email address of the user.
 * token_use: Indicates the type of token (should be 'id' for ID tokens).
 */
type CognitoIdTokenPayload = {
  sub?: string;
  email?: string;
  token_use?: string;
};

/**
 * JWT strategy for validating Cognito ID tokens (Which contain JWTs).
 * 
 * This strategy extracts the JWT from the Authorization header, verifies it using the JWKS endpoint,
 * and validates the payload to ensure it contains the required claims (sub and email).
 * 
 * The execution chain is:
 * 1. JwtAuthGuard calls Passport (package) with strategy name 'jwt'.
 * 2. Passport (package) finds the registered JwtStrategy (in jwt.strategy.ts)
 * 3. JwtStrategy validates the token.
 * 4. Its validate() result becomes request.user.
 * 5. request.user is autoinjected into any function with the JwtAuthGuard applied.
 * 6. When /auth/me is called in auth.controller.ts, the user comes from that injected user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  /**
   * Configures the JWT strategy with the necessary options for Cognito ID token validation.
   * Throws an error if the required environment variables are not set.
   */
  constructor() {
    const region = process.env.REGION;
    const userPoolId = process.env.AUTH_COGNITO_USER_POOL_ID;
    const clientId = process.env.AUTH_COGNITO_APP_CLIENT_ID;

    if (!region || !userPoolId || !clientId) {
      throw new Error(
        'REGION, AUTH_COGNITO_USER_POOL_ID, and AUTH_COGNITO_APP_CLIENT_ID must be set to configure Cognito JWT verification.',
      );
    }

    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    const jwksUri = `${issuer}/.well-known/jwks.json`;

    /**
     * Configures the Passport JWT strategy with the necessary options for 
     * Cognito ID token validation (which contains the JWT)
     */
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: clientId,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
    });

    Logger.log(
      `Configuring Cognito JWT verification for issuer ${issuer}`,
      JwtStrategy.name,
    );
  }

  /**
   * Validates the Cognito ID token payload.
   * Ensures that the token is an ID token and contains the required claims (sub and email).
   * Does not validate the JWT
   * the JWT is validated separately by the Passport (parent) JWT strategy BEFORE this method is called.
   * 
   * @param payload The decoded Cognito ID token payload.
   * @returns The authenticated identity containing the sub and email claims.
   */
  validate(payload: CognitoIdTokenPayload): AuthenticatedIdentity {
    if (payload.token_use !== 'id') {
      throw new UnauthorizedException('A Cognito ID token is required.');
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException(
        'The Cognito ID token must include sub and email claims.',
      );
    }

    this.logger.debug(`Validated Cognito identity sub=${payload.sub}`);
    return { sub: payload.sub, email: payload.email };
  }
}

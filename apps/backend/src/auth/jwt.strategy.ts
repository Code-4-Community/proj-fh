import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedIdentity } from './authenticated-identity';

type CognitoIdTokenPayload = {
  sub?: string;
  email?: string;
  token_use?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

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

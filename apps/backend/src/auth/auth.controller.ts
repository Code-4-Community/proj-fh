import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedIdentity } from './authenticated-identity';

/**
 * Represents an authenticated request containing the user's identity.
 */
type AuthenticatedRequest = {
  user: AuthenticatedIdentity;
};

/**
 * Auth controller to handle authentication-related endpoints.
 * 
 * The execution chain is:
 * 1. JwtAuthGuard calls Passport (package) with strategy name 'jwt'.
 * 2. Passport (package) finds the registered JwtStrategy (in jwt.strategy.ts)
 * 3. JwtStrategy validates the token.
 * 4. Its validate() result becomes request.user.
 * 5. request.user is autoinjected into any function with the JwtAuthGuard applied.
 * 6. When /auth/me is called in auth.controller.ts, the user comes from that injected user
 */
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {

  /**
   * Retrieves the authenticated user's identity.
   * 
   * This endpoint is protected by the JwtAuthGuard, ensuring that only authenticated requests can access it.
   * The JwtStrategy autoinjects the validated user into request.user.
   *
   * @param request The authenticated request containing the user identity.
   * @returns The authenticated user's identity.
   */
  @Get('me')
  getIdentity(@Req() request: AuthenticatedRequest): AuthenticatedIdentity {
    return request.user;
  }
}

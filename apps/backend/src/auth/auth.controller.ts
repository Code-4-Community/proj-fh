import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedIdentity } from './authenticated-identity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Status } from '../users/types';

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
  constructor(private readonly usersService: UsersService) {}
  /**
   * Retrieves the authenticated user's identity.
   *
   * This endpoint is protected by the JwtAuthGuard, ensuring that only authenticated requests can access it.
   * The JwtStrategy autoinjects the validated user into request.user.
   *
   * @param request The authenticated request containing the user identity.
   * @returns 200 with the authenticated user's database record.
   * or 403 if token has no email or no user exists with that email
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getIdentity(@Req() request: AuthenticatedRequest): Promise<User> {
    const { email } = request.user;
    if (!email) {
      throw new ForbiddenException(`Missing authenticated user email.`);
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new ForbiddenException(`No user record exists for ${email}.`);
    }

    return user;

  }

  // TODO: Delete before merging
  /**
   * Dummy route for manually testing RolesGuard. Only ADMIN users can access it.
   *
   * @returns 200 with a confirmation message for admins,
   * or 403 if the user isn't in the database or isn't an admin.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Status.ADMIN)
  @Get('admin-only')
  adminOnly(): { message: string } {
    return { message: 'Access granted: you are an admin.' };
  }
}

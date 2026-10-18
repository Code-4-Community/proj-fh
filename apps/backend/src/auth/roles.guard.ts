import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { Status } from '../users/types';
import { ROLES_KEY } from './roles.decorator';

type RequestUser = {
  email?: string;
};

type HttpRequest = {
  user?: RequestUser;
};

/**
 * Authorization guard that enforces role-based access using `@Roles(...)`
 * metadata on route handlers/classes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Determines whether the current request may access the route.
   * It always reloads the current user from the database by authenticated
   * email before evaluating role membership so authorization never relies on
   * a previously attached role value.
   * @param context Current execution context from Nest.
   * @returns `true` when access is allowed.
   * @throws {ForbiddenException} If an authenticated email is not present,
   * the user does not exist, or lacks a required role.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Status[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const requestUser = request.user;

    if (!requestUser?.email) {
      throw new ForbiddenException('Missing authenticated user email.');
    }

    const databaseUser = await this.usersService.findByEmail(requestUser.email);
    if (!databaseUser) {
      throw new ForbiddenException(
        `No user record exists for ${requestUser.email}.`,
      );
    }

    if (!requiredRoles.includes(databaseUser.status)) {
      throw new ForbiddenException(
        `This route requires one of the following roles: ${requiredRoles.join(', ')}. Your role is ${databaseUser.status}.`,
      );
    }

    return true;
  }
}

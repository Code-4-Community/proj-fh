jest.mock('../utils/env', () => ({
  envUtility: {
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: 5432,
    POSTGRES_USER: 'test_user',
    POSTGRES_PASSWORD: 'test_password',
    POSTGRES_DB: 'test_db',
    SWAGGER_ENABLED: false,
    REGION: 'us-east-2',
    AUTH_COGNITO_APP_CLIENT_ID: 'test-client-id',
    AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  },
}));

import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Status } from './types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Unit tests for the DELETE /users/:id route wiring: id parsing, the guards on
 * the route, and delegation to the service. A real RolesGuard and Reflector run
 * against the real route metadata; UsersService is mocked.
 */
describe('UsersController.removeUser', () => {
  let usersService: { remove: jest.Mock; findByEmail: jest.Mock };
  let controller: UsersController;

  const makeUser = (status: Status): User =>
    ({ id: 1, email: 'caller@example.com', status }) as User;

  /** Execution context for the removeUser route, as called by `callerEmail`. */
  const removeUserContext = (callerEmail?: string): ExecutionContext =>
    ({
      getHandler: () => UsersController.prototype.removeUser,
      getClass: () => UsersController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: callerEmail ? { email: callerEmail } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    usersService = { remove: jest.fn(), findByEmail: jest.fn() };
    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('delegates to UsersService.remove with the parsed id and returns its result', async () => {
    const removed = { email: 'staff@example.com' };
    usersService.remove.mockResolvedValue(removed);

    await expect(controller.removeUser('7')).resolves.toBe(removed);
    expect(usersService.remove).toHaveBeenCalledWith(7);
  });

  it('passes a non-numeric id to the service as NaN, which it reports as 404', async () => {
    usersService.remove.mockResolvedValue(undefined);

    await controller.removeUser('abc');

    expect(usersService.remove).toHaveBeenCalledWith(NaN);
  });

  describe('authorization', () => {
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      rolesGuard = new RolesGuard(
        new Reflector(),
        usersService as unknown as UsersService,
      );
    });

    it('requires a verified JWT and the roles guard on the route', () => {
      const guards: unknown[] = Reflect.getMetadata(
        '__guards__',
        UsersController.prototype.removeUser,
      );

      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    });

    it('allows an admin caller', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser(Status.ADMIN));

      await expect(
        rolesGuard.canActivate(removeUserContext('caller@example.com')),
      ).resolves.toBe(true);
    });

    it.each([Status.COMMUNITY_STAFF, Status.PATIENT])(
      'forbids a %s caller',
      async (status) => {
        usersService.findByEmail.mockResolvedValue(makeUser(status));

        await expect(
          rolesGuard.canActivate(removeUserContext('caller@example.com')),
        ).rejects.toBeInstanceOf(ForbiddenException);
      },
    );

    it('forbids a caller with no matching user record', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        rolesGuard.canActivate(removeUserContext('caller@example.com')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids a request with no authenticated identity', async () => {
      await expect(
        rolesGuard.canActivate(removeUserContext()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Status } from '../users/types';

/**
 * Unit tests for RolesGuard.
 *
 * Uses a real Reflector so the @Roles decorator and the guard are tested together.
 * UsersService is mocked, so no database is needed. The JWT guard is not involved:
 * each test sets request.user directly, as if the token had already been verified.
 */

/** Test-only routes covering each way @Roles can be applied. */
class TestController {
  @Roles(Status.ADMIN)
  adminOnly() {
    return true;
  }

  @Roles(Status.ADMIN, Status.COMMUNITY_STAFF)
  anyRole() {
    return true;
  }

  unrestricted() {
    return true;
  }
}

/** A controller restricted at the class level, with no @Roles on its method. */
@Roles(Status.ADMIN)
class AdminController {
  route() {
    return true;
  }
}

/** Builds the minimal ExecutionContext the guard reads from. */
const contextFor = (
  controller: new () => object,
  handlerName: string,
  user?: { email?: string },
): ExecutionContext =>
  ({
    getHandler: () => controller.prototype[handlerName],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const makeUser = (status: Status): User =>
  ({ id: 1, email: 'person@example.com', status }) as unknown as User;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let usersService: { findByEmail: jest.Mock };

  beforeEach(() => {
    usersService = { findByEmail: jest.fn() };
    guard = new RolesGuard(
      new Reflector(),
      usersService as unknown as UsersService,
    );
  });

  it('allows routes without @Roles and does not look up the user', async () => {
    await expect(
      guard.canActivate(contextFor(TestController, 'unrestricted')),
    ).resolves.toBe(true);
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });

  it('allows a user whose database role is required by the route', async () => {
    usersService.findByEmail.mockResolvedValue(makeUser(Status.ADMIN));

    await expect(
      guard.canActivate(
        contextFor(TestController, 'adminOnly', {
          email: 'person@example.com',
        }),
      ),
    ).resolves.toBe(true);
    expect(usersService.findByEmail).toHaveBeenCalledWith('person@example.com');
  });

  it('allows a user whose role is one of several allowed roles', async () => {
    usersService.findByEmail.mockResolvedValue(makeUser(Status.COMMUNITY_STAFF));

    await expect(
      guard.canActivate(
        contextFor(TestController, 'anyRole', { email: 'person@example.com' }),
      ),
    ).resolves.toBe(true);
  });

  it('applies @Roles set on the controller class', async () => {
    usersService.findByEmail.mockResolvedValue(makeUser(Status.COMMUNITY_STAFF));

    await expect(
      guard.canActivate(
        contextFor(AdminController, 'route', { email: 'person@example.com' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a user who lacks the required role with a 403', async () => {
    usersService.findByEmail.mockResolvedValue(makeUser(Status.COMMUNITY_STAFF));

    await expect(
      guard.canActivate(
        contextFor(TestController, 'adminOnly', {
          email: 'person@example.com',
        }),
      ),
    ).rejects.toThrow(
      new ForbiddenException(
        `This route requires one of the following roles: ${Status.ADMIN}. Your role is ${Status.COMMUNITY_STAFF}.`,
      ),
    );
  });

  it('rejects a user who is not in the database with a 403', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextFor(TestController, 'adminOnly', {
          email: 'missing@example.com',
        }),
      ),
    ).rejects.toThrow(
      new ForbiddenException('No user record exists for missing@example.com.'),
    );
  });

  it.each([
    ['no user on the request', undefined],
    ['a user without an email', {}],
  ])('rejects a request with %s with a 403', async (_, user) => {
    await expect(
      guard.canActivate(contextFor(TestController, 'adminOnly', user)),
    ).rejects.toThrow(
      new ForbiddenException('Missing authenticated user email.'),
    );
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });
});

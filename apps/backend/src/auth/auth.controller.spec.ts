import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Status } from '../users/types';

/**
 * Unit tests for AuthController.
 *
 * The JWT guard is mocked by passing the request.user that JwtStrategy would attach after
 * verifying a token. UsersService is mocked, so no database is needed.
 */
describe('AuthController', () => {
  let controller: AuthController;
  let usersService: { findByEmail: jest.Mock };

  const identity = { sub: 'cognito-subject', email: 'person@example.com' };
  const databaseUser = {
    id: 1,
    email: 'person@example.com',
    status: Status.ADMIN,
  } as unknown as User;

  beforeEach(() => {
    usersService = { findByEmail: jest.fn() };
    controller = new AuthController(usersService as unknown as UsersService);
  });

  /** Tests for GET /auth/me. */
  describe('getIdentity', () => {
    it("returns the user's database record, including their status", async () => {
      usersService.findByEmail.mockResolvedValue(databaseUser);

      await expect(controller.getIdentity({ user: identity })).resolves.toEqual(
        databaseUser,
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith(identity.email);
    });

    it('returns 403 when the user is not in the database', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(controller.getIdentity({ user: identity })).rejects.toThrow(
        new ForbiddenException(`No user record exists for ${identity.email}.`),
      );
    });

    it('returns 403 without querying the database when the identity has no email', async () => {
      await expect(
        controller.getIdentity({ user: { sub: 'cognito-subject' } } as never),
      ).rejects.toThrow(
        new ForbiddenException('Missing authenticated user email.'),
      );
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });
  });
});

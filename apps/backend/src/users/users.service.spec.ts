import {
  BadGatewayException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Status } from './types';
import { CognitoAdminService } from '../cognito/cognito-admin.service';

/**
 * Unit tests for UsersService.remove. The repository and the Cognito service
 * are mocked, so no database or AWS call is made. A shared `calls` array
 * records the order of side effects.
 */
describe('UsersService.remove', () => {
  let service: UsersService;
  let calls: string[];
  let repo: { findOneBy: jest.Mock; remove: jest.Mock };
  let cognito: { deleteUserByEmail: jest.Mock };
  let errorLog: jest.SpyInstance;

  const makeUser = (status: Status = Status.COMMUNITY_STAFF): User =>
    ({
      id: 7,
      status,
      firstName: 'Sam',
      lastName: 'Staff',
      email: 'staff@example.com',
    }) as User;

  beforeEach(() => {
    calls = [];
    repo = {
      findOneBy: jest.fn().mockResolvedValue(makeUser()),
      remove: jest.fn().mockImplementation((user: User) => {
        calls.push('db.remove');
        return Promise.resolve(user);
      }),
    };
    cognito = {
      deleteUserByEmail: jest.fn().mockImplementation(() => {
        calls.push('cognito.delete');
        return Promise.resolve('deleted');
      }),
    };
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new UsersService(
      repo as never,
      cognito as unknown as CognitoAdminService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes from Cognito using the database email, then from the database', async () => {
    const result = await service.remove(7);

    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 7 });
    expect(cognito.deleteUserByEmail).toHaveBeenCalledWith('staff@example.com');
    expect(repo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, email: 'staff@example.com' }),
    );
    expect(calls).toEqual(['cognito.delete', 'db.remove']);
    expect(result).toEqual(
      expect.objectContaining({ email: 'staff@example.com' }),
    );
  });

  it('still deletes the database row when Cognito has no account for the user', async () => {
    cognito.deleteUserByEmail.mockResolvedValueOnce('already-absent');

    await expect(service.remove(7)).resolves.toEqual(
      expect.objectContaining({ id: 7 }),
    );
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });

  describe('unknown and invalid ids', () => {
    it('throws NotFoundException when no user has the id, touching neither system', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cognito.deleteUserByEmail).not.toHaveBeenCalled();
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it.each([0, NaN])(
      'throws NotFoundException for the invalid id %p without querying',
      async (id) => {
        await expect(service.remove(id)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(repo.findOneBy).not.toHaveBeenCalled();
        expect(cognito.deleteUserByEmail).not.toHaveBeenCalled();
        expect(repo.remove).not.toHaveBeenCalled();
      },
    );
  });

  describe('user scope', () => {
    it.each([Status.ADMIN, Status.PATIENT])(
      'refuses to remove a %s user, touching neither system',
      async (status) => {
        repo.findOneBy.mockResolvedValue(makeUser(status));

        await expect(service.remove(7)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(cognito.deleteUserByEmail).not.toHaveBeenCalled();
        expect(repo.remove).not.toHaveBeenCalled();
      },
    );
  });

  describe('Cognito failure', () => {
    it('rethrows the error and leaves the database record intact', async () => {
      cognito.deleteUserByEmail.mockRejectedValue(new BadGatewayException());

      await expect(service.remove(7)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });

  describe('database failure after Cognito deletion', () => {
    beforeEach(() => {
      repo.remove.mockRejectedValueOnce(new Error('connection lost'));
    });

    it('logs the inconsistency with the user id and fails the request', async () => {
      await expect(service.remove(7)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );

      expect(cognito.deleteUserByEmail).toHaveBeenCalledTimes(1);
      expect(errorLog).toHaveBeenCalledTimes(1);
      const message = String(errorLog.mock.calls[0][0]);
      expect(message).toContain('id=7');
      expect(message).toContain('Cognito account is gone');
      expect(message).toContain('database delete failed');
    });

    it('does not put the email in the log', async () => {
      await service.remove(7).catch(() => undefined);

      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
        'staff@example.com',
      );
    });
  });

  describe('retry after a partial failure', () => {
    it('finishes the database delete when Cognito reports the account already gone', async () => {
      // First attempt: Cognito deletes, database fails.
      repo.remove.mockRejectedValueOnce(new Error('connection lost'));
      await expect(service.remove(7)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );

      // Retry: Cognito has no such account any more, database now works.
      cognito.deleteUserByEmail.mockResolvedValueOnce('already-absent');
      const result = await service.remove(7);

      expect(cognito.deleteUserByEmail).toHaveBeenCalledTimes(2);
      expect(repo.remove).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expect.objectContaining({ id: 7 }));
    });

    it('can be retried after a Cognito failure with the record still present', async () => {
      cognito.deleteUserByEmail.mockRejectedValueOnce(
        new BadGatewayException(),
      );
      await expect(service.remove(7)).rejects.toBeInstanceOf(
        BadGatewayException,
      );

      await expect(service.remove(7)).resolves.toBeDefined();
      expect(calls).toEqual(['cognito.delete', 'db.remove']);
    });
  });
});

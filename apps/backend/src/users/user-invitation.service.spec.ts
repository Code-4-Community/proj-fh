import { HttpException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

jest.mock('../utils/env', () => ({
  envUtility: {
    REGION: 'us-east-2',
    AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  },
}));

import { UserInvitationService } from './user-invitation.service';
import { CognitoAdminService } from './cognito-admin.service';
import { User } from './user.entity';
import { Status } from './types';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * Unit tests for UserInvitationService.
 * The repository and Cognito are mocked, so no database or AWS access is needed.
 */

/** Builds an error shaped like an AWS SDK error. */
const awsError = (name: string) =>
  Object.assign(new Error(`${name} from Cognito`), {
    name,
    $metadata: { requestId: 'aws-req-1' },
  });

/** Returns the HTTP status a rejected promise carries. */
async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (err) {
    return (err as HttpException).getStatus();
  }
  throw new Error('Expected the promise to reject.');
}

describe('UserInvitationService', () => {
  let service: UserInvitationService;
  let queryBuilder: {
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let repo: { createQueryBuilder: jest.Mock; insert: jest.Mock };
  let cognito: {
    userPoolId: string;
    userExists: jest.Mock;
    createInvitedUser: jest.Mock;
    deleteUser: jest.Mock;
  };
  let loggerError: jest.SpyInstance;

  const dto: CreateUserDto = {
    email: 'Jane.Doe@Example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: Status.COMMUNITY_STAFF,
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    repo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 5 }] }),
    };
    cognito = {
      userPoolId: 'us-east-2_test',
      userExists: jest.fn().mockResolvedValue(false),
      createInvitedUser: jest.fn().mockResolvedValue({
        Username: 'cognito-sub-123',
        UserStatus: 'FORCE_CHANGE_PASSWORD',
      }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    service = new UserInvitationService(
      repo as unknown as Repository<User>,
      cognito as unknown as CognitoAdminService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('successful invite', () => {
    it('creates the Cognito user, then the database row, and returns no secrets', async () => {
      const result = await service.invite(dto);

      expect(result).toEqual({
        id: 5,
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: Status.COMMUNITY_STAFF,
        cognitoStatus: 'FORCE_CHANGE_PASSWORD',
      });
      expect(cognito.createInvitedUser).toHaveBeenCalledWith('jane.doe@example.com');
      expect(repo.insert).toHaveBeenCalledWith({
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        status: Status.COMMUNITY_STAFF,
      });

      // Cognito must succeed before the database is touched.
      expect(cognito.createInvitedUser.mock.invocationCallOrder[0]).toBeLessThan(
        repo.insert.mock.invocationCallOrder[0],
      );

      const keys = Object.keys(result).join(' ').toLowerCase();
      expect(keys).not.toMatch(/password|token|secret/);
    });

    it('checks the database case-insensitively', async () => {
      await service.invite(dto);

      expect(queryBuilder.where).toHaveBeenCalledWith('LOWER(u.email) = :email', {
        email: 'jane.doe@example.com',
      });
    });
  });

  describe('duplicates', () => {
    it('returns 409 for a database duplicate without calling Cognito', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: 1 });

      expect(await statusOf(service.invite(dto))).toBe(409);
      expect(cognito.userExists).not.toHaveBeenCalled();
      expect(cognito.createInvitedUser).not.toHaveBeenCalled();
    });

    it('returns 409 for a Cognito duplicate without creating anything', async () => {
      cognito.userExists.mockResolvedValue(true);

      expect(await statusOf(service.invite(dto))).toBe(409);
      expect(cognito.createInvitedUser).not.toHaveBeenCalled();
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('returns 500 if the Cognito duplicate check itself fails', async () => {
      cognito.userExists.mockRejectedValue(awsError('AccessDeniedException'));

      expect(await statusOf(service.invite(dto))).toBe(500);
      expect(cognito.createInvitedUser).not.toHaveBeenCalled();
    });
  });

  describe('Cognito creation errors', () => {
    it.each([
      ['UsernameExistsException', 409],
      ['InvalidParameterException', 400],
      ['LimitExceededException', 429],
      ['TooManyRequestsException', 429],
      ['CodeDeliveryFailureException', 502],
      ['InternalErrorException', 500],
    ])('maps %s to %i and creates no database record', async (name, status) => {
      cognito.createInvitedUser.mockRejectedValue(awsError(name));

      expect(await statusOf(service.invite(dto))).toBe(status);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('surfaces the daily email limit clearly', async () => {
      cognito.createInvitedUser.mockRejectedValue(awsError('LimitExceededException'));

      await expect(service.invite(dto)).rejects.toThrow(/email sending limit/);
    });

    it('removes any partially created user after an email delivery failure', async () => {
      cognito.createInvitedUser.mockRejectedValue(
        awsError('CodeDeliveryFailureException'),
      );

      await statusOf(service.invite(dto));
      expect(cognito.deleteUser).toHaveBeenCalledWith('jane.doe@example.com');
    });

    it('rolls back a user that is not in FORCE_CHANGE_PASSWORD', async () => {
      cognito.createInvitedUser.mockResolvedValue({
        Username: 'cognito-sub-123',
        UserStatus: 'CONFIRMED',
      });

      expect(await statusOf(service.invite(dto))).toBe(500);
      expect(cognito.deleteUser).toHaveBeenCalledWith('cognito-sub-123');
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  describe('database failure after Cognito creation', () => {
    it('returns 500 and deletes the new Cognito user', async () => {
      repo.insert.mockRejectedValue(new Error('duplicate key value'));

      expect(await statusOf(service.invite(dto))).toBe(500);
      expect(cognito.deleteUser).toHaveBeenCalledWith('cognito-sub-123');
    });

    it('still returns 500 and logs reconciliation details when cleanup fails', async () => {
      repo.insert.mockRejectedValue(new Error('connection lost'));
      cognito.deleteUser.mockRejectedValue(awsError('InternalErrorException'));

      expect(await statusOf(service.invite(dto))).toBe(500);
      expect(loggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('CLEANUP FAILED'),
          email: 'jane.doe@example.com',
          cognitoUsername: 'cognito-sub-123',
          userPoolId: 'us-east-2_test',
          awsRequestId: 'aws-req-1',
        }),
      );
    });
  });
});
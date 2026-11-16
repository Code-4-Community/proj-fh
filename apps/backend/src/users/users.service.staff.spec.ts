import { BadGatewayException, Logger } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Status } from './types';
import { OnboardingStage } from './onboarding-stage';
import { CognitoAdminService } from '../cognito/cognito-admin.service';

/** Builds a database user with predictable names. */
const makeUser = (
  id: number,
  email: string,
  status: Status = Status.COMMUNITY_STAFF,
): User =>
  ({
    id,
    email,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    status,
  }) as User;

/**
 * Unit tests for UsersService.findStaffWithOnboardingStage.
 * The repository and the Cognito service are mocked, so no database or AWS
 * access is needed.
 */
describe('UsersService.findStaffWithOnboardingStage', () => {
  let service: UsersService;
  let repo: { find: jest.Mock };
  let cognito: { listAccountStatusesByEmail: jest.Mock };
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    repo = { find: jest.fn().mockResolvedValue([]) };
    cognito = { listAccountStatusesByEmail: jest.fn().mockResolvedValue(new Map()) };
    warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    service = new UsersService(
      repo as unknown as Repository<User>,
      cognito as unknown as CognitoAdminService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads only admins and community staff, oldest account first', async () => {
    await service.findStaffWithOnboardingStage();

    expect(repo.find).toHaveBeenCalledWith({
      where: { status: In([Status.ADMIN, Status.COMMUNITY_STAFF]) },
      order: { id: 'ASC' },
    });
  });

  it('returns an empty list without calling Cognito when there are no staff', async () => {
    await expect(service.findStaffWithOnboardingStage()).resolves.toEqual([]);
    expect(cognito.listAccountStatusesByEmail).not.toHaveBeenCalled();
  });

  it('attaches each user’s onboarding stage and returns only the documented fields', async () => {
    repo.find.mockResolvedValue([
      makeUser(1, 'admin@example.org', Status.ADMIN),
      makeUser(2, 'Invited@Example.org'),
    ]);
    cognito.listAccountStatusesByEmail.mockResolvedValue(
      new Map([
        ['admin@example.org', 'CONFIRMED'],
        ['invited@example.org', 'FORCE_CHANGE_PASSWORD'],
      ]),
    );

    await expect(service.findStaffWithOnboardingStage()).resolves.toEqual([
      {
        id: 1,
        email: 'admin@example.org',
        firstName: 'First1',
        lastName: 'Last1',
        role: Status.ADMIN,
        onboardingStage: OnboardingStage.ACTIVE,
      },
      {
        id: 2,
        email: 'Invited@Example.org',
        firstName: 'First2',
        lastName: 'Last2',
        role: Status.COMMUNITY_STAFF,
        onboardingStage: OnboardingStage.INVITED,
      },
    ]);
  });

  it('returns a null stage and logs the user id, not the email, when there is no Cognito account', async () => {
    repo.find.mockResolvedValue([makeUser(7, 'missing@example.org')]);

    const [member] = await service.findStaffWithOnboardingStage();

    expect(member.onboardingStage).toBeNull();
    const logged = JSON.stringify(warnLog.mock.calls);
    expect(logged).toContain('id=7');
    expect(logged).not.toContain('missing@example.org');
  });

  it('returns a null stage without a missing-account warning when the email is ambiguous in Cognito', async () => {
    repo.find.mockResolvedValue([makeUser(3, 'dup@example.org')]);
    cognito.listAccountStatusesByEmail.mockResolvedValue(
      new Map([['dup@example.org', undefined]]),
    );

    const [member] = await service.findStaffWithOnboardingStage();

    expect(member.onboardingStage).toBeNull();
    expect(warnLog).not.toHaveBeenCalled();
  });

  it('fails with the Cognito error instead of returning guessed stages', async () => {
    repo.find.mockResolvedValue([makeUser(1, 'a@example.org')]);
    cognito.listAccountStatusesByEmail.mockRejectedValue(
      new BadGatewayException('Failed to load account information from Cognito.'),
    );

    await expect(service.findStaffWithOnboardingStage()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
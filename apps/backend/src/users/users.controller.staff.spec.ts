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

import { BadGatewayException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserInvitationService } from './user-invitation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Status } from './types';
import { OnboardingStage } from './onboarding-stage';
import { StaffMemberResponse } from './dto/staff-member.response';

/**
 * Unit tests for UsersController.listStaff (GET /users).
 * UsersService is mocked, so no database or Cognito access is needed.
 * The guards' own behavior (401 for a bad token, 403 for a non-admin) is
 * covered by jwt.strategy.spec.ts and roles.guard.spec.ts.
 */
describe('UsersController.listStaff', () => {
  const handler = UsersController.prototype.listStaff;

  let controller: UsersController;
  let usersService: { findStaffWithOnboardingStage: jest.Mock };

  const staff: StaffMemberResponse[] = [
    {
      id: 1,
      email: 'admin@example.org',
      firstName: 'Aisha',
      lastName: 'Johnson',
      role: Status.ADMIN,
      onboardingStage: OnboardingStage.ACTIVE,
    },
    {
      id: 2,
      email: 'dkim@example.org',
      firstName: 'Daniel',
      lastName: 'Kim',
      role: Status.COMMUNITY_STAFF,
      onboardingStage: OnboardingStage.INVITED,
    },
  ];

  beforeEach(() => {
    usersService = { findStaffWithOnboardingStage: jest.fn() };
    controller = new UsersController(
      usersService as unknown as UsersService,
      {} as unknown as UserInvitationService,
    );
  });

    it('requires a valid JWT and then checks roles', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('allows only admins', () => {
    expect(new Reflector().get(ROLES_KEY, handler)).toEqual([Status.ADMIN]);
  });

  it('returns the staff list from the service unchanged', async () => {
    usersService.findStaffWithOnboardingStage.mockResolvedValue(staff);

    await expect(controller.listStaff()).resolves.toEqual(staff);
    expect(usersService.findStaffWithOnboardingStage).toHaveBeenCalledTimes(1);
  });

  it('passes a Cognito failure through so the caller gets a 502', async () => {
    usersService.findStaffWithOnboardingStage.mockRejectedValue(
      new BadGatewayException('Failed to load account information from Cognito.'),
    );

    await expect(controller.listStaff()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
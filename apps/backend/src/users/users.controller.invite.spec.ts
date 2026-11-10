jest.mock('../utils/env', () => ({
  envUtility: {
    REGION: 'us-east-2',
    AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  },
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Status } from './types';

/**
 * Checks that POST /users is protected.
 * The guards' own behavior (401 for a bad token, 403 for a non-admin) is covered
 * by jwt.strategy.spec.ts and roles.guard.spec.ts.
 */
describe('UsersController.inviteUser access control', () => {
  const handler = UsersController.prototype.inviteUser;

  it('requires a valid JWT and then checks roles', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('allows only admins', () => {
    expect(new Reflector().get(ROLES_KEY, handler)).toEqual([Status.ADMIN]);
  });
});
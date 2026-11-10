jest.mock('../utils/env', () => ({
  envUtility: {
    REGION: 'us-east-2',
    AUTH_COGNITO_USER_POOL_ID: 'us-east-2_test',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  },
}));

import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoAdminService } from './cognito-admin.service';

/**
 * Unit tests for CognitoAdminService.
 * The SDK client's send() is mocked, so no AWS calls are made.
 */
describe('CognitoAdminService', () => {
  let send: jest.SpyInstance;
  let service: CognitoAdminService;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send = jest.spyOn(CognitoIdentityProviderClient.prototype as any, 'send');
    service = new CognitoAdminService();
  });

  afterEach(() => send.mockRestore());

  it('lets Cognito generate and email the temporary password', async () => {
    send.mockResolvedValue({
      User: { Username: 'a@b.com', UserStatus: 'FORCE_CHANGE_PASSWORD' },
    });

    await service.createInvitedUser('a@b.com');

    const command = send.mock.calls[0][0] as AdminCreateUserCommand;
    expect(command).toBeInstanceOf(AdminCreateUserCommand);
    expect(command.input).toEqual({
      UserPoolId: 'us-east-2_test',
      Username: 'a@b.com',
      UserAttributes: [
        { Name: 'email', Value: 'a@b.com' },
        { Name: 'email_verified', Value: 'true' },
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    });
    expect(command.input).not.toHaveProperty('TemporaryPassword');
    expect(command.input).not.toHaveProperty('MessageAction');
  });

  it('reports an existing user', async () => {
    send.mockResolvedValue({ Username: 'a@b.com' });

    await expect(service.userExists('a@b.com')).resolves.toBe(true);
    expect(send.mock.calls[0][0]).toBeInstanceOf(AdminGetUserCommand);
  });

  it('treats UserNotFoundException as not existing', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('not found'), { name: 'UserNotFoundException' }),
    );

    await expect(service.userExists('a@b.com')).resolves.toBe(false);
  });

  it('rethrows other Cognito errors from the existence check', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('denied'), { name: 'AccessDeniedException' }),
    );

    await expect(service.userExists('a@b.com')).rejects.toThrow('denied');
  });
});
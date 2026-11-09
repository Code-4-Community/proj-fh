import { BadGatewayException, Logger } from '@nestjs/common';
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoAdminService,
  type CognitoConfig,
  escapeFilterValue,
} from './cognito-admin.service';

const config: CognitoConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_example',
  accessKeyId: 'test-access-key-id',
  secretAccessKey: 'test-secret-access-key',
};

/**
 * Unit tests for CognitoAdminService. The AWS client's `send` is stubbed, so no
 * network call is made and no real credentials are needed.
 */
describe('CognitoAdminService', () => {
  let service: CognitoAdminService;
  let send: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  /** The commands passed to `send`, in call order. */
  const sentCommands = () => send.mock.calls.map(([command]) => command);

  beforeEach(() => {
    send = jest.spyOn(CognitoIdentityProviderClient.prototype, 'send');
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new CognitoAdminService(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('looks the user up by email in the configured pool and deletes by the canonical username', async () => {
    send
      .mockResolvedValueOnce({ Users: [{ Username: 'canonical-sub-123' }] })
      .mockResolvedValueOnce({});

    await expect(service.deleteUserByEmail('staff@example.com')).resolves.toBe(
      'deleted',
    );

    const [list, del] = sentCommands();
    expect(list).toBeInstanceOf(ListUsersCommand);
    expect(list.input).toEqual({
      UserPoolId: 'us-east-2_example',
      Filter: 'email = "staff@example.com"',
      Limit: 2,
    });
    expect(del).toBeInstanceOf(AdminDeleteUserCommand);
    expect(del.input).toEqual({
      UserPoolId: 'us-east-2_example',
      Username: 'canonical-sub-123',
    });
  });

  it('treats no matching Cognito account as already deleted and does not call delete', async () => {
    send.mockResolvedValueOnce({ Users: [] });

    await expect(service.deleteUserByEmail('gone@example.com')).resolves.toBe(
      'already-absent',
    );
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('treats UserNotFoundException on delete as already deleted', async () => {
    send
      .mockResolvedValueOnce({ Users: [{ Username: 'canonical-sub-123' }] })
      .mockRejectedValueOnce(
        new UserNotFoundException({ message: 'x', $metadata: {} }),
      );

    await expect(service.deleteUserByEmail('staff@example.com')).resolves.toBe(
      'already-absent',
    );
  });

  it('throws BadGatewayException when the lookup fails, without deleting', async () => {
    send.mockRejectedValueOnce(new Error('network down'));

    await expect(
      service.deleteUserByEmail('staff@example.com'),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('throws BadGatewayException when the delete fails', async () => {
    send
      .mockResolvedValueOnce({ Users: [{ Username: 'canonical-sub-123' }] })
      .mockRejectedValueOnce(new Error('access denied'));

    await expect(
      service.deleteUserByEmail('staff@example.com'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('refuses to delete when more than one account matches the email', async () => {
    send.mockResolvedValueOnce({
      Users: [{ Username: 'a' }, { Username: 'b' }],
    });

    await expect(
      service.deleteUserByEmail('staff@example.com'),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not put the email, credentials or raw AWS messages in the logs or the error', async () => {
    send.mockRejectedValueOnce(
      new Error(
        'denied for staff@example.com using test-secret-access-key in pool',
      ),
    );

    const error = await service
      .deleteUserByEmail('staff@example.com')
      .catch((e: Error) => e);

    const logged = JSON.stringify(errorLog.mock.calls);
    const thrown = JSON.stringify((error as BadGatewayException).getResponse());
    for (const secret of [
      'staff@example.com',
      'test-secret-access-key',
      'test-access-key-id',
    ]) {
      expect(logged).not.toContain(secret);
      expect(thrown).not.toContain(secret);
    }
  });

  describe('escapeFilterValue', () => {
    it('escapes quotes and backslashes so an email cannot break out of the filter', () => {
      expect(escapeFilterValue('a"b\\c@example.com')).toBe(
        'a\\"b\\\\c@example.com',
      );
    });
  });
});

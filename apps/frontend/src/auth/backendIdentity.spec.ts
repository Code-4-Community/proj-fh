import { AxiosError, AxiosHeaders } from 'axios';
import apiClient from '../api/apiClient';
import { signOutUser } from './cognito';
import { getIdentityAfterSignIn } from './backendIdentity';

jest.mock('../api/apiClient', () => ({
  __esModule: true,
  default: { getCurrentIdentity: jest.fn() },
}));

jest.mock('./cognito', () => ({
  signOutUser: jest.fn(),
}));

describe('getIdentityAfterSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the backend user when identity validation succeeds', async () => {
    const identity = {
      id: 1,
      status: 'STANDARD' as const,
      firstName: 'Test',
      lastName: 'User',
      email: 'person@example.com',
    };
    jest.mocked(apiClient.getCurrentIdentity).mockResolvedValue(identity);

    await expect(getIdentityAfterSignIn()).resolves.toEqual(identity);
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it('signs out from Cognito when the backend rejects the user with 403', async () => {
    jest.mocked(apiClient.getCurrentIdentity).mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: { message: 'No user record exists.' },
        status: 403,
        statusText: 'Forbidden',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );
    jest.mocked(signOutUser).mockResolvedValue();

    await expect(getIdentityAfterSignIn()).rejects.toThrow(
      'You have been signed out.',
    );
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });

  it('does not sign out from Cognito for non-403 backend errors', async () => {
    const error = new AxiosError('Backend unavailable');
    jest.mocked(apiClient.getCurrentIdentity).mockRejectedValue(error);

    await expect(getIdentityAfterSignIn()).rejects.toBe(error);
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it('reports a failure if Cognito sign-out fails', async () => {
    jest.mocked(apiClient.getCurrentIdentity).mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
        data: { message: 'No user record exists.' },
        status: 403,
        statusText: 'Forbidden',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );
    jest
      .mocked(signOutUser)
      .mockRejectedValue(new Error('Cognito sign-out failed.'));

    await expect(getIdentityAfterSignIn()).rejects.toThrow(
      'Automatic sign-out failed: Cognito sign-out failed.',
    );
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });
});

import {
  confirmResetPassword,
  confirmSignIn,
  resetPassword,
  signIn,
} from 'aws-amplify/auth';
import {
  completeNewPasswordChallenge,
  confirmPasswordReset,
  requestPasswordReset,
  signInWithEmailPassword,
} from './cognito';

jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
  confirmSignIn: jest.fn(),
  fetchAuthSession: jest.fn(),
  fetchUserAttributes: jest.fn(),
  getCurrentUser: jest.fn(),
  resetPassword: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('./amplify', () => ({
  isAmplifyConfigured: () => true,
}));

describe('Cognito password challenge', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the new-password-required challenge from sign-in', async () => {
    jest.mocked(signIn).mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      },
    } as Awaited<ReturnType<typeof signIn>>);

    await expect(
      signInWithEmailPassword('person@example.com', 'temporary-password'),
    ).resolves.toEqual({ kind: 'NEW_PASSWORD_REQUIRED' });
  });

  it('confirms the challenge with the permanent password', async () => {
    jest.mocked(confirmSignIn).mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    } as Awaited<ReturnType<typeof confirmSignIn>>);

    await expect(
      completeNewPasswordChallenge('Permanent-password1!'),
    ).resolves.toBeUndefined();
    expect(confirmSignIn).toHaveBeenCalledWith({
      challengeResponse: 'Permanent-password1!',
    });
  });
});

describe('Cognito password reset', () => {
  afterEach(() => jest.clearAllMocks());

  it('requests a reset code for the email', async () => {
    jest.mocked(resetPassword).mockResolvedValue({
      isPasswordReset: false,
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    } as Awaited<ReturnType<typeof resetPassword>>);

    await expect(
      requestPasswordReset('person@example.com'),
    ).resolves.toBeUndefined();
    expect(resetPassword).toHaveBeenCalledWith({
      username: 'person@example.com',
    });
  });

  it('rethrows errors from requesting a code', async () => {
    const error = Object.assign(new Error('nope'), {
      name: 'UserNotFoundException',
    });
    jest.mocked(resetPassword).mockRejectedValue(error);

    await expect(requestPasswordReset('person@example.com')).rejects.toBe(
      error,
    );
  });

  it('confirms the reset with the code and new password', async () => {
    jest.mocked(confirmResetPassword).mockResolvedValue(undefined);

    await expect(
      confirmPasswordReset('person@example.com', '123456', 'New-password1!'),
    ).resolves.toBeUndefined();
    expect(confirmResetPassword).toHaveBeenCalledWith({
      username: 'person@example.com',
      confirmationCode: '123456',
      newPassword: 'New-password1!',
    });
  });

  it('rethrows errors from confirming the reset', async () => {
    const error = Object.assign(new Error('bad code'), {
      name: 'CodeMismatchException',
    });
    jest.mocked(confirmResetPassword).mockRejectedValue(error);

    await expect(
      confirmPasswordReset('person@example.com', '000000', 'New-password1!'),
    ).rejects.toBe(error);
  });
});

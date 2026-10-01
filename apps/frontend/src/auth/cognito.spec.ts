import { confirmSignIn, signIn } from 'aws-amplify/auth';
import {
  completeNewPasswordChallenge,
  signInWithEmailPassword,
} from './cognito';

jest.mock('aws-amplify/auth', () => ({
  confirmSignIn: jest.fn(),
  fetchAuthSession: jest.fn(),
  fetchUserAttributes: jest.fn(),
  getCurrentUser: jest.fn(),
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

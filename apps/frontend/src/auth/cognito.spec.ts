import { confirmSignIn, signIn } from 'aws-amplify/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeNewPasswordChallenge,
  signInWithEmailPassword,
} from './cognito';

vi.mock('aws-amplify/auth', () => ({
  confirmSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
  fetchUserAttributes: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./amplify', () => ({
  isAmplifyConfigured: () => true,
}));

describe('Cognito password challenge', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns the new-password-required challenge from sign-in', async () => {
    vi.mocked(signIn).mockResolvedValue({
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
    vi.mocked(confirmSignIn).mockResolvedValue({
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

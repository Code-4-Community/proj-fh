import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  confirmSignIn,
  signIn,
  signOut,
} from 'aws-amplify/auth';
import { isAmplifyConfigured } from './amplify';

const requireConfiguration = (): void => {
  if (!isAmplifyConfigured()) {
    throw new Error('Cognito is not configured for this frontend.');
  }
};

export type SignInResult =
  { kind: 'SIGNED_IN' } | { kind: 'NEW_PASSWORD_REQUIRED' };

export const signInWithEmailPassword = async (
  email: string,
  password: string,
): Promise<SignInResult> => {
  requireConfiguration();
  const result = await signIn({ username: email, password });

  if (result.isSignedIn) {
    return { kind: 'SIGNED_IN' };
  }

  if (
    result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  ) {
    return { kind: 'NEW_PASSWORD_REQUIRED' };
  }

  throw new Error(
    `Cognito requires an unsupported sign-in step: ${result.nextStep.signInStep}.`,
  );
};

export const completeNewPasswordChallenge = async (
  newPassword: string,
): Promise<void> => {
  requireConfiguration();
  const result = await confirmSignIn({ challengeResponse: newPassword });

  if (!result.isSignedIn) {
    throw new Error(
      `Cognito requires another sign-in step: ${result.nextStep.signInStep}.`,
    );
  }
};

export const getIdToken = async (): Promise<string | undefined> => {
  if (!isAmplifyConfigured()) return undefined;

  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
};

export const getSignedInEmail = async (): Promise<string | undefined> => {
  if (!isAmplifyConfigured()) return undefined;

  try {
    await getCurrentUser();
    const attributes = await fetchUserAttributes();
    return attributes.email;
  } catch {
    return undefined;
  }
};

export const signOutUser = async (): Promise<void> => {
  requireConfiguration();
  await signOut();
};

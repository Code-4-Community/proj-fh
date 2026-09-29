import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  confirmSignIn,
  signIn,
  signOut,
} from 'aws-amplify/auth';
import { isAmplifyConfigured } from './amplify';

/**
 * The Amplify package is used for handling authentication operations with AWS Cognito on the frontend in this file.
 * It provides functions for signing in, signing out, fetching user attributes, and managing authentication sessions.
 */

/**
 * Ensures that AWS Amplify is configured before performing any authentication operations.
 * Throws an error if Amplify is not configured.
 */
const requireConfiguration = (): void => {
  if (!isAmplifyConfigured()) {
    throw new Error('Cognito is not configured for this frontend.');
  }
};

export type SignInResult =
  { kind: 'SIGNED_IN' } | { kind: 'NEW_PASSWORD_REQUIRED' };

/**
 * Signs in a user with the provided email and password with AWS Cognito.
 * 
 * @param email The user's email address.
 * @param password The user's password.
 * @returns A promise that resolves to a SignInResult indicating the outcome of the sign-in attempt.
 * @throws An error if Amplify is not configured or if an unsupported sign-in step is required.
 */
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

/**
 * Completes the new password challenge during the sign-in process with AWS Cognito.
 * 
 * @param newPassword The new password to set for the user.
 * @returns A promise that resolves when the new password challenge is successfully completed.
 * @throws An error if Amplify is not configured or if another sign-in step is required.
 */
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

/**
 * Retrieves the ID token (Contains the JWT) of the currently signed-in user from AWS Cognito.
 * 
 * @returns A promise that resolves to the ID token (Contains the JWT) as a string, 
 * or undefined if Amplify is not configured or if the user is not signed in.
 */
export const getIdToken = async (): Promise<string | undefined> => {
  if (!isAmplifyConfigured()) return undefined;

  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
};

/**
 * Retrieves the email address of the currently signed-in user from AWS Cognito.
 * 
 * @returns A promise that resolves to the email address as a string, or undefined if Amplify is not configured or if the user is not signed in.
 */
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

/**
 * Signs out the currently signed-in user from AWS Cognito.
 * 
 * @returns A promise that resolves when the user is successfully signed out.
 * @throws An error if Amplify is not configured.
 */
export const signOutUser = async (): Promise<void> => {
  requireConfiguration();
  await signOut();
};

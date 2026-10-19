import axios from 'axios';
import apiClient from '../api/apiClient';
import { signOutUser } from './cognito';

/**
 * Given the user is already signed in in Cognito, this function attempts to fetch the corresponding backend identity.
 * Fetches the current identity of the signed-in user from the backend. 
 * If the backend returns a 403 error, the user is automatically signed out from Cognito.
 * @returns The current identity of the signed-in user.
 */
export const getIdentityAfterSignIn = async () => {
  try {
    return await apiClient.getCurrentIdentity();
  } catch (cause) {
    if (!axios.isAxiosError(cause) || cause.response?.status !== 403) {
      throw cause;
    }

    try {
      await signOutUser();
    } catch (signOutCause) {
      const details =
        signOutCause instanceof Error ? signOutCause.message : 'Unknown error';
      throw new Error(
        `Your Cognito account does not have a matching application user. Automatic sign-out failed: ${details}`,
      );
    }

    throw new Error(
      'Your Cognito account does not have a matching application user. You have been signed out.',
    );
  }
};

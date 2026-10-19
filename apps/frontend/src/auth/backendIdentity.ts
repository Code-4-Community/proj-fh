import axios from 'axios';
import apiClient from '../api/apiClient';
import { signOutUser } from './cognito';

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

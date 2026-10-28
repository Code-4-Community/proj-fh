import { Amplify } from 'aws-amplify';
import { envUtility } from '../utils/env';

/**
 * AWS Amplify is the cloud service used to host the frontend
 *
 * However, it is also a developer tool for managing authentication and other cloud-related functionalities.
 *
 * The frontend does not directly give passwords to the backend, and instead it interacts with AWS Amplify for authentication purposes.
 * AWS Amplify gives the frontend a JWT in return, which is what it gives to the backend for authentication.
 */

let configured = false;

/**
 * Configures AWS Amplify with the Cognito user pool ID and app client ID from the env utility.
 * The IDs are validated when utils/env is imported, so a missing ID fails at startup.
 * This function ensures that AWS Amplify is properly set up before any authentication operations are performed.
 *
 * @returns A boolean indicating whether AWS Amplify is configured.
 */
export const configureAmplify = (): boolean => {
  if (configured) return true;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: envUtility.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: envUtility.VITE_COGNITO_APP_CLIENT_ID,
      },
    },
  });
  configured = true;
  return true;
};

export const isAmplifyConfigured = (): boolean => configured;

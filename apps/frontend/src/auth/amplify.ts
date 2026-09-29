import { Amplify } from 'aws-amplify';

/**
 * AWS Amplify is the cloud service used to host the frontend
 * 
 * However, it is also a developer tool for managing authentication and other cloud-related functionalities.
 * 
 * The frontend does not directly give passwords to the backend, and instead it interacts with AWS Amplify for authentication purposes.
 * AWS Amplify gives the frontend a JWT in return, which is what it gives to the backend for authentication.
 */


const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

let configured = false;

/**
 * Configures AWS Amplify with the Cognito user pool ID and app client ID retrieved from environment variables.
 * This function ensures that AWS Amplify is properly set up before any authentication operations are performed.
 * 
 * @returns A boolean indicating whether AWS Amplify was successfully configured.
 */
export const configureAmplify = (): boolean => {
  if (configured) return true;
  if (!userPoolId || !userPoolClientId) {
    console.warn(
      'Cognito sign-in is unavailable. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_APP_CLIENT_ID.',
    );
    return false;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
  configured = true;
  return true;
};

export const isAmplifyConfigured = (): boolean => configured;

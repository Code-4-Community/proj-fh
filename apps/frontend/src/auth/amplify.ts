import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

let configured = false;

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

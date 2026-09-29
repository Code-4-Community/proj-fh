/**
 * Represents the identity of an authenticated user (Cognito ID Token)
 * 
 * sub: Unique Cognito Subject (user identifier)
 * email: The email address of the authenticated user.
 */
export type AuthenticatedIdentity = {
  sub: string;
  email: string;
};

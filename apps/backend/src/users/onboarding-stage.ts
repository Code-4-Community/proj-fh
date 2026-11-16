import { UserStatusType } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Where a staff user is in the invite-to-sign-in process.
 *
 * Deliberately not called "status": `Status` already means a user's role
 * (see ./types.ts).
 *
 * This value is never stored. It is derived from Cognito on every request,
 * so it cannot drift out of sync with Cognito.
 */


export enum OnboardingStage {

  /** Invited by an admin, but has not signed in and set their own password yet. */
  INVITED = 'invited',

  /** Has signed in and set their own password. */
  ACTIVE = 'active',
}


/**
 * Translates a Cognito account status into an onboarding stage.
 *
 * - FORCE_CHANGE_PASSWORD: the account still has the temporary password from the
 *   invitation email, so the user is invited.
 * - CONFIRMED: the user has set their own password, so they are active.
 * - RESET_REQUIRED: an admin forced a password reset on an account that was
 *   already set up, so the user still counts as active.
 * - Anything else, or no Cognito account at all: no stage can be determined, so
 *   this returns null and the frontend shows no badge rather than a wrong one.
 *
 * @param cognitoStatus The account's Cognito status, or undefined if there is no account.
 * @returns The onboarding stage, or null if it cannot be determined.
 */
export function toOnboardingStage(
  cognitoStatus: string | undefined,
): OnboardingStage | null {
  switch (cognitoStatus) {
    case UserStatusType.FORCE_CHANGE_PASSWORD:
      return OnboardingStage.INVITED;
    case UserStatusType.CONFIRMED:
    case UserStatusType.RESET_REQUIRED:
      return OnboardingStage.ACTIVE;
    default:
      return null;
  }
}
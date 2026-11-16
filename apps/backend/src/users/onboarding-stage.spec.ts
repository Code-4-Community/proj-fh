import { UserStatusType } from '@aws-sdk/client-cognito-identity-provider';
import { OnboardingStage, toOnboardingStage } from './onboarding-stage';

/**
 * Unit tests for toOnboardingStage. It is a pure function, so nothing is mocked.
 */
describe('toOnboardingStage', () => {
  it.each([
    [UserStatusType.FORCE_CHANGE_PASSWORD, OnboardingStage.INVITED],
    [UserStatusType.CONFIRMED, OnboardingStage.ACTIVE],
    [UserStatusType.RESET_REQUIRED, OnboardingStage.ACTIVE],
  ])('maps %s to %s', (cognitoStatus, stage) => {
    expect(toOnboardingStage(cognitoStatus)).toBe(stage);
  });

  it.each([
    'UNCONFIRMED',
    'EXTERNAL_PROVIDER',
    'ARCHIVED',
    'COMPROMISED',
    'UNKNOWN',
    'A_STATUS_COGNITO_ADDS_LATER',
  ])('returns null for %s', (cognitoStatus) => {
    expect(toOnboardingStage(cognitoStatus)).toBeNull();
  });

  it('returns null when the user has no Cognito account', () => {
    expect(toOnboardingStage(undefined)).toBeNull();
  });
});
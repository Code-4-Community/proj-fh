import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../types';
import { OnboardingStage } from '../onboarding-stage';

/** The roles listed on the Staff Management page. Patients are not staff. */
export const STAFF_ROLES = [Status.ADMIN, Status.COMMUNITY_STAFF] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * One row of the staff list returned by GET /users.
 * Contains no Cognito identifiers, raw Cognito statuses, or other secrets.
 */
export class StaffMemberResponse {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'dkim@example.org' })
  email!: string;

  @ApiProperty({ example: 'Daniel' })
  firstName!: string;

  @ApiProperty({ example: 'Kim' })
  lastName!: string;

  @ApiProperty({ enum: STAFF_ROLES, example: Status.COMMUNITY_STAFF })
  role!: StaffRole;

  @ApiProperty({
    enum: OnboardingStage,
    nullable: true,
    example: OnboardingStage.INVITED,
    description:
      'invited: has not set their own password yet. active: has. null: no stage could be determined, for example when the user has no Cognito account.',
  })
  onboardingStage!: OnboardingStage | null;
}
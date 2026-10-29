import {
  Category,
  County,
  PublicField,
  Recommendation,
  ResponseTime,
  YesNoMaybe,
} from '../types';
import { TagGroup } from '../../tags/types';

/**
 * A custom "Other" answer typed by the user. The service turns it into a custom Tag in the given group
 * (or reuses an existing one with the same text) and stores that Tag's ID on the Resource.
 */
export interface CustomTagDto {
  /** The group whose seeded "Other" tag the user picked. E.g. TagGroup.POPULATION */
  group: TagGroup;
  /** E.g. 'Letter from landlord' */
  other_text: string;
}

/**
 * The request body for creating a new Resource (the Food or Housing vetting form).
 *
 * Server-managed fields (resource_id, score_id, review_status, submitted_by_user_id,
 * needs_changes_notes, submission_rejection_notes, created_at, updated_at) are intentionally excluded
 * and set by the ResourcesService.
 */
export interface CreateResourceDto {
  /** E.g. 'Greater Boston Food Bank' */
  organization_name: string;
  /** E.g. 'Community Food Pantry' */
  program_name: string;
  /** Exactly one. E.g. Category.FOOD_ACCESS */
  category: Category;
  address?: string;
  /** E.g. County.SUFFOLK */
  county: County;
  /** 5-digit or ZIP+4 format. E.g. '02115', '02115-1234' */
  zip_code: string;
  phone?: string;
  email?: string;
  website?: string;
  /** The contact fields approved for the public website. Any field not listed is non-public. */
  public_fields?: PublicField[];
  eligibility?: string;
  /** ISO 8601 date. E.g. '2026-10-05' */
  last_verified_date: string;
  /** ISO 8601 date. E.g. '2026-10-05' */
  outreach_date: string;
  staff_contact_name: string;
  staff_contact_role: string;
  /** 1 to 5 */
  responsiveness: number;
  response_time: ResponseTime;
  interaction_notes: string;
  accessibility_notes: string;
  program_notes?: string;
  red_flag_concerns: string;
  can_refer_directly: boolean;
  has_referral_contact: boolean;
  referral_contact?: string;
  provides_followup: boolean;
  referral_realistic: YesNoMaybe;
  referral_notes: string;
  recommendation: Recommendation;
  strengths: string;
  followup_needed: string;
  /** Stored on the Score row created with the Resource. 1 to 5 */
  overall_rating: number;
  /** IDs of existing Tags. E.g. [1, 4] */
  tags: number[];
  /** Custom "Other" answers; each becomes a custom Tag whose ID is added to tags. */
  custom_tags?: CustomTagDto[];
}

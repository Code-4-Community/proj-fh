import { CreateResourceDto } from './create-resource.dto';
import { ReviewStatus } from '../types';

/** Fields that are server-managed on creation and can be changed afterwards through an update, e.g. by a reviewer. */
interface UpdateOnlyFields {
  review_status: ReviewStatus;
  /** E.g. 'Please confirm the intake hours.' */
  needs_changes_notes?: string;
  /** E.g. 'Organization is no longer operating.' */
  submission_rejection_notes?: string;
}

type UpdatableFields = CreateResourceDto & UpdateOnlyFields;

/**
 * The request body for updating an existing Resource.
 *
 * Every field is optional: only the fields that are sent are validated and changed,
 * and any field that isn't sent keeps its stored value. Fields may be sent as null; nullable fields
 * (address, phone, email, website, eligibility, program_notes, referral_contact, needs_changes_notes,
 * submission_rejection_notes) are cleared by null, while the rest reject it in ResourcesService.
 * Besides the fields from CreateResourceDto, this includes review_status and the review notes.
 * overall_rating updates the Resource's Score row.
 * resource_id, score_id and submitted_by_user_id can't be changed.
 */
export type UpdateResourceDto = {
  [K in keyof UpdatableFields]?: UpdatableFields[K] | null;
};

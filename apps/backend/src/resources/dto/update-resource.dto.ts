import { CreateResourceDto } from './create-resource.dto';

/** Fields that get default values when a resource is created and can be changed afterwards through an update. */
interface UpdateOnlyFields {
  /** E.g. 'verified', 'pending review' */
  vetting_status: string;
  /** E.g. 'Called and confirmed hours.' */
  reviewer_notes?: string;
  /** ISO 8601 date. E.g. '2026-10-05' */
  last_verified_date: string;
  /** E.g. 1 */
  score_id: number;
  /** Tag IDs. E.g. [1, 4] */
  tags: number[];
}

type UpdatableFields = CreateResourceDto & UpdateOnlyFields;

/**
 * The request body for updating an existing Resource.
 *
 * Every field is optional: only the fields that are sent are validated and changed,
 * and any field that isn't sent keeps its stored value. Fields may be sent as null; nullable fields
 * (description, address, phone, email, website, eligibility, reviewer_notes) are cleared by null,
 * while the rest reject it in ResourcesService.
 * Besides the fields from CreateResourceDto, this includes fields that get defaults on creation
 * (vetting_status, reviewer_notes, last_verified_date, score_id, tags), so they can be updated afterwards, e.g. by a reviewer.
 * resource_id can't be changed.
 */
export type UpdateResourceDto = {
  [K in keyof UpdatableFields]?: UpdatableFields[K] | null;
};

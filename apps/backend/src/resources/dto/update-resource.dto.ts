import { CreateResourceDto } from './create-resource.dto';

/**
 * The request body for updating an existing Resource.
 *
 * Every field from CreateResourceDto is optional: only the fields that are sent are validated and changed,
 * and any field that isn't sent keeps its stored value. Fields may be sent as null; optional fields
 * (description, address, phone, email, website, eligibility) are cleared by null, while required fields
 * (name, category, county, zip_code) reject it in ResourcesService.
 * Server-managed fields (resource_id, score_id, tags, last_verified_date, vetting_status, reviewer_notes)
 * are intentionally excluded and can't be changed through this DTO.
 */
export type UpdateResourceDto = {
  [K in keyof CreateResourceDto]?: CreateResourceDto[K] | null;
};

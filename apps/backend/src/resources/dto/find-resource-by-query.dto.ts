import { UpdateResourceDto } from './update-resource.dto';

/**
 * The request body for finding resources by their field values.
 *
 * Built from UpdateResourceDto, so it covers every field that can be set on a resource
 * (the CreateResourceDto fields plus vetting_status, reviewer_notes, last_verified_date,
 * score_id and tags) and stays in sync when those DTOs change. Every field is optional,
 * and null is not accepted.
 */
export type FindResourceQueryDto = {
  [K in keyof UpdateResourceDto]?: NonNullable<UpdateResourceDto[K]>;
};
import { ReviewStatus } from '../types';
import { UpdateResourceDto } from './update-resource.dto';

/**
 * The request body for finding resources by their field values.
 *
 * Built from UpdateResourceDto, so it covers every field that can be set on a resource
 * and stays in sync when those DTOs change. Every field is optional, and null is not accepted.
 * custom_tags is not a column of resources, so the service rejects it. overall_rating is matched
 * through the Resource's Score. Also includes review_status, which can’t be changed through update 
 * but can be searched.
 */
export type FindResourceQueryDto = {
  [K in keyof UpdateResourceDto]?: NonNullable<UpdateResourceDto[K]>;
} & {
  review_status?: ReviewStatus;
};

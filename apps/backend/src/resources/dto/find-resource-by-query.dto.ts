import { UpdateResourceDto } from './update-resource.dto';

/**
 * The request body for finding resources by their field values.
 *
 * Built from UpdateResourceDto, so it covers every field that can be set on a resource
 * and stays in sync when those DTOs change. Every field is optional, and null is not accepted.
 * overall_rating and custom_tags are not columns of resources, so the service rejects them.
 */
export type FindResourceQueryDto = {
  [K in keyof UpdateResourceDto]?: NonNullable<UpdateResourceDto[K]>;
};

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Resource } from './resources.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ArrayContains,
  DeepPartial,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';
import { isEmail, isISO8601, isURL } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';
import {
  Category,
  County,
  PublicField,
  Recommendation,
  ResponseTime,
  ReviewStatus,
  YesNoMaybe,
} from './types';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { Score } from '../score/score.entity';
import { TagsService } from '../tags/tags.service';

const ZIP_CODE_PATTERN = /^\d{5}(-\d{4})?$/;

/** The fields a client is allowed to change on an existing resource. Only resource id is excluded. */
const EDITABLE_FIELDS: (keyof UpdateResourceDto)[] = [
  'organization_name',
  'program_name',
  'category',
  'county',
  'zip_code',
  'address',
  'phone',
  'email',
  'website',
  'public_fields',
  'eligibility',
  'last_verified_date',
  'outreach_date',
  'staff_contact_name',
  'staff_contact_role',
  'responsiveness',
  'response_time',
  'interaction_notes',
  'accessibility_notes',
  'program_notes',
  'red_flag_concerns',
  'can_refer_directly',
  'has_referral_contact',
  'referral_contact',
  'provides_followup',
  'referral_realistic',
  'referral_notes',
  'recommendation',
  'strengths',
  'followup_needed',
  'review_status',
  'needs_changes_notes',
  'submission_rejection_notes',
  'overall_rating',
  'tags',
  'custom_tags',
];

const SEARCHABLE_FIELDS = EDITABLE_FIELDS.filter(
  (field) => field !== 'overall_rating' && field !== 'custom_tags',
);

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(Resource) private repo: Repository<Resource>,
    private tagsService: TagsService,
  ) {}

  /**
   * Validates the fields of a resource being created or updated. Shared by create and update so both apply the same rules.
   * Length limits match the column sizes in the Resource entity, so an oversized value is rejected here instead of erroring in the database.
   * @param dto The fields provided for the resource.
   * @param partial When false (create), required fields must be present. When true (update), fields that weren't sent
   * are skipped since they keep their stored value, but any field that is sent must still pass its check.
   *
   * @throws BadRequestException with a message naming the first field that fails its check.
   */
  private validateResourceFields(dto: UpdateResourceDto, partial = false) {
    const shouldCheck = (value: unknown) => !partial || value !== undefined;
    if (
      shouldCheck(dto.organization_name) &&
      (!dto.organization_name?.trim() || dto.organization_name.length > 255)
    ) {
      throw new BadRequestException(
        'Organization name is required and must be at most 255 characters.',
      );
    }

    if (
      shouldCheck(dto.category) &&
      !Object.values(Category).includes(dto.category as Category)
    ) {
      throw new BadRequestException(
        `Category must be one of: ${Object.values(Category).join(', ')}.`,
      );
    }

    if (
      shouldCheck(dto.program_name) &&
      (!dto.program_name?.trim() || dto.program_name.length > 255)
    ) {
      throw new BadRequestException(
        'Program name is required and must be at most 255 characters.',
      );
    }

    if (
      shouldCheck(dto.county) &&
      !Object.values(County).includes(dto.county as County)
    ) {
      throw new BadRequestException(
        'County must be a valid Massachusetts county.',
      );
    }

    if (
      shouldCheck(dto.zip_code) &&
      !ZIP_CODE_PATTERN.test(dto.zip_code ?? '')
    ) {
      throw new BadRequestException(
        'Zip code must be a 5-digit or ZIP+4 code.',
      );
    }

    if (dto.address && dto.address.length > 255) {
      throw new BadRequestException('Address must be at most 255 characters.');
    }

    if (dto.phone && dto.phone.length > 20) {
      throw new BadRequestException('Phone must be at most 20 characters.');
    }

    if (dto.email && (dto.email.length > 255 || !isEmail(dto.email))) {
      throw new BadRequestException('Email must be a valid email address.');
    }

    if (dto.website && (dto.website.length > 255 || !isURL(dto.website))) {
      throw new BadRequestException('Website must be a valid URL.');
    }

    if (
      dto.public_fields !== undefined &&
      (!Array.isArray(dto.public_fields) ||
        !dto.public_fields.every((field) =>
          Object.values(PublicField).includes(field as PublicField),
        ))
    ) {
      throw new BadRequestException(
        `Public fields must be a list of: ${Object.values(PublicField).join(', ')}.`,
      );
    }

    if (
      shouldCheck(dto.staff_contact_name) &&
      (!dto.staff_contact_name?.trim() || dto.staff_contact_name.length > 255)
    ) {
      throw new BadRequestException(
        'Staff contact name is required and must be at most 255 characters.',
      );
    }
    if (
      shouldCheck(dto.staff_contact_role) &&
      (!dto.staff_contact_role?.trim() || dto.staff_contact_role.length > 255)
    ) {
      throw new BadRequestException(
        'Staff contact role is required and must be at most 255 characters.',
      );
    }
    if (
      shouldCheck(dto.responsiveness) &&
      (!Number.isInteger(dto.responsiveness) ||
        (dto.responsiveness as number) < 1 ||
        (dto.responsiveness as number) > 5)
    ) {
      throw new BadRequestException(
        'Responsiveness must be an integer from 1 to 5.',
      );
    }
    if (
      shouldCheck(dto.response_time) &&
      !Object.values(ResponseTime).includes(dto.response_time as ResponseTime)
    ) {
      throw new BadRequestException('Response time must be a valid option.');
    }
    if (
      shouldCheck(dto.recommendation) &&
      !Object.values(Recommendation).includes(
        dto.recommendation as Recommendation,
      )
    ) {
      throw new BadRequestException('Recommendation must be a valid option.');
    }
    if (
      shouldCheck(dto.referral_realistic) &&
      !Object.values(YesNoMaybe).includes(dto.referral_realistic as YesNoMaybe)
    ) {
      throw new BadRequestException(
        'Referral realistic must be one of yes, no, or maybe.',
      );
    }
    if (
      shouldCheck(dto.outreach_date) &&
      (typeof dto.outreach_date !== 'string' ||
        !isISO8601(dto.outreach_date, { strict: true }))
    ) {
      throw new BadRequestException(
        'Outreach date must be a valid date, e.g. 2026-10-05.',
      );
    }
    if (
      shouldCheck(dto.last_verified_date) &&
      (typeof dto.last_verified_date !== 'string' ||
        !isISO8601(dto.last_verified_date, { strict: true }))
    ) {
      throw new BadRequestException(
        'Last verified date must be a valid date, e.g. 2026-10-05.',
      );
    }
    if (
      shouldCheck(dto.overall_rating) &&
      (!Number.isInteger(dto.overall_rating) ||
        (dto.overall_rating as number) < 1 ||
        (dto.overall_rating as number) > 5)
    ) {
      throw new BadRequestException(
        'Overall rating must be an integer from 1 to 5.',
      );
    }
    if (
      shouldCheck(dto.interaction_notes) &&
      (typeof dto.interaction_notes !== 'string' ||
        !dto.interaction_notes.trim())
    ) {
      throw new BadRequestException('Interaction notes are required.');
    }
    if (
      shouldCheck(dto.accessibility_notes) &&
      (typeof dto.accessibility_notes !== 'string' ||
        !dto.accessibility_notes.trim())
    ) {
      throw new BadRequestException('Accessibility notes are required.');
    }
    if (
      shouldCheck(dto.red_flag_concerns) &&
      (typeof dto.red_flag_concerns !== 'string' ||
        !dto.red_flag_concerns.trim())
    ) {
      throw new BadRequestException('Red flag concerns are required.');
    }
    if (
      shouldCheck(dto.referral_notes) &&
      (typeof dto.referral_notes !== 'string' || !dto.referral_notes.trim())
    ) {
      throw new BadRequestException('Referral notes are required.');
    }
    if (
      shouldCheck(dto.strengths) &&
      (typeof dto.strengths !== 'string' || !dto.strengths.trim())
    ) {
      throw new BadRequestException('Strengths are required.');
    }
    if (
      shouldCheck(dto.followup_needed) &&
      (typeof dto.followup_needed !== 'string' || !dto.followup_needed.trim())
    ) {
      throw new BadRequestException('Follow-up needed is required.');
    }
    if (
      dto.can_refer_directly !== undefined &&
      typeof dto.can_refer_directly !== 'boolean'
    ) {
      throw new BadRequestException(
        'Can refer directly must be true or false.',
      );
    }
    if (
      dto.has_referral_contact !== undefined &&
      typeof dto.has_referral_contact !== 'boolean'
    ) {
      throw new BadRequestException(
        'Has referral contact must be true or false.',
      );
    }
    if (
      dto.provides_followup !== undefined &&
      typeof dto.provides_followup !== 'boolean'
    ) {
      throw new BadRequestException(
        'Provides follow-up must be true or false.',
      );
    }
    if (
      dto.tags !== undefined &&
      (!Array.isArray(dto.tags) ||
        !dto.tags.every((tag) => Number.isInteger(tag)))
    ) {
      throw new BadRequestException('Tags must be a list of integer tag IDs.');
    }
    if (dto.custom_tags !== undefined && !Array.isArray(dto.custom_tags)) {
      throw new BadRequestException(
        'Custom tags must be a list of { group, other_text }.',
      );
    }
  }

  /**
   * Validates the fields that get default values on creation and can only be changed through an update,
   * e.g. a reviewer setting the vetting status. Fields that aren't sent are skipped.
   * @param dto The fields provided for the update.
   *
   * @throws BadRequestException with a message naming the first field that fails its check.
   */
  private validateUpdateOnlyFields(dto: UpdateResourceDto) {
    if (
      dto.review_status !== undefined &&
      !Object.values(ReviewStatus).includes(dto.review_status as ReviewStatus)
    ) {
      throw new BadRequestException('Review status must be a valid option.');
    }
  }

  /**
   * Creates a new resource after validating its fields.
   *
   * Only the fields in CreateResourceDto are saved; anything else in the request body is ignored.
   * The overall rating is saved with the resource's Score, and tags are resolved in the same transaction.
   *
   * @param createResourceDto The fields provided for the new resource.
   * @param completedBy The name of the logged-in user completing the form.
   *
   * @returns A promise that resolves to the newly created Resource entity, including its generated resource_id.
   *
   * @throws BadRequestException (400) if a field fails validation, e.g. an empty name, an unknown county or a malformed zip code.
   * The message names the invalid field.
   * @throws InternalServerErrorException (500) if the database fails to save the resource, e.g. the database is unreachable.
   * The original database error is logged rather than returned to the client.
   */
  async create(
    createResourceDto: CreateResourceDto,
    completedBy: string,
  ): Promise<Resource> {
    this.validateResourceFields(createResourceDto);

    const { tags, custom_tags, overall_rating, ...resourceFields } =
      createResourceDto;

    try {
      return await this.repo.manager.transaction(async (manager) => {
        const resourceTags = await this.tagsService.resolveForResource(
          manager,
          resourceFields.category,
          tags,
          custom_tags,
        );
        const score = await manager.save(
          manager.create(Score, { overall_rating }),
        );
        const resource = manager.create(Resource, {
          ...resourceFields,
          public_fields: resourceFields.public_fields ?? [],
          last_verified_date: new Date(resourceFields.last_verified_date),
          completed_by: completedBy,
          outreach_date: new Date(resourceFields.outreach_date),
          score_id: score.score_id,
          review_status: ReviewStatus.PENDING_REVIEW,
          tags: resourceTags,
        });
        return manager.save(resource);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to save resource', error);
      throw new InternalServerErrorException(
        'Failed to save the resource to the database. Please try again later.',
      );
    }
  }

  /**
   * Updates an existing resource after validating the fields being changed.
   *
   * This is a partial update: only the fields in UpdateResourceDto that are sent are changed, and every other field keeps its stored value.
   * Nullable fields can be cleared by sending null. score_id and completed_by cannot be changed.
   *
   * @param id The resource_id of the resource to update.
   * @param updateResourceDto The fields to change.
   *
   * @returns A promise that resolves to the full updated Resource entity, including the fields that weren't changed.
   *
   * @throws BadRequestException (400) if the body contains no editable fields, or if a sent field fails validation,
   * e.g. a blank name, an unknown county or a malformed zip code. The message names the invalid field.
   * @throws NotFoundException (404) if no resource exists with the given id.
   * @throws InternalServerErrorException (500) if the database fails while looking up or saving the resource, e.g. the database is unreachable.
   * The original database error is logged rather than returned to the client.
   */
  async update(
    id: number,
    updateResourceDto: UpdateResourceDto,
  ): Promise<Resource> {
    this.validateResourceFields(updateResourceDto, true);
    this.validateUpdateOnlyFields(updateResourceDto);

    // Keep only editable fields that were actually sent, so unsent fields aren't overwritten with undefined.
    const changes = Object.fromEntries(
      EDITABLE_FIELDS.filter(
        (field) => updateResourceDto[field] !== undefined,
      ).map((field) => [field, updateResourceDto[field]]),
    ) as Record<string, unknown>;

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException(
        `At least one of the following fields must be provided: ${EDITABLE_FIELDS.join(', ')}.`,
      );
    }

    try {
      return await this.repo.manager.transaction(async (manager) => {
        const resource = await manager.findOneBy(Resource, {
          resource_id: id,
        });
        if (!resource) {
          throw new NotFoundException(`Resource with id ${id} was not found.`);
        }

        const { overall_rating, custom_tags, ...columnChanges } = changes;
        if (columnChanges.last_verified_date) {
          columnChanges.last_verified_date = new Date(
            columnChanges.last_verified_date as string,
          );
        }
        if (columnChanges.outreach_date) {
          columnChanges.outreach_date = new Date(
            columnChanges.outreach_date as string,
          );
        }
        if (
          columnChanges.tags !== undefined ||
          custom_tags !== undefined ||
          columnChanges.category !== undefined
        ) {
          columnChanges.tags = await this.tagsService.resolveForResource(
            manager,
            (columnChanges.category as Category | undefined) ??
              resource.category,
            (columnChanges.tags as number[] | undefined) ?? resource.tags,
            custom_tags as CreateResourceDto['custom_tags'],
          );
        }

        if (overall_rating !== undefined) {
          await manager.update(
            Score,
            { score_id: resource.score_id },
            { overall_rating: overall_rating as number },
          );
        }

        return manager.save(Resource, {
          ...resource,
          ...columnChanges,
        } as DeepPartial<Resource>);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update resource ${id}`, error);
      throw new InternalServerErrorException(`Failed to update resource ${id}`);
    }
  }

  /**
   * Retrieves resources by their IDs.
   *
   * @param ids the IDs of the resources to retrieve (pass a single-item array for one resource)
   * @returns the resources matching the given IDs
   * @throws NotFoundException if none of the IDs match a resource
   * @throws InternalServerErrorException if the database query fails
   */
  async findByIds(ids: number[]): Promise<Resource[]> {
    let resources: Resource[];

    try {
      resources = await this.repo.find({ where: { resource_id: In(ids) } });
    } catch (error) {
      this.logger.error('Failed to retrieve resources', error);
      throw new InternalServerErrorException(
        'Failed to retrieve resources from the database. Please try again later.',
      );
    }

    if (resources.length === 0)
      throw new NotFoundException(
        `No resources found with IDs [${ids.join(', ')}]`,
      );

    return resources;
  }

  /**
   * Retrieves resources whose fields match the fields given.
   *
   * A resource is only returned if it matches every field provided, and if multiple resources match, all of them are returned.
   * Single-value fields must match exactly. Array fields (public_fields, tags) match resources that contain every value given, in any order.
   * Sent fields are validated with the same rules as create and update, so a value that could never be stored is rejected instead of searched for.
   *
   * @param query The resource fields to match. Any searchable field can be used.
   *
   * @returns A promise that resolves to every Resource matching all of the given fields.
   *
   * @throws BadRequestException (400) if the body isn't an object, a field isn't searchable or is null, or a field fails validation,
   * e.g. an unknown county or a malformed zip code. The message names the invalid field.
   * @throws NotFoundException (404) if no resources match the given fields.
   * @throws InternalServerErrorException (500) if the database query fails.
   * The original database error is logged rather than returned to the client.
   */
  async find(query: FindResourceQueryDto): Promise<Resource[]> {
    if (typeof query !== 'object' || query === null || Array.isArray(query)) {
      throw new BadRequestException(
        'The request body must be an object of resource fields.',
      );
    }

    const fields = Object.keys(query) as (keyof FindResourceQueryDto)[];

    const unknownFields = fields.filter(
      (field) =>
        !SEARCHABLE_FIELDS.includes(
          field as (typeof SEARCHABLE_FIELDS)[number],
        ),
    );
    if (unknownFields.length > 0) {
      throw new BadRequestException(
        `Unknown field(s): ${unknownFields.join(', ')}. Searchable fields are: ${SEARCHABLE_FIELDS.join(', ')}.`,
      );
    }

    const nullFields = fields.filter((field) => query[field] === null);
    if (nullFields.length > 0) {
      throw new BadRequestException(
        `Fields can't be null when searching: ${nullFields.join(', ')}.`,
      );
    }

    this.validateResourceFields(query, true);
    this.validateUpdateOnlyFields(query);

    // Array fields match resources that contain every given value; everything else must match exactly.
    const where = Object.fromEntries(
      fields
        .filter((field) => query[field] !== undefined)
        .map((field) => {
          const value = query[field];
          return [
            field,
            Array.isArray(value) ? ArrayContains(value as unknown[]) : value,
          ];
        }),
    ) as FindOptionsWhere<Resource>;

    let resources: Resource[];
    try {
      resources = await this.repo.find({ where });
    } catch (error) {
      this.logger.error('Failed to retrieve resources', error);
      throw new InternalServerErrorException(
        'Failed to retrieve resources from the database. Please try again later.',
      );
    }

    // Thrown outside the try block so the catch doesn't turn a 404 into a 500.
    if (resources.length === 0) {
      throw new NotFoundException(
        'No resources found matching the given fields.',
      );
    }

    return resources;
  }
}

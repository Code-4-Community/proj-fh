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

type FieldRule = {
  /** Whether the field must be sent when a resource is created. */
  required: boolean;
  isValid: (value: unknown) => boolean;
  message: string;
};

const requiredText = (max?: number) => (value: unknown) =>
  typeof value === 'string' &&
  value.trim() !== '' &&
  (max === undefined || value.length <= max);

const optionalText = (max?: number) => (value: unknown) =>
  typeof value === 'string' && (max === undefined || value.length <= max);

const oneOf = (values: string[]) => (value: unknown) =>
  typeof value === 'string' && values.includes(value);

const isDate = (value: unknown) =>
  typeof value === 'string' && isISO8601(value, { strict: true });

const isRating = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;

const isBoolean = (value: unknown) => typeof value === 'boolean';

const isIntList = (value: unknown) =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item));

/**
 * Validation rules for every field a client can send about a resource. Length limits match the column sizes
 * in the Resource entity, so an oversized value is rejected here instead of erroring in the database.
 */
const FIELD_RULES: Record<string, FieldRule> = {
  organization_name: {
    required: true,
    isValid: requiredText(255),
    message:
      'Organization name is required and must be at most 255 characters.',
  },
  program_name: {
    required: true,
    isValid: requiredText(255),
    message: 'Program name is required and must be at most 255 characters.',
  },
  category: {
    required: true,
    isValid: oneOf(Object.values(Category)),
    message: `Category must be exactly one of: ${Object.values(Category).join(', ')}.`,
  },
  address: {
    required: false,
    isValid: optionalText(255),
    message: 'Address must be at most 255 characters.',
  },
  county: {
    required: true,
    isValid: oneOf(Object.values(County)),
    message: 'County must be a valid Massachusetts county.',
  },
  zip_code: {
    required: true,
    isValid: (value) =>
      typeof value === 'string' && ZIP_CODE_PATTERN.test(value),
    message: 'Zip code must be a 5-digit or ZIP+4 code.',
  },
  phone: {
    required: false,
    isValid: optionalText(20),
    message: 'Phone must be at most 20 characters.',
  },
  email: {
    required: false,
    isValid: (value) =>
      typeof value === 'string' && value.length <= 255 && isEmail(value),
    message: 'Email must be a valid email address.',
  },
  website: {
    required: false,
    isValid: (value) =>
      typeof value === 'string' && value.length <= 255 && isURL(value),
    message: 'Website must be a valid URL.',
  },
  public_fields: {
    required: false,
    isValid: (value) =>
      Array.isArray(value) &&
      value.every((field) => Object.values(PublicField).includes(field)),
    message: `Public fields must be a list of: ${Object.values(PublicField).join(', ')}.`,
  },
  eligibility: {
    required: false,
    isValid: optionalText(),
    message: 'Eligibility must be a string.',
  },
  review_status: {
    required: false,
    isValid: oneOf(Object.values(ReviewStatus)),
    message: `Review status must be one of: ${Object.values(ReviewStatus).join(', ')}.`,
  },
  last_verified_date: {
    required: true,
    isValid: isDate,
    message: 'Last verified date must be a valid date, e.g. 2026-10-05.',
  },
  outreach_date: {
    required: true,
    isValid: isDate,
    message: 'Outreach date must be a valid date, e.g. 2026-10-05.',
  },
  staff_contact_name: {
    required: true,
    isValid: requiredText(255),
    message:
      'Staff contact name is required and must be at most 255 characters.',
  },
  staff_contact_role: {
    required: true,
    isValid: requiredText(255),
    message:
      'Staff contact role is required and must be at most 255 characters.',
  },
  responsiveness: {
    required: true,
    isValid: isRating,
    message: 'Responsiveness must be an integer from 1 to 5.',
  },
  response_time: {
    required: true,
    isValid: oneOf(Object.values(ResponseTime)),
    message: `Response time must be one of: ${Object.values(ResponseTime).join(', ')}.`,
  },
  interaction_notes: {
    required: true,
    isValid: requiredText(),
    message: 'Interaction notes are required.',
  },
  accessibility_notes: {
    required: true,
    isValid: requiredText(),
    message: 'Accessibility notes are required.',
  },
  program_notes: {
    required: false,
    isValid: optionalText(),
    message: 'Program notes must be a string.',
  },
  red_flag_concerns: {
    required: true,
    isValid: requiredText(),
    message: 'Red flag concerns are required.',
  },
  can_refer_directly: {
    required: true,
    isValid: isBoolean,
    message: 'Can refer directly must be true or false.',
  },
  has_referral_contact: {
    required: true,
    isValid: isBoolean,
    message: 'Has referral contact must be true or false.',
  },
  referral_contact: {
    required: false,
    isValid: optionalText(255),
    message: 'Referral contact must be at most 255 characters.',
  },
  provides_followup: {
    required: true,
    isValid: isBoolean,
    message: 'Provides follow-up must be true or false.',
  },
  referral_realistic: {
    required: true,
    isValid: oneOf(Object.values(YesNoMaybe)),
    message: `Referral realistic must be one of: ${Object.values(YesNoMaybe).join(', ')}.`,
  },
  referral_notes: {
    required: true,
    isValid: requiredText(),
    message: 'Referral notes are required.',
  },
  recommendation: {
    required: true,
    isValid: oneOf(Object.values(Recommendation)),
    message: `Recommendation must be one of: ${Object.values(Recommendation).join(', ')}.`,
  },
  strengths: {
    required: true,
    isValid: requiredText(),
    message: 'Strengths are required.',
  },
  followup_needed: {
    required: true,
    isValid: requiredText(),
    message: 'Follow-up needed is required.',
  },
  needs_changes_notes: {
    required: false,
    isValid: optionalText(),
    message: 'Needs changes notes must be a string.',
  },
  submission_rejection_notes: {
    required: false,
    isValid: optionalText(),
    message: 'Submission rejection notes must be a string.',
  },
  overall_rating: {
    required: true,
    isValid: isRating,
    message: 'Overall rating must be an integer from 1 to 5.',
  },
  tags: {
    required: true,
    isValid: isIntList,
    message: 'Tags must be a list of integer tag IDs.',
  },
};

/** Fields that can be null. Every other field rejects null. */
const NULLABLE_FIELDS = new Set([
  'address',
  'phone',
  'email',
  'website',
  'eligibility',
  'program_notes',
  'referral_contact',
  'needs_changes_notes',
  'submission_rejection_notes',
]);

/** Fields of a resource that live in other places: the Score row and the tags created from custom answers. */
const NON_COLUMN_FIELDS = ['overall_rating', 'custom_tags'] as const;

/** The fields a client is allowed to change on an existing resource. */
const EDITABLE_FIELDS = [
  ...Object.keys(FIELD_RULES),
  'custom_tags',
] as (keyof UpdateResourceDto)[];

/** The fields a client can search resources by: the columns a client can change. */
const SEARCHABLE_FIELDS = EDITABLE_FIELDS.filter(
  (field) => !(NON_COLUMN_FIELDS as readonly string[]).includes(field),
);

/** The columns copied from the request body onto a new resource. Server-managed columns are left out. */
const CREATE_FIELDS = SEARCHABLE_FIELDS.filter(
  (field) =>
    ![
      'review_status',
      'needs_changes_notes',
      'submission_rejection_notes',
      'tags',
    ].includes(field),
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
   * Validates the fields of a resource being created, updated or searched for. Shared so every method applies the same rules.
   * @param dto The fields provided for the resource.
   * @param partial When false (create), required fields must be present. When true (update and find), fields that weren't sent
   * are skipped since they keep their stored value, but any field that is sent must still pass its check.
   *
   * @throws BadRequestException with a message naming the first field that fails its check.
   */
  private validateFields(dto: UpdateResourceDto, partial = false) {
    const values = dto as Record<string, unknown>;

    for (const [field, rule] of Object.entries(FIELD_RULES)) {
      const value = values[field];

      if (value === undefined) {
        if (!partial && rule.required) {
          throw new BadRequestException(rule.message);
        }
        continue;
      }

      if (value === null && NULLABLE_FIELDS.has(field)) {
        continue;
      }

      if (!rule.isValid(value)) {
        throw new BadRequestException(rule.message);
      }
    }

    if (
      values.custom_tags !== undefined &&
      !Array.isArray(values.custom_tags)
    ) {
      throw new BadRequestException(
        'Custom tags must be a list of { group, other_text }.',
      );
    }
  }

  /**
   * Creates a new resource, and the Score row that holds its overall rating, in one transaction.
   *
   * Only the fields in CreateResourceDto are saved; anything else in the request body is ignored.
   * Server-managed fields are set here: review_status starts as pending review and submitted_by_user_id is the given user.
   * custom_tags are turned into custom tags whose IDs are added to the resource's tags.
   * If anything fails, nothing is saved.
   *
   * @param createResourceDto The fields provided for the new resource. Optional fields may be omitted.
   * @param submittedByUserId The id of the logged-in user submitting the resource, or null if there is none.
   *
   * @returns A promise that resolves to the newly created Resource entity, including its generated resource_id and score_id.
   *
   * @throws BadRequestException (400) if a field fails validation, e.g. an empty name, an unknown county or a tag that
   * doesn't apply to the resource's category. The message names the problem.
   * @throws InternalServerErrorException (500) if the database fails to save the resource, e.g. the database is unreachable.
   * The original database error is logged rather than returned to the client.
   */
  async create(
    createResourceDto: CreateResourceDto,
    submittedByUserId: number | null = null,
  ): Promise<Resource> {
    this.validateFields(createResourceDto);

    const values = createResourceDto as unknown as Record<string, unknown>;
    const columns = Object.fromEntries(
      CREATE_FIELDS.filter((field) => values[field] !== undefined).map(
        (field) => [field, values[field]],
      ),
    );

    try {
      return await this.repo.manager.transaction(async (manager) => {
        const tags = await this.tagsService.resolveForResource(
          manager,
          createResourceDto.category,
          createResourceDto.tags,
          createResourceDto.custom_tags,
        );

        const score = await manager.save(
          manager.create(Score, {
            overall_rating: createResourceDto.overall_rating,
          }),
        );

        return manager.save(
          manager.create(Resource, {
            ...columns,
            score_id: score.score_id,
            review_status: ReviewStatus.PENDING_REVIEW,
            submitted_by_user_id: submittedByUserId,
            tags,
          } as unknown as DeepPartial<Resource>),
        );
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
   * Nullable fields (address, phone, email, website, eligibility, program_notes, referral_contact, needs_changes_notes,
   * submission_rejection_notes) can be cleared by sending null.
   * review_status and the review notes can be changed here, e.g. by a reviewer. overall_rating updates the resource's Score row.
   * Sending tags, custom_tags or a new category re-checks the resource's tags against its category.
   * resource_id, score_id and submitted_by_user_id can't be changed, and unknown fields are ignored.
   *
   * @param id The resource_id of the resource to update.
   * @param updateResourceDto The fields to change.
   *
   * @returns A promise that resolves to the full updated Resource entity, including the fields that weren't changed.
   *
   * @throws BadRequestException (400) if the body contains no editable fields, or if a sent field fails validation,
   * e.g. a blank name, an unknown county or a tag that doesn't apply to the category. The message names the problem.
   * @throws NotFoundException (404) if no resource exists with the given id.
   * @throws InternalServerErrorException (500) if the database fails while looking up or saving the resource, e.g. the database is unreachable.
   * The original database error is logged rather than returned to the client.
   */
  async update(
    id: number,
    updateResourceDto: UpdateResourceDto,
  ): Promise<Resource> {
    this.validateFields(updateResourceDto, true);

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

        if (
          columnChanges.tags !== undefined ||
          custom_tags !== undefined ||
          columnChanges.category !== undefined
        ) {
          columnChanges.tags = await this.tagsService.resolveForResource(
            manager,
            (columnChanges.category as Category) ?? resource.category,
            (columnChanges.tags as number[]) ?? resource.tags,
            custom_tags as UpdateResourceDto['custom_tags'] as never,
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
        } as unknown as Resource);
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
   * @param query The resource fields to match. Any column a client can change can be used (not overall_rating or custom_tags).
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
      (field) => !SEARCHABLE_FIELDS.includes(field),
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

    this.validateFields(query, true);

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

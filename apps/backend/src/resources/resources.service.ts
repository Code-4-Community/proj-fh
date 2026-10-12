import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Resource } from './resources.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, FindOptionsWhere, In, Repository } from 'typeorm';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';
import { isEmail, isISO8601, isURL } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Category, County } from './types';
import { UpdateResourceDto } from './dto/update-resource.dto';

const ZIP_CODE_PATTERN = /^\d{5}(-\d{4})?$/;

/** The fields a client is allowed to change on an existing resource. Only resource id is excluded. */
const EDITABLE_FIELDS: (keyof UpdateResourceDto)[] = [
  'name',
  'category',
  'county',
  'zip_code',
  'description',
  'address',
  'phone',
  'email',
  'website',
  'eligibility',
  'vetting_status',
  'reviewer_notes',
  'last_verified_date',
  'score_id',
  'tags',
];

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(@InjectRepository(Resource) private repo: Repository<Resource>) {}

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
    if (shouldCheck(dto.name) && (!dto.name?.trim() || dto.name.length > 255)) {
      throw new BadRequestException(
        'Name is required and must be at most 255 characters.',
      );
    }

    const categories = Object.values(Category);
    if (
      shouldCheck(dto.category) &&
      (!Array.isArray(dto.category) ||
        dto.category.length === 0 ||
        !dto.category.every((category) => categories.includes(category)))
    ) {
      throw new BadRequestException(
        `Category must be a non-empty list of: ${categories.join(', ')}.`,
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
      dto.vetting_status !== undefined &&
      (typeof dto.vetting_status !== 'string' ||
        !dto.vetting_status.trim() ||
        dto.vetting_status.length > 255)
    ) {
      throw new BadRequestException(
        'Vetting status must be a non-empty string of at most 255 characters.',
      );
    }

    if (
      dto.reviewer_notes !== undefined &&
      dto.reviewer_notes !== null &&
      typeof dto.reviewer_notes !== 'string'
    ) {
      throw new BadRequestException('Reviewer notes must be a string.');
    }

    if (
      dto.last_verified_date !== undefined &&
      (typeof dto.last_verified_date !== 'string' ||
        !isISO8601(dto.last_verified_date, { strict: true }))
    ) {
      throw new BadRequestException(
        'Last verified date must be a valid date, e.g. 2026-10-05.',
      );
    }

    if (
      dto.score_id !== undefined &&
      (!Number.isInteger(dto.score_id) || (dto.score_id as number) < 0)
    ) {
      throw new BadRequestException('Score ID must be a non-negative integer.');
    }

    if (
      dto.tags !== undefined &&
      (!Array.isArray(dto.tags) ||
        !dto.tags.every((tag) => Number.isInteger(tag)))
    ) {
      throw new BadRequestException('Tags must be a list of integer tag IDs.');
    }
  }

  /**
   * Creates a new resource after validating its fields.
   *
   * Only the fields in CreateResourceDto are saved; anything else in the request body is ignored.
   * Some required fields are initialized as so: score starts at 0, the vetting status starts as 'pending review',
   * and the last verified date is set to the time of creation.
   *
   * @param createResourceDto The fields provided for the new resource. Optional fields may be omitted.
   *
   * @returns A promise that resolves to the newly created Resource entity, including its generated resource_id.
   *
   * @throws BadRequestException (400) if a field fails validation, e.g. an empty name, an unknown county or a malformed zip code.
   * The message names the invalid field.
   * @throws InternalServerErrorException (500) if the database fails to save the resource, e.g. the database is unreachable.
   * The original database error is logged rather than returned to the client.
   */
  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    this.validateResourceFields(createResourceDto);

    const {
      name,
      category,
      county,
      zip_code,
      description,
      address,
      phone,
      email,
      website,
      eligibility,
    } = createResourceDto;

    const resource = this.repo.create({
      name,
      category,
      county,
      zip_code,
      description,
      address,
      phone,
      email,
      website,
      eligibility,
      score_id: 0,
      vetting_status: 'pending review',
      last_verified_date: new Date(),
    });

    try {
      return await this.repo.save(resource);
    } catch (error) {
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
   * Nullable fields (description, address, phone, email, website, eligibility, reviewer_notes) can be cleared by sending null.
   * Fields that get defaults on creation (vetting_status, reviewer_notes, last_verified_date, score_id, tags) can be changed here,
   * e.g. by a reviewer. resource_id can't be changed, and unknown fields are ignored.
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
    ) as UpdateResourceDto;

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException(
        `At least one of the following fields must be provided: ${EDITABLE_FIELDS.join(', ')}.`,
      );
    }

    let resource: Resource | null;
    try {
      resource = await this.repo.findOneBy({ resource_id: id });
    } catch (error) {
      this.logger.error(`Failed to look up resource ${id}`, error);
      throw new InternalServerErrorException(
        `Failed to look up resource ${id}`,
      );
    }

    // Thrown outside the try block so the catch doesn't turn a 404 into a 500.
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} was not found.`);
    }

    try {
      return await this.repo.save({
        ...resource,
        ...changes,
      } as unknown as Resource);
    } catch (error) {
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
   * Single-value fields must match exactly. Array fields (category, tags) match resources that contain every value given, in any order.
   * Sent fields are validated with the same rules as create and update, so a value that could never be stored is rejected instead of searched for.
   *
   * @param query The resource fields to match. Any field in EDITABLE_FIELDS can be used.
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
      (field) => !EDITABLE_FIELDS.includes(field),
    );
    if (unknownFields.length > 0) {
      throw new BadRequestException(
        `Unknown field(s): ${unknownFields.join(', ')}. Searchable fields are: ${EDITABLE_FIELDS.join(', ')}.`,
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
          return [field, Array.isArray(value) ? ArrayContains(value as unknown[]) : value];
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

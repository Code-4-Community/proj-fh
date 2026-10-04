import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { Repository } from 'typeorm';
import { isEmail, isURL } from 'class-validator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Category, County } from './types';

const ZIP_CODE_PATTERN = /^\d{5}(-\d{4})?$/;

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(@InjectRepository(Resource) private repo: Repository<Resource>) {}

  /**
   * Validates the fields of a resource being created.
   * Length limits match the column sizes in the Resource entity, so an oversized value is rejected here instead of erroring in the database.
   * @param dto The fields provided for the new resource.
   *
   * @throws BadRequestException with a message naming the first field that fails its check.
   */
  private validateCreateResource(dto: CreateResourceDto) {
    if (!dto.name?.trim() || dto.name.length > 255) {
      throw new BadRequestException(
        'Name is required and must be at most 255 characters.',
      );
    }

    const categories = Object.values(Category);
    if (
      !Array.isArray(dto.category) ||
      dto.category.length === 0 ||
      !dto.category.every((category) => categories.includes(category))
    ) {
      throw new BadRequestException(
        `Category must be a non-empty list of: ${categories.join(', ')}.`,
      );
    }

    if (!Object.values(County).includes(dto.county)) {
      throw new BadRequestException(
        'County must be a valid Massachusetts county.',
      );
    }

    if (!ZIP_CODE_PATTERN.test(dto.zip_code ?? '')) {
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
    this.validateCreateResource(createResourceDto);

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
}

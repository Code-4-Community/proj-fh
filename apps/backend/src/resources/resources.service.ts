import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Resource } from './resources.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayOverlap, FindOptionsWhere, In, Repository } from 'typeorm';
import { FindResourceQueryDTO } from './dto/find-resource-by-query.dto';
import { Category } from './types';

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(@InjectRepository(Resource) private repo: Repository<Resource>) {}

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
        `Failed to retrieve resources with IDs [${ids.join(', ')}]: ${(error as Error).message}.`,
      );
    }

    if (resources.length === 0)
      throw new NotFoundException(
        `No resources found with IDs [${ids.join(', ')}]`,
      );

    return resources;
  }

  /**
   * Retrieves resources matching the given filters.
   * Only filters that are provided are applied, and a resource must match all of them.
   *
   * @param query the filters to apply (category, county, zip code)
   * @returns the resources matching the filters
   * @throws BadRequestException if a category is not a valid Category value
   * @throws NotFoundException if no resources match the filters
   * @throws InternalServerErrorException if the database query fails
   */
  async find(query: FindResourceQueryDTO): Promise<Resource[]> {
    const validCategories = Object.values(Category);
    const invalid =
      query.category?.filter((c) => !validCategories.includes(c)) ?? [];
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown category: [${invalid.join(', ')}]`,
      );
    }

    const where: FindOptionsWhere<Resource> = {};
    if (query.category?.length) where.category = ArrayOverlap(query.category);
    if (query.county) where.county = query.county;
    if (query.zip_code) where.zip_code = query.zip_code;

    let resources: Resource[];
    try {
      resources = await this.repo.find({ where });
    } catch (error) {
      this.logger.error('Failed to retrieve resources', error);
      throw new InternalServerErrorException(
        `Failed to retrieve resources: ${(error as Error).message}.`,
      );
    }

    if (resources.length === 0)
      throw new NotFoundException(
        `No resources found matching the given filters`,
      );

    return resources;
  }
}

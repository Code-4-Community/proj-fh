import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Resource } from './resources.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    constructor(@InjectRepository(Resource) private repo: Repository<Resource>,) {}


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
        resources = await this.repo.find({ where: { resource_id: In(ids) } })
      } catch (error) {
        this.logger.error('Failed to save resource', error);
          throw new InternalServerErrorException(
            `Failed to retrieve resource with IDs [${ids.join(', ')}]: ${(error as Error).message}.`,
          );
      }

      if (resources.length == 0)
        throw new NotFoundException(
          `No resources found with IDs [${ids.join(', ')}]`,
        );

      return resources;

    }


    

}

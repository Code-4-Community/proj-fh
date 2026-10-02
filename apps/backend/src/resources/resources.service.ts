import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { Repository } from 'typeorm';
import { CreateResourceDto } from './dto/create-resource.dto';

/**
 * The ResourcesService is a NestJS service that provides business logic for managing resources in the system.
 * It interacts with the database through the injected repository of the Resource entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class ResourcesService {
  constructor(@InjectRepository(Resource) private repo: Repository<Resource>) {}

  /**
   * Creates a new resource from the validated request body.
   * Server-managed fields are initialized here: the score starts at 0, the vetting status starts as 'pending review',
   * and the last verified date is set to the time of creation.
   * @param createResourceDto The validated fields provided by the client.
   *
   * @returns A promise that resolves to the newly created Resource entity.
   */
  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    const resource = this.repo.create({
      ...createResourceDto,
      score_id: 0,
      vetting_status: 'pending review',
      last_verified_date: new Date(),
    });

    return this.repo.save(resource);
  }
}

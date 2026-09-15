import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Tag } from './tag.entity';

/**
 * The TagsService is a NestJS service that provides business logic for managing tags in the system. 
 * It interacts with the database through the injected repository of the Tag entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private repo: Repository<Tag>) {}
}
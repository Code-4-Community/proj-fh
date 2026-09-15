import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Tag } from './tag.entity';
import { Category } from './types';

/**
 * The TagsService is a NestJS service that provides business logic for managing tags in the system.
 * It interacts with the database through the injected repository of the Tag entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private repo: Repository<Tag>) {}

  /**
   * Validates the input for creating a new tag.
   * @param category The category of the tag.
   * @param label The label of the tag.
   * @param slug The slug of the tag.
   */
  private validateCreateTagDto(
    category: Category,
    label: string,
    slug: string,
  ) {
    if (!category || !label || !slug) {
      throw new BadRequestException(
        'Category, label, and slug are required to create a tag.',
      );
    }

    if (label.trim() === '') {
      throw new BadRequestException('Label cannot be empty.');
    }

    if (slug.trim() === '') {
      throw new BadRequestException('Slug cannot be empty.');
    }

    if (slug.includes(' ')) {
      throw new BadRequestException('Slug cannot contain spaces.');
    }
  }

  /**
   * Creates a new tag in the system with the specified category, label, and slug.
   * @param category The category of the tag, which is an enumerated value defined in the Category enum.
   * @param label The label of the tag, which is a string representing the name or title of the tag.
   * @param slug The slug of the tag, which is a string used for URL-friendly representation of the tag.
   *
   * @returns A promise that resolves to the newly created Tag entity.
   */
  async create(category: Category, label: string, slug: string) {
    const tagId = (await this.repo.count()) + 1;
    const tag = this.repo.create({
      tag_id: tagId,
      category,
      label,
      slug,
    });

    this.validateCreateTagDto(category, label, slug);

    return this.repo.save(tag);
  }
}

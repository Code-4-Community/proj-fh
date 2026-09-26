import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Category } from './types';

/**
 * Controller for managing tags. Provides endpoints for retrieving and managing tags in the system.
 */
@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  /**
   * Retrieves a single tag by its ID.
   */
  @Get('/:tagId')
  async getTagById(
    @Param('tagId', ParseIntPipe) tagId: number,
  ): Promise<Tag> {
    return this.tagsService.getTagById(tagId);
  }

  /**
   * Retrieves tags by a list of ids
   */
  @Post('/findById')
  async getTagsByIds(
    @Body('ids') ids: number[],
  ): Promise<Tag[]> {
    return this.tagsService.getTagsByIds(ids);
  }

  /**
   * Retrieves tags by their category
   */
  @Get('/category/:category')
  async getTagsByCategory(
    @Param('category') category: Category,
  ) : Promise<Tag[]> {
    return this.tagsService.getTagsByCategory(category);
  }
}

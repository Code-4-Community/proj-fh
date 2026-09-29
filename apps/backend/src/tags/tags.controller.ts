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
   * @param tagId the unique ID of a tag to get
   * 
   * @returns The tag matching the provided ID
   */
  @Get('/:tagId')
  async getTagById(
    @Param('tagId', ParseIntPipe) tagId: number,
  ): Promise<Tag> {
    return this.tagsService.getTagById(tagId);
  }

  /**
   * Retrieves tags by a list of ids
   * @param ids an array of tag IDs to retreive
   * 
   * @returns an array of tags matching the provided IDs
   */
  @Post('/findById')
  async getTagsByIds(
    @Body('ids') ids: number[],
  ): Promise<Tag[]> {
    return this.tagsService.getTagsByIds(ids);
  }

  /**
   * Retrieves tags by their category
   * @param category the category used to get tags
   * 
   * @returns an array of tags matching the provided category
   */
  @Get('/category/:category')
  async getTagsByCategory(
    @Param('category') category: Category,
  ) : Promise<Tag[]> {
    return this.tagsService.getTagsByCategory(category);
  }
}

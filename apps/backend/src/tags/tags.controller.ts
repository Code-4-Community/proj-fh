import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagCategory, TagGroup } from './types';

/**
 * Controller for managing tags. Provides endpoints for retrieving and managing tags in the system.
 */
@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  /**
   * Retrieves tags by their IDs.
   *
   * @param ids the IDs of the tags to retrieve (a single-item array for one tag)
   * @returns 200 with the tags matching the given IDs.
   * Returns 400 if the body is not an array of positive integers,
   * or 404 if none of the IDs match a tag.
   */
  @Post('findByIds')
  @HttpCode(HttpStatus.OK)
  async findByIds(
    @Body(new ParseArrayPipe({ items: Number })) ids: number[],
  ): Promise<Tag[]> {
    return await this.tagsService.findByIds(ids);
  }

  /**
   * Retrieves a single tag by its ID.
   * @param tagId the unique ID of a tag to get
   * @returns The tag matching the provided ID
   */
  @Get('/:tagId')
  async getTagById(@Param('tagId', ParseIntPipe) tagId: number): Promise<Tag> {
    return this.tagsService.getTagById(tagId);
  }

  /**
   * Retrieves tags by their category
   * @param category the category used to get tags
   * @param isCustom optional `is_custom` query parameter; `false` returns only seeded tags, `true` only custom ones.
   * When omitted, every tag in the category is returned.
   * @returns an array of tags matching the provided category
   */
  @Get('/category/:category')
  async getTagsByCategory(
    @Param('category') category: TagCategory,
    @Query('is_custom', new ParseBoolPipe({ optional: true }))
    isCustom?: boolean,
  ): Promise<Tag[]> {
    return this.tagsService.getTagsByCategory(category, isCustom);
  }

  /**
   * Retrieves tags by their group
   * @param group the group (form question) used to get tags
   * @param isCustom optional `is_custom` query parameter; `false` returns only seeded tags, `true` only custom ones.
   * When omitted, every tag in the group is returned.
   * @returns an array of tags in the provided group
   */
  @Get('/group/:group')
  async getTagsByGroup(
    @Param('group') group: TagGroup,
    @Query('is_custom', new ParseBoolPipe({ optional: true }))
    isCustom?: boolean,
  ): Promise<Tag[]> {
    return this.tagsService.getTagsByGroup(group, isCustom);
  }
}

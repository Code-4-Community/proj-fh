import { Controller, Get, Param, ParseEnumPipe, ParseIntPipe } from '@nestjs/common';
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

  @Get('/:tagId')
  async getTagById(
    @Param('tagId', ParseIntPipe) tagId: number,
  ): Promise<Tag> {
    return this.tagsService.getTagById(tagId);
  }

  @Get('/category/:category')
  async getTagByCategory(
    @Param('category') category: Category,
  ) : Promise<Tag[]> {
    return this.tagsService.getTagsByCategory(category);
  }
}

import { Controller } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

/**
 * Controller for managing tags. Provides endpoints for retrieving and managing tags in the system.
 */
@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}
}

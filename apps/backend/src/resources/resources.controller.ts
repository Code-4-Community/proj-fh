import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Resource } from './resources.entity';

/**
 * Controller for managing resources. Provides endpoints for retrieving and managing resources in the system.
 */
@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  /**
   * Creates a new resource.
   * @param createResourceDto The validated request body describing the resource.
   *
   * @returns The newly created Resource entity.
   */
  @Post('/:create')
  create(@Body() createResourceDto: CreateResourceDto): Promise<Resource> {
    return this.resourcesService.create(createResourceDto);
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
  * @returns 201 with the newly created Resource entity.
   * Returns 400 with a message naming the invalid field if the body fails validation,
   * or 500 with a descriptive message if the resource can't be saved to the database.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createResourceDto: CreateResourceDto): Promise<Resource> {
    return this.resourcesService.create(createResourceDto);
  }
}

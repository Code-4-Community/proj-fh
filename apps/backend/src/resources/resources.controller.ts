import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Resource } from './resources.entity';
import { UpdateResourceDto } from './dto/update-resource.dto';

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

  /**
   * Updates an existing resource. Only the fields sent in the body are changed.
   * @param id The resource_id of the resource to update, taken from the URL.
   * @param updateResourceDto The fields to change.
   *
   * @returns 200 with the full updated Resource entity.
   * Returns 400 if the id isn't an integer, the body has no editable fields, or a field fails validation (the message names the field),
   * 404 if no resource has the given id,
   * or 500 with a descriptive message if the database fails while looking up or saving the resource.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResourceDto: UpdateResourceDto,
  ): Promise<Resource> {
    return this.resourcesService.update(id, updateResourceDto);
  }
}

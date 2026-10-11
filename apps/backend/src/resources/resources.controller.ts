import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { FindResourceQueryDTO } from './dto/find-resource-by-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
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
  /**
   * Retrieves resources by their IDs.
   *
   * @param ids the IDs of the resources to retrieve (a single-item array for one resource)
   * @returns 200 with the resources matching the given IDs.
   * Returns 400 if the body is not an array of numbers,
   * 404 if none of the IDs match a resource,
   * or 500 if the database query fails.
   */
  @Post('findByIds')
  @HttpCode(HttpStatus.OK)
  async findByIds(
    @Body(new ParseArrayPipe({ items: Number })) ids: number[],
  ): Promise<Resource[]> {
    return await this.resourcesService.findByIds(ids);
  }

  /**
   * Retrieves resources whose fields exactly match the fields given in the request body.
   * A resource is only returned if it matches every field provided. If multiple resources
   * match, all of them are returned.
   *
   * @param query the resource fields to match
   * @returns 200 with every resource matching all of the given fields,
   * 400 if a field has an invalid value or type,
   * 404 if no resources match,
   * or 500 if the database query fails.
   */
  @Post('find')
  @HttpCode(HttpStatus.OK)
  async find(@Body() query: FindResourceQueryDTO): Promise<Resource[]> {
    return await this.resourcesService.find(query);
  }

}
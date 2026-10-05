import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { FindResourceQueryDTO } from './dto/find-resource-by-query.dto';

/**
 * Controller for managing resources. Provides endpoints for retrieving and managing resources in the system.
 */
@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

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
   * Retrieves resources matching the given filters.
   *
   * @param query the filters to apply
   * @returns 200 with resources matching query.
   * Returns 400 if a category is invalid or a filter has the wrong type,
   * 404 if no resources match the filters,
   * or 500 if database query fails.
   */
  @Post('find')
  @HttpCode(HttpStatus.OK)
  async find(@Body() query: FindResourceQueryDTO): Promise<Resource[]> {
    return await this.resourcesService.find(query);
  }
}

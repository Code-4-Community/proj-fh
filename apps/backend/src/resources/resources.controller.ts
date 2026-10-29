import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedIdentity } from '../auth/authenticated-identity';
import { UsersService } from '../users/users.service';

/** An authenticated request; JwtAuthGuard puts the token's identity in request.user. */
type AuthenticatedRequest = {
  user: AuthenticatedIdentity;
};

/**
 * Controller for managing resources. Provides endpoints for retrieving and managing resources in the system.
 */
@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(
    private resourcesService: ResourcesService,
    private usersService: UsersService,
  ) {}

  /**
   * Creates a new resource. The logged-in user becomes its submitter.
   * @param createResourceDto The validated request body describing the resource.
   * @param request The authenticated request; its token identifies the submitting user.
   *
   * @returns 201 with the newly created Resource entity.
   * Returns 400 with a message naming the invalid field if the body fails validation,
   * 401 if the request has no valid token,
   * 403 if no user record exists for the token's email,
   * or 500 with a descriptive message if the resource can't be saved to the database.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createResourceDto: CreateResourceDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Resource> {
    const { email } = request.user;
    const user = email ? await this.usersService.findByEmail(email) : null;
    if (!user) {
      throw new ForbiddenException(
        `No user record exists for ${email ?? 'this token'}.`,
      );
    }

    return this.resourcesService.create(createResourceDto, user.id);
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
  async find(@Body() query: FindResourceQueryDto): Promise<Resource[]> {
    return await this.resourcesService.find(query);
  }
}

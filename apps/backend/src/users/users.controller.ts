import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Status } from './types';
import { CreateUserDto } from './dto/create-user.dto';
import { CreatedUserResponse } from './dto/created-user.response';
import { UserInvitationService } from './user-invitation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private readonly userInvitationService: UserInvitationService,
  ) {}

  /**
   * Invites a staff or admin user by email. Admin only.
   * Cognito generates the temporary password and emails it; the backend never sees it.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Status.ADMIN)
  @ApiOperation({ summary: 'Invite a staff or admin user by email' })
  @ApiCreatedResponse({
    type: CreatedUserResponse,
    description:
      'User created in Cognito and the database. Cognito emailed a temporary password. No secrets are returned.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid email, blank name, unsupported role, or an extra field such as password.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid ID token.' })
  @ApiForbiddenResponse({ description: 'The caller is not an admin.' })
  @ApiConflictResponse({
    description: 'The email already exists in the database or in Cognito.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Cognito email or request limit reached.',
  })
  @ApiBadGatewayResponse({
    description: 'Cognito could not deliver the invitation email.',
  })
  @ApiInternalServerErrorResponse({
    description:
      'Cognito failure, or the database save failed and the Cognito user was rolled back.',
  })
  inviteUser(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: CreateUserDto,
  ): Promise<CreatedUserResponse> {
    return this.userInvitationService.invite(dto);
  }

  @Get('/:userId')
  async getUser(@Param('userId', ParseIntPipe) userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  /**
   * Removes a community staff user from both Cognito and the database.
   * Admin only.
   *
   * @param id The database id of the user to remove, taken from the URL.
   * @returns 200 with the removed user once the database row is deleted and
   * Cognito has no account for that user (deleted now, or already missing).
   * Returns 401 if the token is missing or invalid,
   * 403 if the caller isn't an admin or the target isn't community staff,
   * 404 if no user has the given id (including a non-numeric id),
   * 502 if the Cognito lookup or delete fails (the database record is kept),
   * or 500 if Cognito no longer has the account but the database delete failed (retry the request).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Status.ADMIN)
  @Delete('/:id')
  removeUser(@Param('id') id: string) {
    return this.usersService.remove(parseInt(id));
  }

  // Example endpoint for email sending (DO NOT DEPLOY THIS)
  /*
  @Post('/test-email')
  sendTestEmail(@Body() body: { recipient: string }) {
    return this.usersService.sendTestEmail(body.recipient);
  }
  */
}
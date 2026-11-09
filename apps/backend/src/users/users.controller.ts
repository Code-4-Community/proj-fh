import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Status } from './types';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

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

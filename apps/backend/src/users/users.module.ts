import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserInvitationService } from './user-invitation.service';
import { CognitoAdminService } from './cognito-admin.service';
import { User } from './user.entity';
import { CognitoModule } from '../cognito/cognito.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CognitoModule],
  controllers: [UsersController],
  providers: [UsersService, UserInvitationService, CognitoAdminService],
  exports: [UsersService],
})
export class UsersModule {}
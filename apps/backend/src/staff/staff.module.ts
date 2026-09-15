import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff } from './staff.entity';

/**
 * The StaffModule is a NestJS module that encapsulates the functionality related to managing Staff users in the system.
 * It imports the TypeOrmModule for database interactions, registers the StaffController for handling HTTP requests,
 * and provides the StaffService for business logic related to Staff users.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Staff])],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}

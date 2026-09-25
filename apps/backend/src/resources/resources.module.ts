import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

/**
 * The ResroucesModule is a NestJS module that encapsulates the functionality related to managing resources in the system.
 * It imports the TypeOrmModule for database interactions, registers the ResourcesController for handling HTTP requests,
 * and provides the ResourcesService for business logic related to resources.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Resource])],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}

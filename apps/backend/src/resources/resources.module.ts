import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { ScoreModule } from '../score/score.module';

/**
 * The ResroucesModule is a NestJS module that encapsulates the functionality related to managing resources in the system.
 * It imports the TypeOrmModule for database interactions, registers the ResourcesController for handling HTTP requests,
 * and provides the ResourcesService for business logic related to resources.
 * TagsModule supplies tag validation and custom tag creation; UsersModule supplies the submitting user lookup;
 * ScoreModule supplies score creation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Resource]),
    TagsModule,
    UsersModule,
    ScoreModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';

/**
 * The TagsModule is a NestJS module that encapsulates the functionality related to managing tags in the system.
 * It imports the TypeOrmModule for database interactions, registers the TagsController for handling HTTP requests,
 * and provides the TagsService for business logic related to tags.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}

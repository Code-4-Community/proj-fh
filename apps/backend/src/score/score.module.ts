import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { Score } from './score.entity';

/**
 * The ScoreModule is a NestJS module that encapsulates the functionality related to managing scores in the system.
 * It imports the TypeOrmModule for database interactions, registers the ScoreController for handling HTTP requests,
 * and provides the ScoreService for business logic related to scores.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Score])],
  controllers: [ScoreController],
  providers: [ScoreService],
})
export class ScoreModule {}

import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ScoreService } from './score.service';
import { Score } from './score.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

/**
 * Controller for managing scores. Provides endpoints for retrieving and managing scores in the system.
 */
@ApiTags('Score')
@ApiBearerAuth()
@Controller('score')
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  /**
   * Retrieves a single score by its ID.
   */
  @Get('/:scoreId')
  async getScore(
    @Param('scoreId', ParseIntPipe) scoreId: number,
  ): Promise<Score | null> {
    return this.scoreService.findOneById(scoreId);
  }
}

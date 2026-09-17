import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Score } from './score.entity';

/**
 * The ScoreService is a NestJS service that provides business logic for managing scores in the system.
 * It interacts with the database through the injected repository of the Score entity.
 */
@Injectable()
export class ScoreService {
  constructor(@InjectRepository(Score) private repo: Repository<Score>) {}

  /**
   * Finds a single Score by its ID.
   * @param scoreId The ID of the Score to find.
   *
   * @returns A promise that resolves to the Score entity, or null if not found.
   */
  async findOneById(scoreId: number): Promise<Score | null> {
    throw new Error('Not implemented');
  }
}

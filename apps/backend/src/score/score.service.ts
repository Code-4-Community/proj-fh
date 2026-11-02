import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Score } from './score.entity';

/**
 * The ScoreService is a NestJS service that provides business logic for managing scores in the system.
 * It interacts with the database through the injected repository of the Score entity.
 */
@Injectable()
export class ScoreService {
  constructor(@InjectRepository(Score) private repo: Repository<Score>) {}

  /**
   * Creates a Score using the caller's transaction.
   * @param overallRating The reviewer's overall rating.
   * @param manager The entity manager for the transaction.
   *
   * @returns A promise that resolves to the newly created Score entity.
   */
  async create(overallRating: number, manager: EntityManager): Promise<Score> {
    const score = manager.create(Score, { overall_rating: overallRating });
    return manager.save(score);
  }

  /**
   * Finds the IDs of every Score with the given overall rating.
   * @param overallRating The overall rating to match.
   *
   * @returns A promise that resolves to the matching score IDs (empty if none match).
   */
  async findIdsByOverallRating(overallRating: number): Promise<number[]> {
    const scores = await this.repo.find({
      where: { overall_rating: overallRating },
    });
    return scores.map((score) => score.score_id);
  }

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

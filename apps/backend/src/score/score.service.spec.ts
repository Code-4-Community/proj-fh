import { EntityManager, Repository } from 'typeorm';
import { Score } from './score.entity';
import { ScoreService } from './score.service';

describe('ScoreService', () => {
  let service: ScoreService;
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    manager = {
      create: jest.fn((_entity, values) => values),
      save: jest.fn().mockResolvedValue({ score_id: 12, overall_rating: 5 }),
    };
    service = new ScoreService({} as Repository<Score>);
  });

  describe('create', () => {
    it('creates and saves a score using the supplied transaction', async () => {
      const score = { score_id: 12, overall_rating: 5 };

      await expect(
        service.create(5, manager as unknown as EntityManager),
      ).resolves.toEqual(score);
      expect(manager.create).toHaveBeenCalledWith(Score, {
        overall_rating: 5,
      });
      expect(manager.save).toHaveBeenCalledWith({ overall_rating: 5 });
    });

    it('propagates database errors', async () => {
      const error = new Error('Unable to create score');
      manager.save.mockRejectedValue(error);

      await expect(
        service.create(5, manager as unknown as EntityManager),
      ).rejects.toBe(error);
    });
  });
});

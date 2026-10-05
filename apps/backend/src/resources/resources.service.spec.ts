import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { ArrayOverlap, In, Repository } from 'typeorm';
import { Category, County } from './types';

/** Builds a resource with the given ID for use as a test fixture. */
const makeResource = (id: number): Resource =>
  ({
    resource_id: id,
    score_id: 1,
    name: `Resource ${id}`,
    category: [Category.FOOD_ACCESS],
    county: County.SUFFOLK,
    zip_code: '02115',
    last_verified_date: new Date('2026-01-15'),
    vetting_status: 'verified',
    tags: [],
  }) as Resource;

describe('ResourcesService', () => {
  let service: ResourcesService;
  let repository: {
    find: jest.Mock;
  };

  beforeEach(() => {
    repository = { find: jest.fn() };

    service = new ResourcesService(
      repository as unknown as Repository<Resource>,
    );

    
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Tests for retrieving resources by a list of IDs. */
  describe('findByIds', () => {
    it('retrieves a single resource by ID', async () => {
      const found = [makeResource(1)];
      repository.find.mockResolvedValue(found);

      await expect(service.findByIds([1])).resolves.toEqual(found);
      expect(repository.find).toHaveBeenCalledWith({
        where: { resource_id: In([1]) },
      });
    });

    it('retrieves multiple resources by ID', async () => {
      const found = [makeResource(1), makeResource(2), makeResource(3)];
      repository.find.mockResolvedValue(found);

      await expect(service.findByIds([1, 2, 3])).resolves.toEqual(found);
      expect(repository.find).toHaveBeenCalledWith({
        where: { resource_id: In([1, 2, 3]) },
      });
    });

    it('throws NotFoundException when no resource matches the given IDs', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findByIds([123])).rejects.toThrow(
        new NotFoundException('No resources found with IDs [123]'),
      );
    });

    it('throws InternalServerErrorException when database query fails', async () => {
      repository.find.mockRejectedValue(new Error('connection lost'));

      await expect(service.findByIds([1])).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to retrieve resources with IDs [1]: connection lost.',
        ),
      );
    });
  });

  /** Tests for retrieving resources by query filters. */
  describe('find', () => {
    it('retrieves resource matching a query and builds the correct filter', async () => {
      const found = [makeResource(1), makeResource(2)];
      repository.find.mockResolvedValue(found);

      await expect(
        service.find({
          category: [Category.FOOD_ACCESS],
          county: County.SUFFOLK,
          zip_code: '02115',
        }),
      ).resolves.toEqual(found);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          category: ArrayOverlap([Category.FOOD_ACCESS]),
          county: County.SUFFOLK,
          zip_code: '02115',
        },
      });
    });

    it('only filters on the fields provided', async () => {
      repository.find.mockResolvedValue([makeResource(1)]);

      await service.find({ county: County.SUFFOLK });

      expect(repository.find).toHaveBeenCalledWith({
        where: { county: County.SUFFOLK },
      });
    });

    it('throws NotFoundException when no resources match the query', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.find({ zip_code: '00000' })).rejects.toThrow(
        new NotFoundException('No resources found matching the given filters'),
      );
    });

    it('throws a BadRequestException for an invalid category without querying database', async () => {
      await expect(
        service.find({
          category: ['NOT_A_CATEGORY' as Category],
        }),
      ).rejects.toThrow(
        new BadRequestException('Unknown category: [NOT_A_CATEGORY]'),
      );

      expect(repository.find).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when database fails', async () => {
      repository.find.mockRejectedValue(new Error('connection lost'));

      await expect(service.find({ county: County.SUFFOLK })).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to retrieve resources: connection lost.',
        ),
      );
    });
  });
});

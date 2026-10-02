import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Resource } from './resources.entity';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Category, County } from './types';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
  };

  const now = new Date('2026-10-01T12:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);

    repository = {
      create: jest.fn((resource) => resource),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getRepositoryToken(Resource),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(ResourcesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createResourceDto: CreateResourceDto = {
    name: 'Greater Boston Food Bank',
    category: [Category.FOOD_ACCESS],
    county: County.SUFFOLK,
    zip_code: '02118',
    website: 'https://www.gbfb.org',
  };

  it('creates a resource', async () => {
    const expected = {
      ...createResourceDto,
      score_id: 0,
      vetting_status: 'pending review',
      last_verified_date: now,
    };
    const saved = { resource_id: 1, tags: [], ...expected };
    repository.save.mockResolvedValue(saved);

    await expect(service.create(createResourceDto)).resolves.toEqual(saved);
    expect(repository.create).toHaveBeenCalledWith(expected);
    expect(repository.save).toHaveBeenCalledWith(expected);
  });

  it('propagates errors from the database', async () => {
    const error = new Error('Unable to create resource');
    repository.save.mockRejectedValue(error);

    await expect(service.create(createResourceDto)).rejects.toThrow(error);
  });
});

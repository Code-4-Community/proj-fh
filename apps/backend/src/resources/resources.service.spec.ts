import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
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

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    repository = {
      create: jest.fn((resource) => resource),
      save: jest.fn((resource) =>
        Promise.resolve({ resource_id: 1, tags: [], ...resource }),
      ),
    };

    service = new ResourcesService(
      repository as unknown as Repository<Resource>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const serverDefaults = {
    score_id: 0,
    vetting_status: 'pending review',
    last_verified_date: now,
  };

  const requiredFields: CreateResourceDto = {
    name: 'Greater Boston Food Bank',
    category: [Category.FOOD_ACCESS],
    county: County.SUFFOLK,
    zip_code: '02118',
  };

  const allFields: CreateResourceDto = {
    ...requiredFields,
    description:
      'Provides free groceries to families in the Greater Boston area.',
    address: '70 South Bay Ave, Boston, MA 02118',
    phone: '(617) 427-5200',
    email: 'info@gbfb.org',
    website: 'https://www.gbfb.org',
    eligibility: 'Open to all Massachusetts residents.',
  };

  describe('create', () => {
    it('creates a resource without any optional fields', async () => {
      const expected = { ...requiredFields, ...serverDefaults };

      await expect(service.create(requiredFields)).resolves.toEqual({
        resource_id: 1,
        tags: [],
        ...expected,
      });
      expect(repository.create).toHaveBeenCalledWith(expected);
      expect(repository.save).toHaveBeenCalledWith(expected);
    });

    it('creates a resource with all optional fields included', async () => {
      const expected = { ...allFields, ...serverDefaults };

      await expect(service.create(allFields)).resolves.toEqual({
        resource_id: 1,
        tags: [],
        ...expected,
      });
      expect(repository.create).toHaveBeenCalledWith(expected);
      expect(repository.save).toHaveBeenCalledWith(expected);
    });

    it('ignores fields that are not part of the DTO', async () => {
      const body = {
        ...requiredFields,
        resource_id: 99,
        tags: [1, 2],
        vetting_status: 'verified',
        reviewer_notes: 'looks good',
      } as CreateResourceDto;

      await service.create(body);

      expect(repository.create).toHaveBeenCalledWith({
        ...requiredFields,
        ...serverDefaults,
      });
    });

    it('returns a descriptive error when the database errors', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      repository.save.mockRejectedValue(new Error('connection refused'));

      await expect(service.create(requiredFields)).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to save the resource to the database. Please try again later.',
        ),
      );
    });
  });

  describe('validation', () => {
    const NAME_MESSAGE = 'Name is required and must be at most 255 characters.';
    const CATEGORY_MESSAGE =
      'Category must be a non-empty list of: food_access, housing, other.';

    it.each<
      [string, Partial<Record<keyof CreateResourceDto, unknown>>, string]
    >([
      ['name (missing)', { name: undefined }, NAME_MESSAGE],
      ['name (blank)', { name: '   ' }, NAME_MESSAGE],
      ['name (too long)', { name: 'a'.repeat(256) }, NAME_MESSAGE],
      ['category (empty)', { category: [] }, CATEGORY_MESSAGE],
      [
        'category (unknown value)',
        { category: ['FOOD_ACCESS'] },
        CATEGORY_MESSAGE,
      ],
      [
        'county',
        { county: 'Atlantis' },
        'County must be a valid Massachusetts county.',
      ],
      [
        'zip_code',
        { zip_code: '2118' },
        'Zip code must be a 5-digit or ZIP+4 code.',
      ],
      [
        'address',
        { address: 'a'.repeat(256) },
        'Address must be at most 255 characters.',
      ],
      [
        'phone',
        { phone: '1'.repeat(21) },
        'Phone must be at most 20 characters.',
      ],
      [
        'email',
        { email: 'not-an-email' },
        'Email must be a valid email address.',
      ],
      ['website', { website: 'not a url' }, 'Website must be a valid URL.'],
    ])('rejects an invalid %s', async (_, override, message) => {
      const dto = { ...requiredFields, ...override } as CreateResourceDto;

      await expect(service.create(dto)).rejects.toThrow(
        new BadRequestException(message),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('accepts a ZIP+4 zip code', async () => {
      await expect(
        service.create({ ...requiredFields, zip_code: '02118-1234' }),
      ).resolves.toBeDefined();
    });
  });
});

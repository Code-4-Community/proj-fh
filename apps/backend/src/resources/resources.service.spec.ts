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
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

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
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  const now = new Date('2026-10-01T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    repository = {
      create: jest.fn((resource) => resource),
      save: jest.fn((resource) =>
        Promise.resolve({ resource_id: 1, tags: [], ...resource }),
      ),
      findOneBy: jest.fn(),
    };

    service = new ResourcesService(
      repository as unknown as Repository<Resource>,
    );

    
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  const NAME_MESSAGE = 'Name is required and must be at most 255 characters.';
  const CATEGORY_MESSAGE =
    'Category must be a non-empty list of: food_access, housing, other.';
  const COUNTY_MESSAGE = 'County must be a valid Massachusetts county.';
  const ZIP_CODE_MESSAGE = 'Zip code must be a 5-digit or ZIP+4 code.';
    const NO_FIELDS_MESSAGE =
    'At least one of the following fields must be provided: name, category, county, zip_code, description, address, phone, email, website, eligibility, vetting_status, reviewer_notes, last_verified_date, score_id, tags.';

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
          'Failed to retrieve resources with IDs [1]: connection lost.'),
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

  describe('validation', () => {
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

  describe('update', () => {
    const existing = {
      resource_id: 1,
      ...allFields,
      score_id: 0,
      vetting_status: 'verified',
      last_verified_date: new Date('2026-09-01'),
      reviewer_notes: 'Confirmed hours by phone.',
      tags: [3],
    } as Resource;

    const DB_MESSAGE =
      'Failed to update the resource in the database. Please try again later.';

    beforeEach(() => {
      repository.findOneBy.mockResolvedValue({ ...existing });
      repository.save.mockImplementation((resource) =>
        Promise.resolve(resource),
      );
    });

    it('changes only the fields that are sent and returns the full resource', async () => {
      const changes: UpdateResourceDto = {
        name: 'GBFB',
        phone: '(617) 555-0100',
      };
      const expected = { ...existing, ...changes };

      await expect(service.update(1, changes)).resolves.toEqual(expected);
      expect(repository.findOneBy).toHaveBeenCalledWith({ resource_id: 1 });
      expect(repository.save).toHaveBeenCalledWith(expected);
    });

    it('clears an optional field when it is sent as null', async () => {
      await service.update(1, { description: null });

      expect(repository.save).toHaveBeenCalledWith({
        ...existing,
        description: null,
      });
    });

    it('updates fields that are set to defaults on creation', async () => {
      const changes: UpdateResourceDto = {
        vetting_status: 'verified',
        reviewer_notes: 'Called and confirmed hours.',
        last_verified_date: '2026-10-05',
        score_id: 2,
        tags: [1, 4],
      };

      await service.update(1, changes);

      expect(repository.save).toHaveBeenCalledWith({ ...existing, ...changes });
    });

    it('ignores resource_id and unknown fields', async () => {
      const body = {
        name: 'GBFB',
        resource_id: 99,
        not_a_field: 'x',
      } as UpdateResourceDto;

      await service.update(1, body);

      expect(repository.save).toHaveBeenCalledWith({
        ...existing,
        name: 'GBFB',
      });
    });

    it.each<[string, Record<string, unknown>]>([
      ['an empty body', {}],
      ['only fields that cannot be edited', { resource_id: 5 }],
    ])('rejects %s', async (_, body) => {
      await expect(
        service.update(1, body as UpdateResourceDto),
      ).rejects.toThrow(new BadRequestException(NO_FIELDS_MESSAGE));
      expect(repository.findOneBy).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('returns a not found error when no resource has the given id', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.update(42, { name: 'GBFB' })).rejects.toThrow(
        new NotFoundException('Resource with id 42 was not found.'),
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('returns a descriptive error when the database errors while looking up the resource', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      repository.findOneBy.mockRejectedValue(new Error('connection refused'));

      await expect(service.update(1, { name: 'GBFB' })).rejects.toThrow(
        new InternalServerErrorException('Failed to look up resource 1'),
      );
    });

    it('returns a descriptive error when the database errors while saving', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      repository.save.mockRejectedValue(new Error('connection refused'));

      await expect(service.update(1, { name: 'GBFB' })).rejects.toThrow(
        new InternalServerErrorException('Failed to update resource 1'),
      );
    });
  });

  describe('update validation', () => {
    beforeEach(() => {
      repository.findOneBy.mockResolvedValue({
        resource_id: 1,
        ...requiredFields,
      });
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['name (null)', { name: null }, NAME_MESSAGE],
      ['name (blank)', { name: '   ' }, NAME_MESSAGE],
      ['name (too long)', { name: 'a'.repeat(256) }, NAME_MESSAGE],
      ['category (null)', { category: null }, CATEGORY_MESSAGE],
      ['category (empty)', { category: [] }, CATEGORY_MESSAGE],
      [
        'category (unknown value)',
        { category: ['FOOD_ACCESS'] },
        CATEGORY_MESSAGE,
      ],
      ['county (null)', { county: null }, COUNTY_MESSAGE],
      ['county', { county: 'Atlantis' }, COUNTY_MESSAGE],
      ['zip_code (null)', { zip_code: null }, ZIP_CODE_MESSAGE],
      ['zip_code', { zip_code: '2118' }, ZIP_CODE_MESSAGE],
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
      [
        'vetting_status (null)',
        { vetting_status: null },
        'Vetting status must be a non-empty string of at most 255 characters.',
      ],
      [
        'vetting_status (blank)',
        { vetting_status: '   ' },
        'Vetting status must be a non-empty string of at most 255 characters.',
      ],
      [
        'vetting_status (too long)',
        { vetting_status: 'a'.repeat(256) },
        'Vetting status must be a non-empty string of at most 255 characters.',
      ],
      [
        'reviewer_notes',
        { reviewer_notes: 123 },
        'Reviewer notes must be a string.',
      ],
      [
        'last_verified_date',
        { last_verified_date: 'not a date' },
        'Last verified date must be a valid date, e.g. 2026-10-05.',
      ],
      [
        'last_verified_date (null)',
        { last_verified_date: null },
        'Last verified date must be a valid date, e.g. 2026-10-05.',
      ],
      [
        'score_id (not an integer)',
        { score_id: 1.5 },
        'Score ID must be a non-negative integer.',
      ],
      [
        'score_id (negative)',
        { score_id: -1 },
        'Score ID must be a non-negative integer.',
      ],
      [
        'tags (not a list)',
        { tags: 'abc' },
        'Tags must be a list of integer tag IDs.',
      ],
      [
        'tags (non-integer ID)',
        { tags: ['a'] },
        'Tags must be a list of integer tag IDs.',
      ],
    ])('rejects an invalid %s', async (_, body, message) => {
      await expect(
        service.update(1, body as UpdateResourceDto),
      ).rejects.toThrow(new BadRequestException(message));
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not require including all fields as update input that would be required during creation', async () => {
      await expect(
        service.update(1, { description: 'Now open on Saturdays.' }),
      ).resolves.toBeDefined();
    });
  });
  
});

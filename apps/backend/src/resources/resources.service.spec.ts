import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { ArrayContains, In, Repository } from 'typeorm';
import {
  Category,
  County,
  PublicField,
  Recommendation,
  ResponseTime,
  ReviewStatus,
  YesNoMaybe,
} from './types';
import { Score } from '../score/score.entity';
import { ScoreService } from '../score/score.service';
import { TagsService } from '../tags/tags.service';
import { UsersService } from '../users/users.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';

/** Builds a resource with the given ID for use as a test fixture. */
const makeResource = (id: number): Resource =>
  ({
    resource_id: id,
    score_id: 1,
    organization_name: `Organization ${id}`,
    program_name: `Program ${id}`,
    category: Category.FOOD_ACCESS,
    county: County.SUFFOLK,
    zip_code: '02115',
    last_verified_date: new Date('2026-01-15'),
    outreach_date: new Date('2026-01-01'),
    completed_by: 'Jane Doe',
    staff_contact_name: 'Sam Lee',
    staff_contact_role: 'Manager',
    responsiveness: 4,
    response_time: ResponseTime.SAME_DAY,
    interaction_notes: 'Prompt response.',
    accessibility_notes: 'Accessible.',
    red_flag_concerns: 'None.',
    can_refer_directly: true,
    has_referral_contact: true,
    provides_followup: false,
    referral_realistic: YesNoMaybe.YES,
    referral_notes: 'Call first.',
    recommendation: Recommendation.STRONGLY_RECOMMEND,
    strengths: 'Helpful staff.',
    followup_needed: 'None.',
    review_status: ReviewStatus.PENDING_REVIEW,
    tags: [],
  }) as Resource;

describe('ResourcesService', () => {
  let service: ResourcesService;
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
  };
  let tagsService: { resolveForResource: jest.Mock };
  let usersService: { findByEmail: jest.Mock };
  let scoreService: { create: jest.Mock; findIdsByOverallRating: jest.Mock };
  let repository: {
    manager: { transaction: jest.Mock };
    find: jest.Mock;
  };

  beforeEach(() => {
    manager = {
      create: jest.fn((_entity, values) => values),
      save: jest.fn((entityOrValue, value) =>
        Promise.resolve({ resource_id: 1, ...(value ?? entityOrValue) }),
      ),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    tagsService = {
      resolveForResource: jest.fn((_manager, _category, ids) => ids),
    };
    usersService = {
      findByEmail: jest.fn().mockResolvedValue({
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    };
    scoreService = {
      create: jest.fn().mockResolvedValue({ score_id: 12 }),
      findIdsByOverallRating: jest.fn().mockResolvedValue([12]),
    };
    repository = {
      manager: {
        transaction: jest.fn((callback) => callback(manager)),
      },
      find: jest.fn(),
    };

    service = new ResourcesService(
      repository as unknown as Repository<Resource>,
      tagsService as unknown as TagsService,
      usersService as unknown as UsersService,
      scoreService as unknown as ScoreService,
    );

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const requiredFields: CreateResourceDto = {
    organization_name: 'Greater Boston Food Bank',
    program_name: 'Community Food Pantry',
    category: Category.FOOD_ACCESS,
    county: County.SUFFOLK,
    zip_code: '02118',
    last_verified_date: '2026-10-05',
    outreach_date: '2026-10-01',
    staff_contact_name: 'Sam Lee',
    staff_contact_role: 'Program Manager',
    responsiveness: 4,
    response_time: ResponseTime.SAME_DAY,
    interaction_notes: 'Prompt response.',
    accessibility_notes: 'Accessible.',
    red_flag_concerns: 'None.',
    can_refer_directly: true,
    has_referral_contact: true,
    provides_followup: false,
    referral_realistic: YesNoMaybe.YES,
    referral_notes: 'Call first.',
    recommendation: Recommendation.STRONGLY_RECOMMEND,
    strengths: 'Helpful staff.',
    followup_needed: 'Confirm hours.',
    overall_rating: 5,
    tags: [],
  };

  const allFields: CreateResourceDto = {
    ...requiredFields,
    public_fields: [PublicField.WEBSITE, PublicField.PHONE],
    address: '70 South Bay Ave, Boston, MA 02118',
    phone: '(617) 427-5200',
    email: 'info@gbfb.org',
    website: 'https://www.gbfb.org',
    eligibility: 'Open to all Massachusetts residents.',
  };

  const NAME_RULE = 'required and must be at most 255 characters.';
  const CATEGORY_RULE = 'must be one of: food_access, housing, other.';
  const COUNTY_RULE = 'must be a valid Massachusetts county.';
  const ZIP_CODE_RULE = 'must be a 5-digit or ZIP+4 code.';
  const PUBLIC_FIELDS_RULE =
    'must be a list of: website, phone, email, address.';
  const TAGS_RULE = 'must be a list of integer tag IDs.';
  const DATE_RULE = 'must be a valid date, e.g. 2026-10-05.';
  // Echoed values over 120 characters are cut off in the error message.
  const truncatedReceived = (value: string) =>
    `${`received "${value}"`.slice(0, 120)}…`;
  const EDITABLE_LIST = [
    'organization_name',
    'program_name',
    'category',
    'county',
    'zip_code',
    'address',
    'phone',
    'email',
    'website',
    'public_fields',
    'eligibility',
    'last_verified_date',
    'outreach_date',
    'staff_contact_name',
    'staff_contact_role',
    'responsiveness',
    'response_time',
    'interaction_notes',
    'accessibility_notes',
    'program_notes',
    'red_flag_concerns',
    'can_refer_directly',
    'has_referral_contact',
    'referral_contact',
    'provides_followup',
    'referral_realistic',
    'referral_notes',
    'recommendation',
    'strengths',
    'followup_needed',
    'review_status',
    'needs_changes_notes',
    'submission_rejection_notes',
    'overall_rating',
    'tags',
    'custom_tags',
  ].join(', ');
  const NO_FIELDS_MESSAGE = `At least one of the following fields must be provided: ${EDITABLE_LIST}.`;
  const CREATABLE_LIST = EDITABLE_LIST.split(', ')
    .filter(
      (field) =>
        ![
          'review_status',
          'needs_changes_notes',
          'submission_rejection_notes',
        ].includes(field),
    )
    .join(', ');

  describe('create', () => {
    it('creates a resource without any optional fields', async () => {
      const expected = {
        ...requiredFields,
        overall_rating: undefined,
        address: undefined,
        phone: undefined,
        email: undefined,
        website: undefined,
        eligibility: undefined,
        public_fields: [],
        program_notes: undefined,
        referral_contact: undefined,
        last_verified_date: new Date(requiredFields.last_verified_date),
        outreach_date: new Date(requiredFields.outreach_date),
        completed_by: 'Jane Doe',
        score_id: 12,
        review_status: ReviewStatus.PENDING_REVIEW,
        tags: [],
      };

      await expect(
        service.create(requiredFields, 'reviewer@example.org'),
      ).resolves.toEqual({
        resource_id: 1,
        ...expected,
      });
      expect(scoreService.create).toHaveBeenCalledWith(
        requiredFields.overall_rating,
        manager,
      );
      expect(manager.save).toHaveBeenCalledWith(expected);
    });

    it('creates a resource with all optional fields included', async () => {
      const expected = {
        ...allFields,
        overall_rating: undefined,
        program_notes: undefined,
        referral_contact: undefined,
        last_verified_date: new Date(allFields.last_verified_date),
        outreach_date: new Date(allFields.outreach_date),
        completed_by: 'Jane Doe',
        score_id: 12,
        review_status: ReviewStatus.PENDING_REVIEW,
        tags: [],
      };

      await expect(
        service.create(allFields, 'reviewer@example.org'),
      ).resolves.toEqual({ resource_id: 1, ...expected });
      expect(manager.save).toHaveBeenCalledWith(expected);
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['resource_id', { resource_id: 99 }, 'resource_id'],
      [
        'review_status',
        { review_status: 'approved_published' },
        'review_status',
      ],
      [
        'several server-managed fields',
        { completed_by: 'Other User', score_id: 5, needs_changes_notes: 'x' },
        'completed_by, score_id, needs_changes_notes',
      ],
      ['an unknown field', { not_a_field: 'x' }, 'not_a_field'],
    ])(
      'rejects %s instead of silently ignoring it',
      async (_, extra, fields) => {
        await expect(
          service.create(
            { ...requiredFields, ...extra } as CreateResourceDto,
            'reviewer@example.org',
          ),
        ).rejects.toThrow(
          new BadRequestException(
            `Field(s) can't be set when creating a resource: ${fields}. Allowed fields are: ${CREATABLE_LIST}.`,
          ),
        );
        expect(repository.manager.transaction).not.toHaveBeenCalled();
      },
    );

    it('rejects a user without a matching account', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.create(requiredFields, 'unknown@example.org'),
      ).rejects.toThrow(
        new ForbiddenException(
          'No user record exists for unknown@example.org.',
        ),
      );
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    it('returns a descriptive error when the database errors', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      manager.save.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.create(requiredFields, 'reviewer@example.org'),
      ).rejects.toThrow(
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
          'Failed to retrieve resources from the database. Please try again later.',
        ),
      );
    });
  });

  /** Tests for retrieving resources whose fields match the given fields. */
  describe('find', () => {
    const FIND_DB_MESSAGE =
      'Failed to retrieve resources from the database. Please try again later.';

    it('retrieves resources matching the given fields and builds the correct query', async () => {
      const found = [makeResource(1), makeResource(2)];
      repository.find.mockResolvedValue(found);

      await expect(
        service.find({
          public_fields: [PublicField.PHONE],
          county: County.SUFFOLK,
          zip_code: '02115',
        }),
      ).resolves.toEqual(found);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          public_fields: ArrayContains([PublicField.PHONE]),
          county: County.SUFFOLK,
          zip_code: '02115',
        },
      });
    });

    it('only matches on the fields provided', async () => {
      repository.find.mockResolvedValue([makeResource(1)]);

      await service.find({ county: County.SUFFOLK });

      expect(repository.find).toHaveBeenCalledWith({
        where: { county: County.SUFFOLK },
      });
    });

    it('matches on any searchable field, not just a fixed set', async () => {
      repository.find.mockResolvedValue([makeResource(1)]);

      await service.find({
        organization_name: 'Organization 1',
        review_status: ReviewStatus.PENDING_REVIEW,
        tags: [1, 4],
      });

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          organization_name: 'Organization 1',
          review_status: ReviewStatus.PENDING_REVIEW,
          tags: ArrayContains([1, 4]),
        },
      });
    });

    it('matches overall_rating through the scores with that rating', async () => {
      scoreService.findIdsByOverallRating.mockResolvedValue([3, 7]);
      repository.find.mockResolvedValue([makeResource(1)]);

      await service.find({ county: County.SUFFOLK, overall_rating: 5 });

      expect(scoreService.findIdsByOverallRating).toHaveBeenCalledWith(5);
      expect(repository.find).toHaveBeenCalledWith({
        where: { county: County.SUFFOLK, score_id: In([3, 7]) },
      });
    });

    it('throws NotFoundException when no score has the given overall_rating', async () => {
      scoreService.findIdsByOverallRating.mockResolvedValue([]);
      repository.find.mockResolvedValue([]);

      await expect(service.find({ overall_rating: 1 })).rejects.toThrow(
        new NotFoundException('No resources found matching the given fields.'),
      );
    });

    it('throws NotFoundException when no resources match the given fields', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.find({ zip_code: '00000' })).rejects.toThrow(
        new NotFoundException('No resources found matching the given fields.'),
      );
    });

    // Sent fields go through the same validators as create and update.
    it.each<[string, Record<string, unknown>, string]>([
      [
        'category (unknown value)',
        { category: 'NOT_A_CATEGORY' },
        `Invalid category (received "NOT_A_CATEGORY"): ${CATEGORY_RULE}`,
      ],
      [
        'public fields (unknown value)',
        { public_fields: ['NOT_A_FIELD'] },
        `Invalid public_fields (received ["NOT_A_FIELD"]): ${PUBLIC_FIELDS_RULE}`,
      ],
      [
        'county',
        { county: 'Atlantis' },
        `Invalid county (received "Atlantis"): ${COUNTY_RULE}`,
      ],
      [
        'zip_code',
        { zip_code: '2118' },
        `Invalid zip_code (received "2118"): ${ZIP_CODE_RULE}`,
      ],
      [
        'overall_rating (out of range)',
        { overall_rating: 6 },
        'Invalid overall_rating (received 6): must be an integer from 1 to 5.',
      ],
      [
        'tags (not a list)',
        { tags: 'abc' },
        `Invalid tags (received "abc"): ${TAGS_RULE}`,
      ],
    ])(
      'rejects an invalid %s without querying the database',
      async (_, body, message) => {
        await expect(
          service.find(body as FindResourceQueryDto),
        ).rejects.toThrow(new BadRequestException(message));
        expect(repository.find).not.toHaveBeenCalled();
      },
    );

    it.each<[string, Record<string, unknown>]>([
      ['an unknown field', { not_a_field: 'x' }],
      ['resource_id, which findByIds handles', { resource_id: 1 }],
    ])('rejects %s without querying the database', async (_, body) => {
      await expect(service.find(body as FindResourceQueryDto)).rejects.toThrow(
        /^Unknown field\(s\)/,
      );
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('rejects a field sent as null', async () => {
      await expect(
        service.find({ county: null } as unknown as FindResourceQueryDto),
      ).rejects.toThrow(
        new BadRequestException("Fields can't be null when searching: county."),
      );
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('rejects a body that is not an object', async () => {
      await expect(
        service.find([1] as unknown as FindResourceQueryDto),
      ).rejects.toThrow(
        new BadRequestException(
          'The request body must be an object of resource fields.',
        ),
      );
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when the database fails', async () => {
      repository.find.mockRejectedValue(new Error('connection lost'));

      await expect(service.find({ county: County.SUFFOLK })).rejects.toThrow(
        new InternalServerErrorException(FIND_DB_MESSAGE),
      );
    });
  });

  describe('create validation', () => {
    it.each<
      [string, Partial<Record<keyof CreateResourceDto, unknown>>, string]
    >([
      [
        'organization name (missing)',
        { organization_name: undefined },
        `Invalid organization_name (missing): ${NAME_RULE}`,
      ],
      [
        'organization name (blank)',
        { organization_name: '   ' },
        `Invalid organization_name (received "   "): ${NAME_RULE}`,
      ],
      [
        'organization name (too long)',
        { organization_name: 'a'.repeat(256) },
        `Invalid organization_name (${truncatedReceived('a'.repeat(256))}): ${NAME_RULE}`,
      ],
      [
        'category (missing)',
        { category: undefined },
        `Invalid category (missing): ${CATEGORY_RULE}`,
      ],
      [
        'category (unknown value)',
        { category: 'FOOD_ACCESS' },
        `Invalid category (received "FOOD_ACCESS"): ${CATEGORY_RULE}`,
      ],
      [
        'county',
        { county: 'Atlantis' },
        `Invalid county (received "Atlantis"): ${COUNTY_RULE}`,
      ],
      [
        'zip_code',
        { zip_code: '2118' },
        `Invalid zip_code (received "2118"): ${ZIP_CODE_RULE}`,
      ],
      [
        'address',
        { address: 'a'.repeat(256) },
        `Invalid address (${truncatedReceived('a'.repeat(256))}): must be at most 255 characters.`,
      ],
      [
        'phone',
        { phone: '1'.repeat(21) },
        `Invalid phone (received "${'1'.repeat(21)}"): must be at most 20 characters.`,
      ],
      [
        'email',
        { email: 'not-an-email' },
        'Invalid email (received "not-an-email"): must be a valid email address.',
      ],
      [
        'website',
        { website: 'not a url' },
        'Invalid website (received "not a url"): must be a valid URL.',
      ],
      [
        'public fields',
        { public_fields: ['NOT_A_FIELD'] },
        `Invalid public_fields (received ["NOT_A_FIELD"]): ${PUBLIC_FIELDS_RULE}`,
      ],
    ])('rejects an invalid %s', async (_, override, message) => {
      const dto = { ...requiredFields, ...override } as CreateResourceDto;

      await expect(service.create(dto, 'reviewer@example.org')).rejects.toThrow(
        new BadRequestException(message),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('accepts a ZIP+4 zip code', async () => {
      await expect(
        service.create(
          { ...requiredFields, zip_code: '02118-1234' },
          'reviewer@example.org',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    const existing = {
      resource_id: 1,
      ...allFields,
      last_verified_date: new Date(allFields.last_verified_date),
      outreach_date: new Date(allFields.outreach_date),
      score_id: 12,
      completed_by: 'Jane Doe',
      review_status: ReviewStatus.PENDING_REVIEW,
      last_verified_date: new Date('2026-09-01'),
      tags: [3],
    } as Resource;

    beforeEach(() => {
      manager.findOneBy.mockResolvedValue({ ...existing });
      manager.save.mockImplementation((_entity, resource) =>
        Promise.resolve(resource),
      );
    });

    it('changes only the fields that are sent and returns the full resource', async () => {
      const changes: UpdateResourceDto = {
        organization_name: 'GBFB',
        phone: '(617) 555-0100',
      };
      const expected = { ...existing, ...changes };

      await expect(service.update(1, changes)).resolves.toEqual(expected);
      expect(manager.findOneBy).toHaveBeenCalledWith(Resource, {
        resource_id: 1,
      });
      expect(manager.save).toHaveBeenCalledWith(Resource, expected);
    });

    it('clears an optional field when it is sent as null', async () => {
      await service.update(1, { eligibility: null });

      expect(manager.save).toHaveBeenCalledWith(Resource, {
        ...existing,
        eligibility: null,
      });
    });

    it('updates fields that are set to defaults on creation', async () => {
      const changes: UpdateResourceDto = {
        review_status: ReviewStatus.APPROVED_PUBLISHED,
        last_verified_date: '2026-10-05',
        overall_rating: 2,
        tags: [1, 4],
      };

      await service.update(1, changes);

      expect(manager.update).toHaveBeenCalledWith(
        Score,
        { score_id: existing.score_id },
        { overall_rating: 2 },
      );
      expect(manager.save).toHaveBeenCalledWith(Resource, {
        ...existing,
        review_status: ReviewStatus.APPROVED_PUBLISHED,
        last_verified_date: new Date('2026-10-05'),
        tags: [1, 4],
      });
    });

    it.each<[string, Record<string, unknown>, string]>([
      [
        'resource_id',
        { organization_name: 'GBFB', resource_id: 99 },
        'resource_id',
      ],
      ['an unknown field', { not_a_field: 'x' }, 'not_a_field'],
      [
        'several fields that cannot be edited',
        { completed_by: 'Other', score_id: 5 },
        'completed_by, score_id',
      ],
    ])(
      'rejects %s instead of silently ignoring it',
      async (_, body, fields) => {
        await expect(
          service.update(1, body as UpdateResourceDto),
        ).rejects.toThrow(
          new BadRequestException(
            `Field(s) can't be updated: ${fields}. Editable fields are: ${EDITABLE_LIST}.`,
          ),
        );
        expect(manager.findOneBy).not.toHaveBeenCalled();
        expect(manager.save).not.toHaveBeenCalled();
      },
    );

    it('rejects an empty body', async () => {
      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException(NO_FIELDS_MESSAGE),
      );
      expect(manager.findOneBy).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('returns a not found error when no resource has the given id', async () => {
      manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(42, { organization_name: 'GBFB' }),
      ).rejects.toThrow(
        new NotFoundException('Resource with id 42 was not found.'),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('returns a descriptive error when the database errors while looking up the resource', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      manager.findOneBy.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.update(1, { organization_name: 'GBFB' }),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to update resource 1'),
      );
    });

    it('returns a descriptive error when the database errors while saving', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      manager.save.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.update(1, { organization_name: 'GBFB' }),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to update resource 1'),
      );
    });
  });

  describe('update validation', () => {
    beforeEach(() => {
      manager.findOneBy.mockResolvedValue({
        resource_id: 1,
        ...requiredFields,
      });
    });

    it.each<[string, Record<string, unknown>, string]>([
      [
        'organization name (null)',
        { organization_name: null },
        `Invalid organization_name (received null): ${NAME_RULE}`,
      ],
      [
        'organization name (blank)',
        { organization_name: '   ' },
        `Invalid organization_name (received "   "): ${NAME_RULE}`,
      ],
      [
        'organization name (too long)',
        { organization_name: 'a'.repeat(256) },
        `Invalid organization_name (${truncatedReceived('a'.repeat(256))}): ${NAME_RULE}`,
      ],
      [
        'category (null)',
        { category: null },
        `Invalid category (received null): ${CATEGORY_RULE}`,
      ],
      [
        'category (unknown value)',
        { category: 'FOOD_ACCESS' },
        `Invalid category (received "FOOD_ACCESS"): ${CATEGORY_RULE}`,
      ],
      [
        'county (null)',
        { county: null },
        `Invalid county (received null): ${COUNTY_RULE}`,
      ],
      [
        'county',
        { county: 'Atlantis' },
        `Invalid county (received "Atlantis"): ${COUNTY_RULE}`,
      ],
      [
        'zip_code (null)',
        { zip_code: null },
        `Invalid zip_code (received null): ${ZIP_CODE_RULE}`,
      ],
      [
        'zip_code',
        { zip_code: '2118' },
        `Invalid zip_code (received "2118"): ${ZIP_CODE_RULE}`,
      ],
      [
        'address',
        { address: 'a'.repeat(256) },
        `Invalid address (${truncatedReceived('a'.repeat(256))}): must be at most 255 characters.`,
      ],
      [
        'phone',
        { phone: '1'.repeat(21) },
        `Invalid phone (received "${'1'.repeat(21)}"): must be at most 20 characters.`,
      ],
      [
        'email',
        { email: 'not-an-email' },
        'Invalid email (received "not-an-email"): must be a valid email address.',
      ],
      [
        'website',
        { website: 'not a url' },
        'Invalid website (received "not a url"): must be a valid URL.',
      ],
      [
        'public fields',
        { public_fields: ['NOT_A_FIELD'] },
        `Invalid public_fields (received ["NOT_A_FIELD"]): ${PUBLIC_FIELDS_RULE}`,
      ],
      [
        'last_verified_date',
        { last_verified_date: 'not a date' },
        `Invalid last_verified_date (received "not a date"): ${DATE_RULE}`,
      ],
      [
        'last_verified_date (null)',
        { last_verified_date: null },
        `Invalid last_verified_date (received null): ${DATE_RULE}`,
      ],
      [
        'tags (not a list)',
        { tags: 'abc' },
        `Invalid tags (received "abc"): ${TAGS_RULE}`,
      ],
      [
        'tags (non-integer ID)',
        { tags: ['a'] },
        `Invalid tags (received ["a"]): ${TAGS_RULE}`,
      ],
    ])('rejects an invalid %s', async (_, body, message) => {
      await expect(
        service.update(1, body as UpdateResourceDto),
      ).rejects.toThrow(new BadRequestException(message));
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('does not require including all fields as update input that would be required during creation', async () => {
      await expect(
        service.update(1, { program_notes: 'Now open on Saturdays.' }),
      ).resolves.toBeDefined();
    });
  });
});

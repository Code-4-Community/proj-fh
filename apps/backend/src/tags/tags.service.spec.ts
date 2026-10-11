import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Tag } from './tag.entity';
import { TagsService } from './tags.service';
import { Category } from './types';

describe('TagsService', () => {
  let service: TagsService;
  let repository: {
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(TagsService);
  });

  const createTagDto = {
    category: Category.FOOD_SERVICE_TYPE,
    label: 'Farmers Market',
    slug: 'farmers-market',
  };

  it('creates a tag', async () => {
    const createdTag = { tag_id: 1, ...createTagDto };
    repository.create.mockReturnValue(createdTag);
    repository.save.mockResolvedValue(createdTag);

    await expect(
      service.create(
        createTagDto.category,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).resolves.toEqual(createdTag);
    expect(repository.create).toHaveBeenCalledWith(createdTag);
    expect(repository.save).toHaveBeenCalledWith(createdTag);
  });

  it('propagates errors from the database', async () => {
    const error = new Error('Unable to create tag');
    repository.save.mockRejectedValue(error);

    await expect(
      service.create(
        createTagDto.category,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).rejects.toBe(error);
  });

  it('rejects when category is missing', async () => {
    await expect(
      // @ts-expect-error Intentionally passing a missing category to test validation.
      service.create(undefined, createTagDto.label, createTagDto.slug),
    ).rejects.toThrow(
      new BadRequestException(
        'Category, label, and slug are required to create a tag.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when label is missing', async () => {
    await expect(
      // @ts-expect-error Intentionally passing a missing label to test validation.
      service.create(createTagDto.category, undefined, createTagDto.slug),
    ).rejects.toThrow(
      new BadRequestException(
        'Category, label, and slug are required to create a tag.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when slug is missing', async () => {
    await expect(
      // @ts-expect-error Intentionally passing a missing slug to test validation.
      service.create(createTagDto.category, createTagDto.label, undefined),
    ).rejects.toThrow(
      new BadRequestException(
        'Category, label, and slug are required to create a tag.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank label', async () => {
    await expect(
      service.create(createTagDto.category, '   ', createTagDto.slug),
    ).rejects.toThrow(new BadRequestException('Label cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank slug', async () => {
    await expect(
      service.create(createTagDto.category, createTagDto.label, '   '),
    ).rejects.toThrow(new BadRequestException('Slug cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a slug with spaces', async () => {
    await expect(
      service.create(createTagDto.category, createTagDto.label, 'invalid slug'),
    ).rejects.toThrow(new BadRequestException('Slug cannot contain spaces.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns a tag when the tag id exists', async () => {
    const tag = {
      tag_id: 1,
      category: Category.FOOD_SERVICE_TYPE,
      label: 'Farmers Market',
      slug: 'farmers-market',
    };

    repository.findOneBy.mockResolvedValue(tag);

    await expect(service.getTagById(1)).resolves.toEqual(tag);

    expect(repository.findOneBy).toHaveBeenCalledWith({ tag_id: 1 });
  });

  it('rejects when a tag id cannot be found', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.getTagById(999)).rejects.toThrow(
      'The tag id: 999 could not be found.',
    );
  });

  it('returns tags when the category exists', async () => {
    const tags = [
      {
        tag_id: 1,
        category: Category.FOOD_SERVICE_TYPE,
        label: 'Farmers Market',
        slug: 'farmers-market',
      },
      {
        tag_id: 2,
        category: Category.FOOD_SERVICE_TYPE,
        label: 'Food Pantry',
        slug: 'food-pantry',
      },
    ];

    repository.findBy.mockResolvedValue(tags);
    await expect(
      service.getTagsByCategory(Category.FOOD_SERVICE_TYPE),
    ).resolves.toEqual(tags);
    expect(repository.findBy).toHaveBeenCalledWith({
      category: Category.FOOD_SERVICE_TYPE,
    });
  });

  it('returns an empty array when no tags match the category', async () => {
    repository.findBy.mockResolvedValue([]);

    await expect(
      service.getTagsByCategory(Category.NUTRITION_PROGRAM),
    ).resolves.toEqual([]);
    expect(repository.findBy).toHaveBeenCalledWith({
      category: Category.NUTRITION_PROGRAM,
    });
  });

  it('rejects an invalid/nonexistent category', async () => {
    await expect(
      service.getTagsByCategory('fake_category' as Category),
    ).rejects.toThrow(
      `fake_category is not a valid Category. Valid categories are: ${Object.values(Category).join(', ')}.`,
    );
  });

  it('gets tags by ids', async () => {
    const tags = [
      {
        tag_id: 1,
        category: Category.FOOD_TYPE,
        label: 'Food Pantry',
        slug: 'food-pantry',
      },
      {
        tag_id: 2,
        category: Category.FOOD_TYPE,
        label: 'Grocery Store',
        slug: 'grocery-store',
      },
    ];

    repository.findBy.mockResolvedValue(tags);

    await expect(service.getTagsByIds([1, 2])).resolves.toEqual(tags);
  });

  it('rejects an empty list of tag ids', async () => {
    await expect(service.getTagsByIds([])).rejects.toThrow(
      'At least one tag ID is required.',
    );
  });

  it('returns only the tags that exist when some ids are missing', async () => {
    const tag = {
      tag_id: 1,
      category: 'food_service_type',
      label: 'Test',
      slug: 'test',
    };
    repository.findBy.mockResolvedValue([tag]);

    await expect(service.getTagsByIds([1, 999])).resolves.toEqual([tag]);
  });

  it('throws NotFoundException when none of the ids exist', async () => {
    repository.findBy.mockResolvedValue([]);

    await expect(service.getTagsByIds([998, 999])).rejects.toThrow(
      `No tags found for ids: 998, 999.`,
    );
  });

  it('rejects non-integer or non-positive tag ids', async () => {
    await expect(service.getTagsByIds([1, NaN])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
    await expect(service.getTagsByIds([0])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
    await expect(service.getTagsByIds([1.5])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
  });
});

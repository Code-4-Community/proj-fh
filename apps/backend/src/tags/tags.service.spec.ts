import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Tag } from './tag.entity';
import { TagsService } from './tags.service';
import { TagCategory, TagGroup } from './types';
import { Category } from '../resources/types';

describe('TagsService', () => {
  let service: TagsService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      find: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: repository },
      ],
    }).compile();
    service = module.get(TagsService);
  });

  const tag = (id: number, overrides: Partial<Tag> = {}): Tag =>
    ({
      tag_id: id,
      category: TagCategory.FOOD_ACCESS,
      group: TagGroup.POPULATION,
      label: `Tag ${id}`,
      slug: `tag-${id}`,
      allows_free_text: false,
      is_custom: false,
      ...overrides,
    }) as Tag;

  const makeManager = () => {
    const tagRepo = {
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn((values) => values),
      save: jest.fn(async (values) => ({ ...values, tag_id: 50 })),
    };
    const manager = {
      getRepository: jest.fn(() => tagRepo),
    } as unknown as EntityManager;
    return { manager, tagRepo };
  };

  const createTagDto = {
    category: TagCategory.FOOD_ACCESS,
    group: TagGroup.POPULATION,
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
        createTagDto.group,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).resolves.toEqual(createdTag);
    expect(repository.create).toHaveBeenCalledWith(createTagDto);
    expect(repository.save).toHaveBeenCalledWith(createdTag);
  });

  it('propagates errors from the database', async () => {
    const error = new Error('Unable to create tag');
    repository.save.mockRejectedValue(error);

    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).rejects.toBe(error);
  });

  it('rejects when category is missing', async () => {
    await expect(
      service.create(
        undefined as TagCategory,
        createTagDto.group,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).rejects.toThrow('Category must be one of:');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when group is missing', async () => {
    await expect(
      service.create(
        createTagDto.category,
        undefined as TagGroup,
        createTagDto.label,
        createTagDto.slug,
      ),
    ).rejects.toThrow('Group must be one of:');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when label is missing', async () => {
    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        undefined as string,
        createTagDto.slug,
      ),
    ).rejects.toThrow('Label cannot be empty.');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when slug is missing', async () => {
    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        createTagDto.label,
        undefined as string,
      ),
    ).rejects.toThrow('Slug cannot be empty.');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank label', async () => {
    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        '   ',
        createTagDto.slug,
      ),
    ).rejects.toThrow(new BadRequestException('Label cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank slug', async () => {
    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        createTagDto.label,
        '   ',
      ),
    ).rejects.toThrow(new BadRequestException('Slug cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a slug with spaces', async () => {
    await expect(
      service.create(
        createTagDto.category,
        createTagDto.group,
        createTagDto.label,
        'invalid slug',
      ),
    ).rejects.toThrow(new BadRequestException('Slug cannot contain spaces.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns a tag when the tag id exists', async () => {
    const existingTag = tag(1);
    repository.findOneBy.mockResolvedValue(existingTag);

    await expect(service.getTagById(1)).resolves.toEqual(existingTag);

    expect(repository.findOneBy).toHaveBeenCalledWith({ tag_id: 1 });
  });

  it('rejects when a tag id cannot be found', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.getTagById(999)).rejects.toThrow(
      new NotFoundException('The tag id: 999 could not be found.'),
    );
  });

  it('returns tags when the category exists', async () => {
    const tags = [tag(1), tag(2)];
    repository.findBy.mockResolvedValue(tags);

    await expect(
      service.getTagsByCategory(TagCategory.FOOD_ACCESS),
    ).resolves.toEqual(tags);
    expect(repository.findBy).toHaveBeenCalledWith({
      category: TagCategory.FOOD_ACCESS,
    });
  });

  it('returns an empty array when no tags match the category', async () => {
    repository.findBy.mockResolvedValue([]);

    await expect(
      service.getTagsByCategory(TagCategory.HOUSING),
    ).resolves.toEqual([]);
    expect(repository.findBy).toHaveBeenCalledWith({
      category: TagCategory.HOUSING,
    });
  });

  it('rejects an invalid/nonexistent category', async () => {
    await expect(
      service.getTagsByCategory('fake_category' as TagCategory),
    ).rejects.toThrow(
      `fake_category is not a valid Category. Valid categories are: ${Object.values(TagCategory).join(', ')}.`,
    );
  });

  it('filters tags by category including optional custom status', async () => {
    repository.findBy.mockResolvedValue([tag(1)]);
    await expect(
      service.getTagsByCategory(TagCategory.FOOD_ACCESS),
    ).resolves.toEqual([tag(1)]);
    expect(repository.findBy).toHaveBeenCalledWith({
      category: TagCategory.FOOD_ACCESS,
    });
    await service.getTagsByCategory(TagCategory.COMMON, true);
    expect(repository.findBy).toHaveBeenLastCalledWith({
      category: TagCategory.COMMON,
      is_custom: true,
    });
  });

  it('gets tags by ids', async () => {
    const tags = [tag(1), tag(2)];
    repository.findBy.mockResolvedValue(tags);

    await expect(service.findByIds([1, 2])).resolves.toEqual(tags);
  });

  it('rejects an empty list of tag ids', async () => {
    await expect(service.findByIds([])).rejects.toThrow(
      'At least one tag ID is required.',
    );
  });

  it('returns only the tags that exist when some ids are missing', async () => {
    const existingTag = tag(1);
    repository.findBy.mockResolvedValue([existingTag]);

    await expect(service.findByIds([1, 999])).resolves.toEqual([existingTag]);
  });

  it('throws NotFoundException when none of the ids exist', async () => {
    repository.findBy.mockResolvedValue([]);

    await expect(service.findByIds([998, 999])).rejects.toThrow(
      'No tags found with IDs [998, 999]',
    );
  });

  it('rejects non-integer or non-positive tag ids', async () => {
    await expect(service.findByIds([1, NaN])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
    await expect(service.findByIds([0])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
    await expect(service.findByIds([1.5])).rejects.toThrow(
      'Tag IDs must be positive integers.',
    );
  });

  it('filters tags by group and optional custom status', async () => {
    const tags = [tag(1)];
    repository.find.mockResolvedValue(tags);

    await expect(
      service.getTagsByGroup(TagGroup.POPULATION, false),
    ).resolves.toEqual(tags);
    expect(repository.find).toHaveBeenCalledWith({
      where: { group: TagGroup.POPULATION, is_custom: false },
    });
  });

  it('rejects an invalid group', async () => {
    await expect(service.getTagsByGroup('bad' as TagGroup)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns existing applicable tag IDs, de-duplicated', async () => {
    const { manager, tagRepo } = makeManager();
    tagRepo.findBy.mockResolvedValue([
      tag(1),
      tag(2, { category: TagCategory.COMMON }),
    ]);

    await expect(
      service.resolveForResource(manager, Category.FOOD_ACCESS, [1, 1, 2]),
    ).resolves.toEqual([1, 2]);
    expect(tagRepo.findBy).toHaveBeenCalledWith({ tag_id: In([1, 2]) });
  });

  it('rejects tags from another category', async () => {
    const { manager, tagRepo } = makeManager();
    tagRepo.findBy.mockResolvedValue([
      tag(3, { category: TagCategory.HOUSING }),
    ]);

    await expect(
      service.resolveForResource(manager, Category.FOOD_ACCESS, [3]),
    ).rejects.toThrow('Tag ID(s) 3 do not apply to food_access resources.');
  });

  it('rejects missing tag IDs', async () => {
    const { manager, tagRepo } = makeManager();
    tagRepo.findBy.mockResolvedValue([]);

    await expect(
      service.resolveForResource(manager, Category.FOOD_ACCESS, [99]),
    ).rejects.toThrow('Tag ID(s) not found: 99.');
  });

  it('rejects multiple choices from a single-select group', async () => {
    const { manager, tagRepo } = makeManager();
    tagRepo.findBy.mockResolvedValue([
      tag(1, { group: TagGroup.FREQUENCY }),
      tag(2, { group: TagGroup.FREQUENCY }),
    ]);

    await expect(
      service.resolveForResource(manager, Category.FOOD_ACCESS, [1, 2]),
    ).rejects.toThrow('Only one tag is allowed in the frequency group.');
  });

  it('creates custom tags from the Other template and stores the resolved ID', async () => {
    const { manager, tagRepo } = makeManager();
    const template = tag(10, { allows_free_text: true, label: 'Other' });
    const custom = tag(50, {
      label: 'Other',
      slug: 'other-letter-from-landlord',
      is_custom: true,
      other_text: 'Letter from landlord',
    });
    tagRepo.findOneBy
      .mockResolvedValueOnce(template)
      .mockResolvedValueOnce(null);
    tagRepo.findBy.mockResolvedValue([custom]);

    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [
          {
            group: TagGroup.POPULATION,
            other_text: ' Letter from landlord!! ',
          },
        ],
      ),
    ).resolves.toEqual([50]);
    expect(tagRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: TagCategory.FOOD_ACCESS,
        group: TagGroup.POPULATION,
        label: 'Other',
        slug: 'other-letter-from-landlord',
        is_custom: true,
        other_text: 'Letter from landlord!!',
      }),
    );
    expect(tagRepo.save).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing custom tag with the same slug without creating another', async () => {
    const { manager, tagRepo } = makeManager();
    const template = tag(10, { allows_free_text: true, label: 'Other' });
    const existing = tag(21, {
      label: 'Other',
      slug: 'other-mobility-support',
      is_custom: true,
      other_text: 'Mobility support',
    });
    tagRepo.findOneBy
      .mockResolvedValueOnce(template)
      .mockResolvedValueOnce(existing);
    tagRepo.findBy.mockResolvedValue([existing]);

    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [{ group: TagGroup.POPULATION, other_text: 'Mobility support' }],
      ),
    ).resolves.toEqual([21]);
    expect(tagRepo.save).not.toHaveBeenCalled();
  });

  it('rejects custom text whose slug is empty', async () => {
    const { manager, tagRepo } = makeManager();
    tagRepo.findOneBy.mockResolvedValue(tag(10, { allows_free_text: true }));

    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [{ group: TagGroup.POPULATION, other_text: '💥' }],
      ),
    ).rejects.toThrow(
      'Custom tag text for group population must contain letters or numbers.',
    );
    expect(tagRepo.save).not.toHaveBeenCalled();
  });

  it('rejects malformed or inapplicable custom answers', async () => {
    const { manager, tagRepo } = makeManager();

    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [{ group: 'bad' as TagGroup, other_text: 'Something' }],
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [{ group: TagGroup.POPULATION, other_text: '   ' }],
      ),
    ).rejects.toThrow(
      'Custom tag text is required and must be at most 255 characters.',
    );

    tagRepo.findOneBy.mockResolvedValue(
      tag(10, { category: TagCategory.HOUSING, allows_free_text: true }),
    );
    await expect(
      service.resolveForResource(
        manager,
        Category.FOOD_ACCESS,
        [],
        [{ group: TagGroup.POPULATION, other_text: 'Other answer' }],
      ),
    ).rejects.toThrow(
      'The population group does not apply to food_access resources.',
    );
  });
});

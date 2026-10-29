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
  let repository: { create: jest.Mock; save: jest.Mock; findOneBy: jest.Mock; findBy: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repository = { create: jest.fn((value) => value), save: jest.fn(), findOneBy: jest.fn(), findBy: jest.fn(), find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, { provide: getRepositoryToken(Tag), useValue: repository }],
    }).compile();
    service = module.get(TagsService);
  });

  const tag = (id: number, overrides: Partial<Tag> = {}): Tag => ({
    tag_id: id, category: TagCategory.FOOD_ACCESS, group: TagGroup.POPULATION, label: `Tag ${id}`,
    slug: `tag-${id}`, sort_order: id, is_active: true, allows_free_text: false, is_custom: false,
    ...overrides,
  } as Tag);

  const makeManager = () => {
    const tagRepo = {
      findOneBy: jest.fn(), findBy: jest.fn(), create: jest.fn((values) => values),
      save: jest.fn(async (values) => ({ ...values, tag_id: 50 })),
    };
    const manager = { getRepository: jest.fn(() => tagRepo) } as unknown as EntityManager;
    return { manager, tagRepo };
  };

  describe('create', () => {
    it('creates tags with the category and enum group', async () => {
      const created = tag(1);
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      await expect(service.create(TagCategory.FOOD_ACCESS, TagGroup.POPULATION, 'Families', 'families')).resolves.toEqual(created);
      expect(repository.create).toHaveBeenCalledWith({ category: TagCategory.FOOD_ACCESS, group: TagGroup.POPULATION, label: 'Families', slug: 'families' });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('propagates database failures', async () => {
      const error = new Error('Unable to create tag');
      repository.save.mockRejectedValue(error);
      await expect(service.create(TagCategory.FOOD_ACCESS, TagGroup.POPULATION, 'Families', 'families')).rejects.toBe(error);
    });

    it.each([
      [undefined, TagGroup.POPULATION, 'label', 'slug', 'Category must be one of:'],
      [TagCategory.FOOD_ACCESS, undefined, 'label', 'slug', 'Group must be one of:'],
      ['invalid', TagGroup.POPULATION, 'label', 'slug', 'Category must be one of:'],
      [TagCategory.FOOD_ACCESS, 'invalid', 'label', 'slug', 'Group must be one of:'],
      [TagCategory.FOOD_ACCESS, TagGroup.POPULATION, ' ', 'slug', 'Label cannot be empty.'],
      [TagCategory.FOOD_ACCESS, TagGroup.POPULATION, 'Label', ' ', 'Slug cannot be empty.'],
      [TagCategory.FOOD_ACCESS, TagGroup.POPULATION, 'Label', 'bad slug', 'Slug cannot contain spaces.'],
    ])('rejects invalid tag input', async (category, group, label, slug, message) => {
      await expect(service.create(category as TagCategory, group as TagGroup, label as string, slug as string)).rejects.toThrow(message);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('retrieval', () => {
    it('gets a tag by ID and throws 404 when missing', async () => {
      repository.findOneBy.mockResolvedValueOnce(tag(4)).mockResolvedValueOnce(null);
      await expect(service.getTagById(4)).resolves.toEqual(tag(4));
      expect(repository.findOneBy).toHaveBeenCalledWith({ tag_id: 4 });
      await expect(service.getTagById(404)).rejects.toThrow(new NotFoundException('The tag id: 404 could not be found.'));
    });

    it('filters tags by category including optional custom status', async () => {
      repository.findBy.mockResolvedValue([tag(1)]);
      await expect(service.getTagsByCategory(TagCategory.FOOD_ACCESS)).resolves.toEqual([tag(1)]);
      expect(repository.findBy).toHaveBeenCalledWith({ category: TagCategory.FOOD_ACCESS });
      await service.getTagsByCategory(TagCategory.COMMON, true);
      expect(repository.findBy).toHaveBeenLastCalledWith({ category: TagCategory.COMMON, is_custom: true });
    });

    it('rejects invalid categories and filters tags by group in sort order', async () => {
      await expect(service.getTagsByCategory('bad' as TagCategory)).rejects.toThrow(BadRequestException);
      const result = [tag(2)];
      repository.find.mockResolvedValue(result);
      await expect(service.getTagsByGroup(TagGroup.POPULATION, false)).resolves.toEqual(result);
      expect(repository.find).toHaveBeenCalledWith({
        where: { group: TagGroup.POPULATION, is_custom: false }, order: { sort_order: 'ASC', tag_id: 'ASC' },
      });
      await expect(service.getTagsByGroup('bad' as TagGroup)).rejects.toThrow(BadRequestException);
    });

    it('validates tag ID lists, returns matching tags, and reports empty results as 404', async () => {
      repository.findBy.mockResolvedValueOnce([tag(1)]);
      await expect(service.findByIds([1, 2])).resolves.toEqual([tag(1)]);
      expect(repository.findBy).toHaveBeenCalledWith({ tag_id: In([1, 2]) });
      await expect(service.findByIds([])).rejects.toThrow(new BadRequestException('At least one tag ID is required.'));
      await expect(service.findByIds([0])).rejects.toThrow(new BadRequestException('Tag IDs must be positive integers.'));
      repository.findBy.mockResolvedValueOnce([]);
      await expect(service.findByIds([9])).rejects.toThrow(new NotFoundException('No tags found with IDs [9]'));
    });
  });

  describe('resolveForResource', () => {
    it('returns existing applicable active tag IDs, de-duplicated', async () => {
      const { manager, tagRepo } = makeManager();
      tagRepo.findBy.mockResolvedValue([tag(1), tag(2, { category: TagCategory.COMMON })]);
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [1, 1, 2])).resolves.toEqual([1, 2]);
      expect(tagRepo.findBy).toHaveBeenCalledWith({ tag_id: In([1, 2]) });
    });

    it('rejects tags from another category, inactive tags, and missing IDs', async () => {
      const mismatch = makeManager();
      mismatch.tagRepo.findBy.mockResolvedValue([tag(3, { category: TagCategory.HOUSING })]);
      await expect(service.resolveForResource(mismatch.manager, Category.FOOD_ACCESS, [3])).rejects.toThrow(
        'Tag ID(s) 3 do not apply to food_access resources.',
      );
      const inactive = makeManager();
      inactive.tagRepo.findBy.mockResolvedValue([tag(4, { is_active: false })]);
      await expect(service.resolveForResource(inactive.manager, Category.FOOD_ACCESS, [4])).rejects.toThrow(
        'Tag ID(s) are no longer active: 4.',
      );
      const missing = makeManager();
      missing.tagRepo.findBy.mockResolvedValue([]);
      await expect(service.resolveForResource(missing.manager, Category.FOOD_ACCESS, [99])).rejects.toThrow('Tag ID(s) not found: 99.');
    });

    it('rejects multiple choices from a single-select group', async () => {
      const { manager, tagRepo } = makeManager();
      tagRepo.findBy.mockResolvedValue([
        tag(1, { group: TagGroup.FREQUENCY }), tag(2, { group: TagGroup.FREQUENCY }),
      ]);
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [1, 2])).rejects.toThrow(
        'Only one tag is allowed in the frequency group.',
      );
    });

    it('creates custom tags from the active Other template and stores the resolved ID', async () => {
      const { manager, tagRepo } = makeManager();
      const template = tag(10, { allows_free_text: true, label: 'Other', sort_order: 8 });
      const custom = tag(50, { label: 'Other', slug: 'other-letter-from-landlord', is_custom: true, other_text: 'Letter from landlord', sort_order: 8 });
      tagRepo.findOneBy.mockResolvedValueOnce(template).mockResolvedValueOnce(null);
      tagRepo.findBy.mockResolvedValue([custom]);
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: TagGroup.POPULATION, other_text: ' Letter from landlord!! ' },
      ])).resolves.toEqual([50]);
      expect(tagRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        category: TagCategory.FOOD_ACCESS, group: TagGroup.POPULATION, label: 'Other',
        slug: 'other-letter-from-landlord', is_custom: true, other_text: 'Letter from landlord!!', sort_order: 8,
      }));
      expect(tagRepo.save).toHaveBeenCalledTimes(1);
    });

    it('reuses an existing custom tag with the same slug without creating another', async () => {
      const { manager, tagRepo } = makeManager();
      const template = tag(10, { allows_free_text: true, label: 'Other' });
      const existing = tag(21, { label: 'Other', slug: 'other-mobility-support', is_custom: true, other_text: 'Mobility support' });
      tagRepo.findOneBy.mockResolvedValueOnce(template).mockResolvedValueOnce(existing);
      tagRepo.findBy.mockResolvedValue([existing]);
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: TagGroup.POPULATION, other_text: 'Mobility support' },
      ])).resolves.toEqual([21]);
      expect(tagRepo.save).not.toHaveBeenCalled();
    });

    it('rejects custom text whose slug is empty', async () => {
      const { manager, tagRepo } = makeManager();
      tagRepo.findOneBy.mockResolvedValue(tag(10, { allows_free_text: true }));
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: TagGroup.POPULATION, other_text: '💥' },
      ])).rejects.toThrow('Custom tag text for group population must contain letters or numbers.');
      expect(tagRepo.save).not.toHaveBeenCalled();
    });

    it('rejects malformed or inapplicable custom answers', async () => {
      const { manager, tagRepo } = makeManager();
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: 'bad' as TagGroup, other_text: 'Something' },
      ])).rejects.toThrow(BadRequestException);
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: TagGroup.POPULATION, other_text: '   ' },
      ])).rejects.toThrow('Custom tag text is required and must be at most 255 characters.');
      tagRepo.findOneBy.mockResolvedValue(tag(10, { category: TagCategory.HOUSING, allows_free_text: true }));
      await expect(service.resolveForResource(manager, Category.FOOD_ACCESS, [], [
        { group: TagGroup.POPULATION, other_text: 'Other answer' },
      ])).rejects.toThrow('The population group does not apply to food_access resources.');
    });
  });
});

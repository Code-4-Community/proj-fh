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
  };

  beforeEach(async () => {
    repository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      save: jest.fn(),
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
});

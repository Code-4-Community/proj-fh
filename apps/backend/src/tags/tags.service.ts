import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { Category } from '../resources/types';
import { CustomTagDto } from '../resources/dto/create-resource.dto';
import { Tag } from './tag.entity';
import { SINGLE_SELECT_TAG_GROUPS, TagCategory, TagGroup } from './types';

/** Groups whose tags are Yes/Unsure(/Inapplicable) answers to table rows; a row may have only one answer. */
const ROW_TAG_GROUPS: ReadonlySet<TagGroup> = new Set([
  TagGroup.ACCESSIBILITY,
  TagGroup.CULTURAL_COMPETENCY,
  TagGroup.PROGRAM_OBSERVATION,
]);

const ROW_ANSWER_SUFFIXES = ['-unsure', '-inapplicable'];

/**
 * The TagsService is a NestJS service that provides business logic for managing tags in the system.
 * It interacts with the database through the injected repository of the Tag entity, allowing for operations such as creating and retrieving.
 */
@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private repo: Repository<Tag>) {}

  /**
   * Validates the input for creating a new tag.
   * @param category The category of the tag.
   * @param group The group of the tag.
   * @param label The label of the tag.
   * @param slug The slug of the tag.
   */
  private validateCreateTagDto(
    category: TagCategory,
    group: TagGroup,
    label: string,
    slug: string,
  ) {
    if (!Object.values(TagCategory).includes(category)) {
      throw new BadRequestException(
        `Category must be one of: ${Object.values(TagCategory).join(', ')}.`,
      );
    }

    if (!Object.values(TagGroup).includes(group)) {
      throw new BadRequestException(
        `Group must be one of: ${Object.values(TagGroup).join(', ')}.`,
      );
    }

    if (!label || label.trim() === '') {
      throw new BadRequestException('Label cannot be empty.');
    }

    if (!slug || slug.trim() === '') {
      throw new BadRequestException('Slug cannot be empty.');
    }

    if (slug.includes(' ')) {
      throw new BadRequestException('Slug cannot contain spaces.');
    }
  }

  /**
   * Creates a new tag in the system with the specified category, group, label, and slug.
   * @param category The category of the tag, which is an enumerated value defined in the TagCategory enum.
   * @param group The group (form question) of the tag, which is an enumerated value defined in the TagGroup enum.
   * @param label The label of the tag, which is a string representing the name or title of the tag.
   * @param slug The slug of the tag, which is a string used for URL-friendly representation of the tag. Unique within its group.
   *
   * @returns A promise that resolves to the newly created Tag entity.
   */
  async create(
    category: TagCategory,
    group: TagGroup,
    label: string,
    slug: string,
  ) {
    this.validateCreateTagDto(category, group, label, slug);

    return this.repo.save(this.repo.create({ category, group, label, slug }));
  }

  /**
   * Gets a tag by its id.
   * @param tagId The unique id associated with a tag, which is the PK of tag table.
   *
   * @returns A tag with all its associated info.
   */
  async getTagById(tagId: number) {
    const tag = await this.repo.findOneBy({ tag_id: tagId });
    if (!tag) {
      throw new NotFoundException(`The tag id: ${tagId} could not be found.`);
    }
    return tag;
  }

  /**
   * Retrieves tags by their IDs. IDs that don't exist are skipped.
   *
   * @param ids the IDs of the tags to retrieve (pass a single-item array for one tag)
   * @returns the tags matching the given IDs
   * @throws BadRequestException if no IDs are provided or any ID is not a positive integer
   * @throws NotFoundException if none of the IDs match a tag
   */
  async findByIds(ids: number[]): Promise<Tag[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('At least one tag ID is required.');
    }

    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('Tag IDs must be positive integers.');
    }

    const tags = await this.repo.findBy({ tag_id: In(ids) });

    if (tags.length === 0) {
      throw new NotFoundException(`No tags found with IDs [${ids.join(', ')}]`);
    }

    return tags;
  }

  /**
   * Gets (multiple) tags by their category.
   * @param category A valid TagCategory used to filter the tags.
   * @param isCustom Optional. When given, only custom (true) or only seeded (false) tags are returned.
   * When omitted, every tag in the category is returned.
   *
   * @returns An array of tags.
   */
  async getTagsByCategory(category: TagCategory, isCustom?: boolean) {
    if (!Object.values(TagCategory).includes(category)) {
      throw new BadRequestException(
        `${category} is not a valid Category. Valid categories are: ${Object.values(TagCategory).join(', ')}.`,
      );
    }

    return this.repo.findBy({
      category,
      ...(isCustom === undefined ? {} : { is_custom: isCustom }),
    });
  }

  /**
   * Gets (multiple) tags by their group.
   * @param group A valid TagGroup used to filter the tags.
   * @param isCustom Optional. When given, only custom (true) or only seeded (false) tags are returned.
   * When omitted, every tag in the group is returned.
   *
   * @returns An array of tags.
   */
  async getTagsByGroup(group: TagGroup, isCustom?: boolean) {
    if (!Object.values(TagGroup).includes(group)) {
      throw new BadRequestException(
        `${group} is not a valid group. Valid groups are: ${Object.values(TagGroup).join(', ')}.`,
      );
    }

    return this.repo.find({
      where: {
        group,
        ...(isCustom === undefined ? {} : { is_custom: isCustom }),
      },
      order: { sort_order: 'ASC', tag_id: 'ASC' },
    });
  }

  /**
   * Turns the tags a resource is submitted with into the final list of tag IDs to store on it,
   * and checks that the list is allowed for the resource's category. Runs on the given manager
   * so it can take part in the caller's transaction.
   *
   * - Each custom tag is created from its group's "Other" template tag, or reused if a custom tag
   * with the same text already exists in that group.
   * - Every tag must exist, be active, not be a template "Other" tag, and be `common` or match the resource's category.
   * - Single-select groups allow at most one tag, and each Yes/Unsure/Inapplicable row allows at most one answer.
   *
   * @param manager The entity manager (usually of the caller's transaction).
   * @param category The category of the resource the tags are for.
   * @param tagIds IDs of existing tags.
   * @param customTags Custom "Other" answers.
   *
   * @returns The de-duplicated list of tag IDs to store on the resource.
   * @throws BadRequestException naming the first rule that fails.
   */
  async resolveForResource(
    manager: EntityManager,
    category: Category,
    tagIds: number[],
    customTags: CustomTagDto[] = [],
  ): Promise<number[]> {
    const tagRepo = manager.getRepository(Tag);
    const allowed: string[] = [TagCategory.COMMON, category];

    const customIds: number[] = [];
    for (const custom of customTags) {
      if (!Object.values(TagGroup).includes(custom?.group)) {
        throw new BadRequestException(
          `Custom tag group must be one of: ${Object.values(TagGroup).join(', ')}.`,
        );
      }
      const otherText =
        typeof custom.other_text === 'string' ? custom.other_text.trim() : '';
      if (!otherText || otherText.length > 255) {
        throw new BadRequestException(
          'Custom tag text is required and must be at most 255 characters.',
        );
      }

      const template = await tagRepo.findOneBy({
        group: custom.group,
        allows_free_text: true,
        is_active: true,
      });
      if (!template) {
        throw new BadRequestException(
          `The ${custom.group} group does not accept custom text.`,
        );
      }
      if (!allowed.includes(template.category)) {
        throw new BadRequestException(
          `The ${custom.group} group does not apply to ${category} resources.`,
        );
      }

      const textSlug = slugify(otherText);
      if (!textSlug) {
        throw new BadRequestException(
          `Custom tag text for group ${custom.group} must contain letters or numbers.`,
        );
      }
      const slug = `other-${textSlug}`;
      const existing = await tagRepo.findOneBy({ group: custom.group, slug });
      const tag =
        existing ??
        (await tagRepo.save(
          tagRepo.create({
            category: template.category,
            group: custom.group,
            label: template.label,
            slug,
            sort_order: template.sort_order,
            is_custom: true,
            other_text: otherText,
          }),
        ));
      customIds.push(tag.tag_id);
    }

    const ids = [...new Set([...tagIds, ...customIds])];
    const tags =
      ids.length > 0 ? await tagRepo.findBy({ tag_id: In(ids) }) : [];

    const found = new Set(tags.map((tag) => tag.tag_id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Tag ID(s) not found: ${missing.join(', ')}.`,
      );
    }

    const inactive = tags.filter((tag) => !tag.is_active);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Tag ID(s) are no longer active: ${inactive.map((tag) => tag.tag_id).join(', ')}.`,
      );
    }

    const templates = tags.filter((tag) => tag.allows_free_text);
    if (templates.length > 0) {
      throw new BadRequestException(
        `Tag ID(s) ${templates.map((tag) => tag.tag_id).join(', ')} are "Other" options and must be sent as custom_tags with text.`,
      );
    }

    const wrongCategory = tags.filter((tag) => !allowed.includes(tag.category));
    if (wrongCategory.length > 0) {
      throw new BadRequestException(
        `Tag ID(s) ${wrongCategory.map((tag) => tag.tag_id).join(', ')} do not apply to ${category} resources.`,
      );
    }

    const seenGroups = new Set<TagGroup>();
    const seenRows = new Set<string>();
    for (const tag of tags) {
      if (SINGLE_SELECT_TAG_GROUPS.has(tag.group)) {
        if (seenGroups.has(tag.group)) {
          throw new BadRequestException(
            `Only one tag is allowed in the ${tag.group} group.`,
          );
        }
        seenGroups.add(tag.group);
      }

      if (ROW_TAG_GROUPS.has(tag.group)) {
        const row = `${tag.group}:${rowSlug(tag.slug)}`;
        if (seenRows.has(row)) {
          throw new BadRequestException(
            `Only one answer (yes, unsure or inapplicable) is allowed per row in ${tag.group}: ${rowSlug(tag.slug)}.`,
          );
        }
        seenRows.add(row);
      }
    }

    return ids;
  }
}

/** Lowercases text and joins its words with dashes. E.g. 'Letter from landlord' -> 'letter-from-landlord' */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The slug of a Yes/Unsure/Inapplicable tag without its answer suffix, which identifies its table row. */
function rowSlug(slug: string): string {
  const suffix = ROW_ANSWER_SUFFIXES.find((candidate) =>
    slug.endsWith(candidate),
  );
  return suffix ? slug.slice(0, -suffix.length) : slug;
}

import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ArrayContains, In, Repository } from 'typeorm';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { Score } from '../score/score.entity';
import { TagsService } from '../tags/tags.service';
import { TagGroup } from '../tags/types';
import { Category, County, Recommendation, ResponseTime, ReviewStatus, YesNoMaybe } from './types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';

const createDto: CreateResourceDto = {
  organization_name: 'Greater Boston Food Bank',
  program_name: 'Community Food Pantry',
  category: Category.FOOD_ACCESS,
  county: County.SUFFOLK,
  zip_code: '02115',
  last_verified_date: '2026-10-05',
  outreach_date: '2026-10-01',
  staff_contact_name: 'Sam Lee',
  staff_contact_role: 'Program Manager',
  responsiveness: 4,
  response_time: ResponseTime.SAME_DAY,
  interaction_notes: 'Responded promptly.',
  accessibility_notes: 'Near public transit.',
  red_flag_concerns: 'None noted.',
  can_refer_directly: true,
  has_referral_contact: true,
  provides_followup: false,
  referral_realistic: YesNoMaybe.YES,
  referral_notes: 'Email the program.',
  recommendation: Recommendation.STRONGLY_RECOMMEND,
  strengths: 'Welcoming staff.',
  followup_needed: 'Confirm hours next quarter.',
  overall_rating: 5,
  tags: [1],
};

const makeResource = (id: number): Resource => ({
  resource_id: id, score_id: 12, organization_name: `Organization ${id}`, program_name: `Program ${id}`,
  category: Category.FOOD_ACCESS, county: County.SUFFOLK, zip_code: '02115',
  last_verified_date: new Date('2026-10-05'), outreach_date: new Date('2026-10-01'),
  staff_contact_name: 'Sam Lee', staff_contact_role: 'Manager', responsiveness: 4,
  response_time: ResponseTime.SAME_DAY, interaction_notes: 'Prompt response.', accessibility_notes: 'Accessible.',
  red_flag_concerns: 'None.', can_refer_directly: true, has_referral_contact: true, provides_followup: false,
  referral_realistic: YesNoMaybe.YES, referral_notes: 'Call first.', recommendation: Recommendation.STRONGLY_RECOMMEND,
  strengths: 'Helpful staff.', followup_needed: 'None.', tags: [1],
} as Resource);

describe('ResourcesService', () => {
  let service: ResourcesService;
  let repository: { manager: { transaction: jest.Mock }; find: jest.Mock };
  let manager: { create: jest.Mock; save: jest.Mock; findOneBy: jest.Mock; update: jest.Mock };
  let tagsService: { resolveForResource: jest.Mock };

  beforeEach(() => {
    manager = { create: jest.fn((_entity, values) => values), save: jest.fn(), findOneBy: jest.fn(), update: jest.fn() };
    repository = {
      manager: { transaction: jest.fn((callback: (tx: typeof manager) => unknown) => callback(manager)) },
      find: jest.fn(),
    };
    tagsService = { resolveForResource: jest.fn().mockResolvedValue([1]) };
    service = new ResourcesService(repository as unknown as Repository<Resource>, tagsService as unknown as TagsService);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('saves the resource, score, resolved tags, and completed_by name in one transaction', async () => {
      const score = { score_id: 12, overall_rating: 5 };
      const saved = { resource_id: 8, ...createDto, score_id: 12, tags: [1], review_status: ReviewStatus.PENDING_REVIEW, completed_by: 'Jane Doe' };
      manager.save.mockResolvedValueOnce(score).mockResolvedValueOnce(saved);
      await expect(service.create(createDto, 'Jane Doe')).resolves.toEqual(saved);
      expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
      expect(tagsService.resolveForResource).toHaveBeenCalledWith(manager, Category.FOOD_ACCESS, [1], undefined);
      expect(manager.create).toHaveBeenNthCalledWith(1, Score, { overall_rating: 5 });
      expect(manager.create).toHaveBeenNthCalledWith(2, Resource, expect.objectContaining({
        organization_name: createDto.organization_name, program_name: createDto.program_name, category: Category.FOOD_ACCESS,
        score_id: 12, review_status: ReviewStatus.PENDING_REVIEW, completed_by: 'Jane Doe', tags: [1],
      }));
      expect(manager.save).toHaveBeenNthCalledWith(1, { overall_rating: 5 });
      expect(manager.save).toHaveBeenNthCalledWith(2, expect.objectContaining({ score_id: 12, completed_by: 'Jane Doe' }));
    });

    it('passes custom tags through resolution', async () => {
      const dto = { ...createDto, tags: [], custom_tags: [{ group: TagGroup.POPULATION, other_text: 'New group' }] };
      manager.save.mockResolvedValueOnce({ score_id: 3 }).mockResolvedValueOnce({ resource_id: 4 });
      await service.create(dto, 'Jane Doe');
      expect(tagsService.resolveForResource).toHaveBeenCalledWith(manager, Category.FOOD_ACCESS, [], dto.custom_tags);
      expect(manager.create).toHaveBeenLastCalledWith(Resource, expect.objectContaining({ completed_by: 'Jane Doe' }));
    });

    it('rejects invalid required form fields before opening a transaction', async () => {
      await expect(service.create({ ...createDto, program_name: ' ' }, 'Jane Doe')).rejects.toThrow(
        new BadRequestException('Program name is required and must be at most 255 characters.'),
      );
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    it('preserves tag validation errors and wraps database failures as 500', async () => {
      tagsService.resolveForResource.mockRejectedValueOnce(new BadRequestException('Tag does not apply.'));
      await expect(service.create(createDto, 'Jane Doe')).rejects.toThrow(new BadRequestException('Tag does not apply.'));
      manager.save.mockRejectedValueOnce(new Error('database unavailable'));
      await expect(service.create(createDto, 'Jane Doe')).rejects.toThrow(new InternalServerErrorException(
        'Failed to save the resource to the database. Please try again later.',
      ));
    });
  });

  describe('update', () => {
    it('updates supplied fields transactionally and updates the linked score', async () => {
      const resource = makeResource(5);
      manager.findOneBy.mockResolvedValue(resource);
      const updated = { ...resource, phone: '617-555-0100' };
      manager.save.mockResolvedValue(updated);
      await expect(service.update(5, { phone: '617-555-0100', overall_rating: 3 })).resolves.toEqual(updated);
      expect(manager.update).toHaveBeenCalledWith(Score, { score_id: 12 }, { overall_rating: 3 });
      expect(manager.save).toHaveBeenCalledWith(Resource, expect.objectContaining({ phone: '617-555-0100' }));
    });

    it('re-resolves tags when category or tags change', async () => {
      manager.findOneBy.mockResolvedValue(makeResource(2));
      manager.save.mockImplementation((_entity, value) => value);
      await service.update(2, { category: Category.HOUSING, tags: [7] });
      expect(tagsService.resolveForResource).toHaveBeenCalledWith(manager, Category.HOUSING, [7], undefined);
    });

    it('rejects empty and invalid updates without querying', async () => {
      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
      await expect(service.update(1, { responsiveness: 6 })).rejects.toThrow(
        new BadRequestException('Responsiveness must be an integer from 1 to 5.'),
      );
      expect(manager.findOneBy).not.toHaveBeenCalled();
    });

    it('returns 404 for a missing resource and wraps database errors as 500', async () => {
      manager.findOneBy.mockResolvedValueOnce(null);
      await expect(service.update(99, { program_name: 'Changed' })).rejects.toThrow(
        new NotFoundException('Resource with id 99 was not found.'),
      );
      manager.findOneBy.mockRejectedValueOnce(new Error('offline'));
      await expect(service.update(1, { program_name: 'Changed' })).rejects.toThrow(
        new InternalServerErrorException('Failed to update resource 1'),
      );
    });
  });

  describe('findByIds and find', () => {
    it('finds resources by IDs and returns 404 when no IDs match', async () => {
      repository.find.mockResolvedValueOnce([makeResource(1)]);
      await expect(service.findByIds([1])).resolves.toEqual([expect.objectContaining({ resource_id: 1 })]);
      expect(repository.find).toHaveBeenCalledWith({ where: { resource_id: In([1]) } });
      repository.find.mockResolvedValueOnce([]);
      await expect(service.findByIds([9])).rejects.toThrow(NotFoundException);
    });

    it('queries searchable fields and wraps repository errors', async () => {
      repository.find.mockResolvedValueOnce([makeResource(1)]);
      await expect(service.find({ tags: [1], county: County.SUFFOLK })).resolves.toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({ where: { tags: ArrayContains([1]), county: County.SUFFOLK } });
      repository.find.mockRejectedValueOnce(new Error('offline'));
      await expect(service.find({ county: County.SUFFOLK })).rejects.toThrow(InternalServerErrorException);
    });

    it('rejects invalid search fields and returns 404 for no matches', async () => {
      await expect(service.find({ category: 'unknown' } as unknown as FindResourceQueryDto)).rejects.toThrow(BadRequestException);
      expect(repository.find).not.toHaveBeenCalled();
      repository.find.mockResolvedValueOnce([]);
      await expect(service.find({ organization_name: 'Missing' })).rejects.toThrow(
        new NotFoundException('No resources found matching the given fields.'),
      );
    });
  });
});

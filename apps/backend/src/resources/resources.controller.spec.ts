import { BadRequestException, ForbiddenException, HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Category, County, Recommendation, ResponseTime, YesNoMaybe } from './types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';

const dto: CreateResourceDto = {
  organization_name: 'Pine Street Inn', program_name: 'Housing Support', category: Category.HOUSING,
  county: County.SUFFOLK, zip_code: '02118', last_verified_date: '2026-10-05', outreach_date: '2026-10-01',
  staff_contact_name: 'Alex Kim', staff_contact_role: 'Coordinator', responsiveness: 4,
  response_time: ResponseTime.SAME_DAY, interaction_notes: 'Prompt response.', accessibility_notes: 'Accessible.',
  red_flag_concerns: 'None.', can_refer_directly: true, has_referral_contact: true, provides_followup: false,
  referral_realistic: YesNoMaybe.YES, referral_notes: 'Call first.', recommendation: Recommendation.STRONGLY_RECOMMEND,
  strengths: 'Helpful staff.', followup_needed: 'Confirm hours.', overall_rating: 5, tags: [],
};

const makeResource = (id: number): Resource => ({
  resource_id: id, score_id: 1, organization_name: `Organization ${id}`, program_name: `Program ${id}`,
  category: Category.HOUSING, county: County.SUFFOLK, zip_code: '02118', tags: [],
} as Resource);

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: { create: jest.Mock; update: jest.Mock; findByIds: jest.Mock; find: jest.Mock };
  let usersService: { findByEmail: jest.Mock };
  const request = { user: { email: 'reviewer@example.org' } };

  beforeEach(() => {
    service = { create: jest.fn(), update: jest.fn(), findByIds: jest.fn(), find: jest.fn() };
    usersService = { findByEmail: jest.fn() };
    controller = new ResourcesController(service as unknown as ResourcesService, usersService as unknown as UsersService);
  });

  describe('create', () => {
    it('requires JwtAuthGuard and responds with 201', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, ResourcesController.prototype.create)).toContain(JwtAuthGuard);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, ResourcesController.prototype.create)).toBe(HttpStatus.CREATED);
    });

    it('looks up the authenticated user and sends their ID to the service', async () => {
      const saved = { resource_id: 1, ...dto } as Resource;
      usersService.findByEmail.mockResolvedValue({ id: 21, firstName: 'Jane', lastName: 'Doe', email: request.user.email });
      service.create.mockResolvedValue(saved);
      await expect(controller.create(dto, request)).resolves.toEqual(saved);
      expect(usersService.findByEmail).toHaveBeenCalledWith('reviewer@example.org');
      expect(service.create).toHaveBeenCalledWith(dto, 'Jane Doe');
    });

    it('returns 403 if no user record matches the token email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(controller.create(dto, request)).rejects.toThrow(
        new ForbiddenException('No user record exists for reviewer@example.org.'),
      );
      expect(service.create).not.toHaveBeenCalled();
    });

    it('returns 403 when the token has no email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(controller.create(dto, { user: {} })).rejects.toThrow(ForbiddenException);
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it.each([
      ['validation', new BadRequestException('Program name is required.')],
      ['database', new InternalServerErrorException('Failed to save resource.')],
    ])('forwards %s errors from the resource service', async (_label, error) => {
      usersService.findByEmail.mockResolvedValue({ id: 21, firstName: 'Jane', lastName: 'Doe' });
      service.create.mockRejectedValue(error);
      await expect(controller.create(dto, request)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const changes: UpdateResourceDto = { program_name: 'Updated program' };
    it('returns the updated resource and forwards its arguments', async () => {
      const updated = { ...makeResource(1), ...changes };
      service.update.mockResolvedValue(updated);
      await expect(controller.update(1, changes)).resolves.toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, changes);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, ResourcesController.prototype.update)).toBe(HttpStatus.OK);
    });

    it.each([
      new BadRequestException('Invalid field.'),
      new NotFoundException('Missing resource.'),
      new InternalServerErrorException('Database failure.'),
    ])('forwards update errors', async (error) => {
      service.update.mockRejectedValue(error);
      await expect(controller.update(1, changes)).rejects.toThrow(error);
    });
  });

  describe('findByIds and find', () => {
    it('delegates findByIds and preserves the 200 status', async () => {
      service.findByIds.mockResolvedValue([makeResource(1)]);
      await expect(controller.findByIds([1])).resolves.toEqual([expect.objectContaining({ resource_id: 1 })]);
      expect(service.findByIds).toHaveBeenCalledWith([1]);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, ResourcesController.prototype.findByIds)).toBe(HttpStatus.OK);
    });

    it('delegates find with the new single-category query shape', async () => {
      const query: FindResourceQueryDto = { category: Category.HOUSING, county: County.SUFFOLK };
      service.find.mockResolvedValue([makeResource(2)]);
      await expect(controller.find(query)).resolves.toEqual([expect.objectContaining({ resource_id: 2 })]);
      expect(service.find).toHaveBeenCalledWith(query);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, ResourcesController.prototype.find)).toBe(HttpStatus.OK);
    });

    it.each([
      ['not found', new NotFoundException('No resources found.')],
      ['validation', new BadRequestException('Invalid query.')],
      ['database', new InternalServerErrorException('Database failure.')],
    ])('forwards %s errors from retrieval methods', async (_label, error) => {
      service.findByIds.mockRejectedValue(error);
      await expect(controller.findByIds([999])).rejects.toThrow(error);
      service.find.mockRejectedValue(error);
      await expect(controller.find({})).rejects.toThrow(error);
    });
  });
});

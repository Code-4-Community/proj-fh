import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TagsService } from '../tags/tags.service';
import {
  Category,
  County,
  Recommendation,
  ResponseTime,
  YesNoMaybe,
} from './types';
import { FindResourceQueryDto } from './dto/find-resource-by-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

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
    review_status: 'pending_review',
    tags: [],
  }) as Resource;

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: ResourcesService;
  let usersService: { findByEmail: jest.Mock };
  const request = { user: { email: 'reviewer@example.org' } };

  beforeEach(() => {
    service = new ResourcesService(
      {} as Repository<Resource>,
      {} as TagsService,
    );
    usersService = { findByEmail: jest.fn() };
    controller = new ResourcesController(
      service,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const dto: CreateResourceDto = {
    organization_name: 'Pine Street Inn',
    program_name: 'Housing Support',
    category: Category.HOUSING,
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

  describe('create', () => {
    it('responds with a 201 status code', () => {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          ResourcesController.prototype.create,
        ),
      ).toContain(JwtAuthGuard);
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          ResourcesController.prototype.create,
        ),
      ).toBe(HttpStatus.CREATED);
    });

    it('returns the resource created by the service', async () => {
      const saved = { resource_id: 1, ...dto } as Resource;
      const create = jest.spyOn(service, 'create').mockResolvedValue(saved);
      usersService.findByEmail.mockResolvedValue({
        firstName: 'Jane',
        lastName: 'Doe',
      });

      await expect(controller.create(dto, request)).resolves.toEqual(saved);
      expect(create).toHaveBeenCalledWith(dto, 'Jane Doe');
    });

    it('rejects a request without a matching user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(controller.create(dto, request)).rejects.toThrow(
        new ForbiddenException(
          'No user record exists for reviewer@example.org.',
        ),
      );
    });

    it('forwards validation errors from the service', async () => {
      const error = new BadRequestException(
        'Zip code must be a 5-digit or ZIP+4 code.',
      );
      usersService.findByEmail.mockResolvedValue({
        firstName: 'Jane',
        lastName: 'Doe',
      });
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(dto, request)).rejects.toThrow(error);
    });

    it('forwards database errors from the service', async () => {
      const error = new InternalServerErrorException(
        'Failed to save the resource to the database. Please try again later.',
      );
      usersService.findByEmail.mockResolvedValue({
        firstName: 'Jane',
        lastName: 'Doe',
      });
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(dto, request)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const changes: UpdateResourceDto = { phone: '(617) 555-0100' };

    // POST defaults to 201 Created, so this checks the @HttpCode(200) override is applied.
    it('responds with a 200 status code', () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          ResourcesController.prototype.update,
        ),
      ).toBe(HttpStatus.OK);
    });

    it('returns the full updated resource from the service', async () => {
      const updated = {
        resource_id: 1,
        ...dto,
        phone: '(617) 555-0100',
        score_id: 12,
        completed_by: 'Jane Doe',
        review_status: 'pending_review',
        last_verified_date: new Date('2026-10-01'),
        tags: [],
      } as Resource;
      const update = jest.spyOn(service, 'update').mockResolvedValue(updated);

      await expect(controller.update(1, changes)).resolves.toEqual(updated);
      expect(update).toHaveBeenCalledWith(1, changes);
    });

    it.each([
      [
        'validation',
        new BadRequestException('Zip code must be a 5-digit or ZIP+4 code.'),
      ],
      ['not found', new NotFoundException('Resource with id 1 was not found.')],
      [
        'database',
        new InternalServerErrorException(
          'Failed to update the resource in the database. Please try again later.',
        ),
      ],
    ])('forwards %s errors from the service', async (_, error) => {
      jest.spyOn(service, 'update').mockRejectedValue(error);

      await expect(controller.update(1, changes)).rejects.toThrow(error);
    });
  });

  /** Tests for POST /resources/findByIds. */
  describe('findByIds', () => {
    // POST defaults to 201 Created, so this checks the @HttpCode(200) override is applied.
    it('responds with a 200 status code', () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          ResourcesController.prototype.findByIds,
        ),
      ).toBe(HttpStatus.OK);
    });

    it('retrieves single resource by ID', async () => {
      const ids = [1];
      const found = [makeResource(1)];
      const findByIds = jest
        .spyOn(service, 'findByIds')
        .mockResolvedValue(found);

      await expect(controller.findByIds(ids)).resolves.toEqual(found);
      expect(findByIds).toHaveBeenCalledWith(ids);
    });

    it('retrieves multiple resources from list of IDs', async () => {
      const ids = [1, 2, 3];
      const found = ids.map(makeResource);
      const findByIds = jest
        .spyOn(service, 'findByIds')
        .mockResolvedValue(found);

      await expect(controller.findByIds(ids)).resolves.toEqual(found);
      expect(findByIds).toHaveBeenCalledWith(ids);
    });

    it('forwards not-found error from the service', async () => {
      jest
        .spyOn(service, 'findByIds')
        .mockRejectedValue(
          new NotFoundException('No resources found with IDs [123]'),
        );

      await expect(controller.findByIds([123])).rejects.toThrow(
        new NotFoundException('No resources found with IDs [123]'),
      );
    });

    it('forwards database error from the service', async () => {
      jest
        .spyOn(service, 'findByIds')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to retrieve resources from the database. Please try again later.',
          ),
        );

      await expect(controller.findByIds([1])).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to retrieve resources from the database. Please try again later.',
        ),
      );
    });
  });

  /** Tests for POST /resources/find. */
  describe('find', () => {
    it('responds with a 200 status code', () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          ResourcesController.prototype.find,
        ),
      ).toBe(HttpStatus.OK);
    });

    it('retrieves resources matching query', async () => {
      const query: FindResourceQueryDto = {
        category: Category.FOOD_ACCESS,
        county: County.SUFFOLK,
      };
      const found = [makeResource(1), makeResource(2)];
      const find = jest.spyOn(service, 'find').mockResolvedValue(found);

      await expect(controller.find(query)).resolves.toEqual(found);
      expect(find).toHaveBeenCalledWith(query);
    });

    it('forwards not-found error from the service', async () => {
      jest
        .spyOn(service, 'find')
        .mockRejectedValue(
          new NotFoundException(
            'No resources found matching the given fields.',
          ),
        );

      await expect(controller.find({ zip_code: '00000' })).rejects.toThrow(
        new NotFoundException('No resources found matching the given fields.'),
      );
    });

    it('forwards an invalid category error from the service', async () => {
      jest
        .spyOn(service, 'find')
        .mockRejectedValue(
          new BadRequestException('Unknown category: [NOT_A_CATEGORY]'),
        );

      await expect(
        controller.find({
          category: 'NOT_A_CATEGORY' as Category,
        }),
      ).rejects.toThrow(
        new BadRequestException('Unknown category: [NOT_A_CATEGORY]'),
      );
    });

    it('forwards database error from the service', async () => {
      jest
        .spyOn(service, 'find')
        .mockRejectedValue(
          new InternalServerErrorException(
            'Failed to retrieve resources: connection lost',
          ),
        );

      await expect(controller.find({})).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to retrieve resources: connection lost',
        ),
      );
    });
  });
});

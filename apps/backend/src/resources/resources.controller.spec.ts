import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { Repository } from 'typeorm';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Category, County } from './types';
import { UpdateResourceDto } from './dto/update-resource.dto';

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: ResourcesService;

  beforeEach(() => {
    service = new ResourcesService({} as Repository<Resource>);
    controller = new ResourcesController(service);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const dto: CreateResourceDto = {
    name: 'Pine Street Inn',
    category: [Category.HOUSING],
    county: County.SUFFOLK,
    zip_code: '02118',
  };

  describe('create', () => {
    it('responds with a 200 status code', () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          ResourcesController.prototype.create,
        ),
      ).toBe(HttpStatus.OK);
    });

    it('returns the resource created by the service', async () => {
      const saved = { resource_id: 1, ...dto } as Resource;
      const create = jest.spyOn(service, 'create').mockResolvedValue(saved);

      await expect(controller.create(dto)).resolves.toEqual(saved);
      expect(create).toHaveBeenCalledWith(dto);
    });

    it('forwards validation errors from the service', async () => {
      const error = new BadRequestException(
        'Zip code must be a 5-digit or ZIP+4 code.',
      );
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });

    it('forwards database errors from the service', async () => {
      const error = new InternalServerErrorException(
        'Failed to save the resource to the database. Please try again later.',
      );
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const changes: UpdateResourceDto = { phone: '(617) 555-0100' };

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
        score_id: 0,
        vetting_status: 'pending review',
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
});

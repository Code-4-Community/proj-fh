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
import { Category, County } from './types';

/** Builds a resource with the given ID for use as a test fixture. */
const makeResource = (id: number): Resource =>
  ({
    resource_id: id,
    score_id: 1,
    name: `Resource ${id}`,
    category: [Category.FOOD_ACCESS],
    county: County.SUFFOLK,
    zip_code: '02115',
    last_verified_date: new Date('2026-01-15'),
    vetting_status: 'verified',
    tags: [],
  }) as Resource;

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

  describe('findByIds', () => {
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
        .mockRejectedValue(new NotFoundException('No resources found with IDs [123]'));

      await expect(controller.findByIds([123])).rejects.toThrow(
        new NotFoundException('No resources found with IDs [123]'));
    }); 

    it('forwards database error from the service', async () => {
      jest
        .spyOn(service, 'findByIds')
        .mockRejectedValue(new InternalServerErrorException('Failed to retrieve resources with IDs [1]: connection lost'));

      await expect(controller.findByIds([1])).rejects.toThrow(
        new InternalServerErrorException('Failed to retrieve resources with IDs [1]: connection lost'));
    }); 
  });

});
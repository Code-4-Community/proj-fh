import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Category, County } from './types';

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [{ provide: ResourcesService, useValue: service }],
    }).compile();

    controller = module.get(ResourcesController);
  });

  it('delegates create to the service', async () => {
    const dto: CreateResourceDto = {
      name: 'Pine Street Inn',
      category: [Category.HOUSING],
      county: County.SUFFOLK,
      zip_code: '02118',
    };
    const saved = { resource_id: 1, ...dto };
    service.create.mockResolvedValue(saved);

    await expect(controller.create(dto)).resolves.toEqual(saved);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});

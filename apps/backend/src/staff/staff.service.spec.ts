import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Staff } from './staff.entity';
import { StaffService } from './staff.service';
import { Type } from './types';

describe('StaffService', () => {
  let service: StaffService;
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
        StaffService,
        {
          provide: getRepositoryToken(Staff),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(StaffService);
  });

  const createStaffDto = {
    email: 'jane.doe@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    type: Type.STANDARD,
  };

  it('creates a staff user', async () => {
    const createdStaff = { id: 1, ...createStaffDto };
    repository.create.mockReturnValue(createdStaff);
    repository.save.mockResolvedValue(createdStaff);

    await expect(
      service.create(
        createStaffDto.email,
        createStaffDto.firstName,
        createStaffDto.lastName,
      ),
    ).resolves.toEqual(createdStaff);
    expect(repository.create).toHaveBeenCalledWith(createdStaff);
    expect(repository.save).toHaveBeenCalledWith(createdStaff);
  });

  it('propagates errors from the database', async () => {
    const error = new Error('Unable to create staff user');
    repository.save.mockRejectedValue(error);

    await expect(
      service.create(
        createStaffDto.email,
        createStaffDto.firstName,
        createStaffDto.lastName,
      ),
    ).rejects.toBe(error);
  });

  it('rejects when email is missing', async () => {
    await expect(
      service.create(// @ts-expect-error Intentionally passing a missing email to test validation.
        undefined,
        createStaffDto.firstName,
        createStaffDto.lastName,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Email, first name, last name, and type are required to create a staff user.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when first name is missing', async () => {
    await expect(
      // @ts-expect-error Intentionally passing a missing email to test validation.
      service.create(createStaffDto.email, undefined, createStaffDto.lastName),
    ).rejects.toThrow(
      new BadRequestException(
        'Email, first name, last name, and type are required to create a staff user.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when last name is missing', async () => {
    await expect(
      // @ts-expect-error Intentionally passing a missing email to test validation.
      service.create(createStaffDto.email, createStaffDto.firstName, undefined),
    ).rejects.toThrow(
      new BadRequestException(
        'Email, first name, last name, and type are required to create a staff user.',
      ),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank email', async () => {
    await expect(
      service.create('   ', createStaffDto.firstName, createStaffDto.lastName),
    ).rejects.toThrow(new BadRequestException('Email cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank first name', async () => {
    await expect(
      service.create(createStaffDto.email, '   ', createStaffDto.lastName),
    ).rejects.toThrow(new BadRequestException('First name cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a blank last name', async () => {
    await expect(
      service.create(createStaffDto.email, createStaffDto.firstName, '   '),
    ).rejects.toThrow(new BadRequestException('Last name cannot be empty.'));
    expect(repository.save).not.toHaveBeenCalled();
  });
});

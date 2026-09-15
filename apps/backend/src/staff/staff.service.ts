import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Staff } from './staff.entity';
import { Type } from './types';

/**
 * The StaffService is a NestJS service that provides business logic and data access methods for managing Staff users in the system.
 * It interacts with the database through the TypeORM repository for the Staff entity, allowing for operations such as creating,
 * retrieving, updating, and deleting Staff records.
 */
@Injectable()
export class StaffService {
  constructor(@InjectRepository(Staff) private repo: Repository<Staff>) {}

  /**
   * Creates a new Staff user in the system.
   * @param email The email address of the Staff user.
   * @param firstName The first name of the Staff user.
   * @param lastName The last name of the Staff user.
   * @param type The type of the Staff user.
   * @returns A promise resolving to the created Staff user.
   */
  async create(
    email: string,
    firstName: string,
    lastName: string,
    type: Type = Type.STANDARD,
  ) {
    const staffId = (await this.repo.count()) + 1;
    const staff = this.repo.create({
      id: staffId,
      type,
      firstName,
      lastName,
      email,
    });

    return this.repo.save(staff);
  }

  /**
   * Finds a Staff user by their unique ID.
   * @param id The unique ID of the Staff user.
   * @returns A promise resolving to the found Staff user or null if not found.
   */
  findOne(id: number) {
    if (!id) {
      return null;
    }

    return this.repo.findOneBy({ id });
  }

  find(email: string) {
    return this.repo.find({ where: { email } });
  }

  /**
   * Updates a Staff user by their unique ID.
   * @param id The unique ID of the Staff user.
   * @param attrs The attributes to update.
   * @returns A promise resolving to the updated Staff user.
   */
  async update(id: number, attrs: Partial<Staff>) {
    const staff = await this.findOne(id);

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    Object.assign(staff, attrs);

    return this.repo.save(staff);
  }

  /**
   * Removes a Staff user by their unique ID.
   * @param id The unique ID of the Staff user.
   * @returns A promise resolving to the removed Staff user.
   */
  async remove(id: number) {
    const staff = await this.findOne(id);

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return this.repo.remove(staff);
  }
}

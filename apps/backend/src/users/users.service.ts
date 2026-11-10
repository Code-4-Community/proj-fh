import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';
import { Status } from './types';
import { CognitoAdminService } from '../cognito/cognito-admin.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private cognito: CognitoAdminService,
  ) {}

  async create(
    email: string,
    firstName: string,
    lastName: string,
    status: Status = Status.COMMUNITY_STAFF,
  ) {
    const user = this.repo.create({
      status,
      firstName,
      lastName,
      email,
    });

    return this.repo.save(user);
  }

  findOne(id: number) {
    if (!id) {
      return null;
    }

    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string) {
    if (!email) {
      return null;
    }

    return this.repo.findOneBy({ email });
  }

  find(email: string) {
    return this.repo.find({ where: { email } });
  }

  async update(id: number, attrs: Partial<User>) {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, attrs);

    return this.repo.save(user);
  }

  /**
   * Removes a staff user from both Cognito and the database.
   *
   * Cognito is handled first, using the email on the database record. The
   * database row is deleted only once Cognito has no account for that email,
   * which is true either because we just deleted it or because it was already
   * missing. A missing Cognito account is deliberately not an error: it is what
   * a retry sees after an earlier attempt deleted Cognito but failed to delete
   * the database row, and it also clears database rows that never had (or no
   * longer have) a Cognito account.
   *
   * If the database delete fails, the error is logged with the user id and the
   * request fails with a message to retry.
   *
   * @param id Database id of the user to remove.
   * @returns the removed user record.
   * @throws {NotFoundException} If no user has this id.
   * @throws {ForbiddenException} If the user is not community staff.
   * @throws {BadGatewayException} If the Cognito lookup or delete fails, so the
   * database row is kept.
   * @throws {InternalServerErrorException} If Cognito no longer has the account
   * but the database delete failed.
   */
  async remove(id: number) {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== Status.COMMUNITY_STAFF) {
      throw new ForbiddenException(
        'Only community staff users can be removed.',
      );
    }

    await this.cognito.deleteUserByEmail(user.email);

    try {
      return await this.repo.remove(user);
    } catch (error) {
      this.logger.error(
        `Inconsistent state: Cognito account is gone but database delete failed for user id=${id}. ` +
          `Retry DELETE /users/${id} to finish removal. Cause: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      throw new InternalServerErrorException(
        'The user is no longer in Cognito but could not be removed from the database. Retry the request to finish removal.',
      );
    }
  }
}

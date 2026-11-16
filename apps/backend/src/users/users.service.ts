import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from './user.entity';
import { Status } from './types';
import { CognitoAdminService } from '../cognito/cognito-admin.service';
import { toOnboardingStage } from './onboarding-stage';
import {
    STAFF_ROLES,
    StaffMemberResponse,
    StaffRole,
} from './dto/staff-member.response';


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
    /**
   * Lists every admin and community staff user with their onboarding stage.
   *
   * The stage is read from Cognito on every call and never stored, so it always
   * matches Cognito. The response contains no Cognito identifiers or raw statuses.
   *
   * @returns The staff list, oldest account first.
   * @throws {BadGatewayException} If Cognito cannot be read. No partial list is
   * returned, so the page never shows a guessed stage.
   */
  async findStaffWithOnboardingStage(): Promise<StaffMemberResponse[]> {
    const staff = await this.findStaffUsers();
    if (staff.length === 0) {
      return [];
    }

    const statusesByEmail = await this.cognito.listAccountStatusesByEmail();
    return staff.map((user) => this.toStaffMember(user, statusesByEmail));
  }

    /** Loads every admin and community staff user, oldest account first. Patients are excluded. */
  private findStaffUsers(): Promise<User[]> {
    return this.repo.find({
      where: { status: In([...STAFF_ROLES]) },
      order: { id: 'ASC' },
    });
  }

    /**
   * Builds the response row for one user, with the onboarding stage taken from
   * their Cognito account.
   */
  private toStaffMember(
    user: User,
    statusesByEmail: Map<string, string | undefined>,
  ): StaffMemberResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.status as StaffRole,
      onboardingStage: toOnboardingStage(
        this.cognitoStatusFor(user, statusesByEmail),
      ),
    };
  }

  /**
   * Finds the Cognito status for a user, matching emails case-insensitively.
   * Logs a warning, with the user id only, when the user has no Cognito account.
   * @returns The Cognito status, or undefined if there is no matching account.
   */
  private cognitoStatusFor(
    user: User,
    statusesByEmail: Map<string, string | undefined>,
  ): string | undefined {
    const email = user.email.toLowerCase();
    if (!statusesByEmail.has(email)) {
      this.logger.warn(
        `No Cognito account found for user id=${user.id}; onboarding stage unknown.`,
      );
    }
    return statusesByEmail.get(email);
  }
}

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserType } from '@aws-sdk/client-cognito-identity-provider';
import { User } from './user.entity';
import { CognitoAdminService, awsErrorInfo } from './cognito-admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreatedUserResponse } from './dto/created-user.response';

/**
 * Invites a staff or admin user: creates them in Cognito first, then in the database.
 * If the database save fails, the Cognito user is deleted so the two stay in sync.
 */
@Injectable()
export class UserInvitationService {
  private readonly logger = new Logger(UserInvitationService.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly cognito: CognitoAdminService,
  ) {}

  async invite(dto: CreateUserDto): Promise<CreatedUserResponse> {
    // The DTO already normalizes the email; this guards direct callers.
    const email = dto.email.trim().toLowerCase();

    await this.assertEmailIsFree(email);

    const cognitoUser = await this.createCognitoUser(email);
    const cognitoUsername = cognitoUser.Username ?? email;

    if (cognitoUser.UserStatus !== 'FORCE_CHANGE_PASSWORD') {
      await this.cleanupCognitoUser(
        cognitoUsername,
        email,
        `unexpected Cognito status ${cognitoUser.UserStatus}`,
      );
      throw new InternalServerErrorException(
        'The new Cognito user was not in the FORCE_CHANGE_PASSWORD state, so it was removed.',
      );
    }

    const id = await this.saveDatabaseUser(dto, email, cognitoUsername);

    return {
      id,
      email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      cognitoStatus: 'FORCE_CHANGE_PASSWORD',
    };
  }

  /** Rejects with 409 if the email exists in the database or in Cognito. */
  private async assertEmailIsFree(email: string): Promise<void> {
    const existing = await this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email })
      .getOne();
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    let existsInCognito: boolean;
    try {
      existsInCognito = await this.cognito.userExists(email);
    } catch (err) {
      this.logger.error({
        msg: 'Cognito AdminGetUser failed during duplicate check',
        email,
        ...awsErrorInfo(err),
      });
      throw new InternalServerErrorException(
        'Could not check Cognito for an existing user.',
      );
    }

    if (existsInCognito) {
      throw new ConflictException(
        'A user with this email already exists in Cognito.',
      );
    }
  }

  /** Creates the Cognito user. Nothing has been written to the database yet. */
  private async createCognitoUser(email: string): Promise<UserType> {
    try {
      return await this.cognito.createInvitedUser(email);
    } catch (err) {
      const info = awsErrorInfo(err);
      this.logger.error({ msg: 'Cognito AdminCreateUser failed', email, ...info });

      // AWS does not clearly document whether the user exists after a delivery
      // failure, so remove it if it does. Cleanup ignores "not found".
      if (info.errorName === 'CodeDeliveryFailureException') {
        await this.cleanupCognitoUser(email, email, 'invitation email could not be delivered');
      }
      throw this.toCognitoCreateError(info.errorName);
    }
  }

  /** Inserts the database row and returns its id. Rolls back Cognito on failure. */
  private async saveDatabaseUser(
    dto: CreateUserDto,
    email: string,
    cognitoUsername: string,
  ): Promise<number> {
    try {
      // The id column is not auto-generated. MAX + 1 avoids reusing an id after a
      // deletion, and insert() fails on a collision instead of overwriting a row.
      const raw = await this.repo
        .createQueryBuilder('u')
        .select('MAX(u.id)', 'maxId')
        .getRawOne<{ maxId: number | string | null }>();
      const id = Number(raw?.maxId ?? 0) + 1;

      await this.repo.insert({
        id,
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.role,
      });
      return id;
    } catch (err) {
      this.logger.error({
        msg: 'Database save failed after the Cognito user was created',
        email,
        cognitoUsername,
        errorMessage: (err as Error)?.message,
      });
      await this.cleanupCognitoUser(cognitoUsername, email, 'database save failed');
      throw new InternalServerErrorException(
        'The user could not be saved, so their new Cognito account was deleted. Any invitation email they already received will not work. Try the invite again.',
      );
    }
  }

  /**
   * Deletes a Cognito user created during a failed invite. Never throws, so the
   * caller's original error is what gets returned.
   */
  private async cleanupCognitoUser(
    cognitoUsername: string,
    email: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.cognito.deleteUser(cognitoUsername);
      this.logger.warn({ msg: 'Rolled back Cognito user', email, cognitoUsername, reason });
    } catch (err) {
      const info = awsErrorInfo(err);
      if (info.errorName === 'UserNotFoundException') {
        return; // Nothing to clean up.
      }
      this.logger.error({
        msg: 'CLEANUP FAILED: a Cognito user exists with no database record. Delete it manually in the Cognito console.',
        email,
        cognitoUsername,
        userPoolId: this.cognito.userPoolId,
        reason,
        ...info,
      });
    }
  }

  /** Maps AdminCreateUser errors to clear HTTP errors. */
  private toCognitoCreateError(errorName: string | undefined): HttpException {
    switch (errorName) {
      case 'UsernameExistsException':
        return new ConflictException('A user with this email already exists in Cognito.');
      case 'InvalidParameterException':
        return new BadRequestException('Cognito rejected the user details.');
      case 'LimitExceededException':
        return new HttpException(
          'Cognito email sending limit reached. The invitation was not sent. The default Cognito email sender allows only a few emails per day, so try again tomorrow.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'TooManyRequestsException':
        return new HttpException(
          'Too many requests to Cognito. Try again in a moment.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'CodeDeliveryFailureException':
        return new BadGatewayException(
          'Cognito could not deliver the invitation email. The user was not created.',
        );
      default:
        return new InternalServerErrorException('Could not create the user in Cognito.');
    }
  }
}
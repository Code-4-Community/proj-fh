import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersCommandOutput,
  UserNotFoundException,
  UserType,
} from '@aws-sdk/client-cognito-identity-provider';

/** Injection token for the Cognito settings (see `CognitoModule`). */
export const COGNITO_CONFIG = 'COGNITO_CONFIG';

/**
 * Settings for talking to Cognito. They are injected instead of read from the
 * env utility here, so importing this service never triggers env validation
 * (which would break any test that imports `UsersService` without a full `.env`).
 */
export type CognitoConfig = {
  region: string;
  userPoolId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Whether a Cognito account was removed by a delete call. */
export type CognitoDeleteResult = 'deleted' | 'already-absent';
const LIST_USERS_PAGE_SIZE = 60;

/**
 * Admin access to the Cognito user pool, using the backend's configured AWS
 * credentials and pool ID. Nothing here logs or returns credentials, emails or
 * raw AWS responses.
 */
@Injectable()
export class CognitoAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(CognitoAdminService.name);
  private readonly userPoolId: string;
  private readonly client: CognitoIdentityProviderClient;

  constructor(@Inject(COGNITO_CONFIG) config: CognitoConfig) {
    this.userPoolId = config.userPoolId;
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  onModuleDestroy() {
    this.client.destroy();
  }

  /**
   * Deletes the Cognito account whose email matches `email`.
   *
   * Looks the account up in the configured pool and deletes it by Cognito's
   * canonical username. Deleting is idempotent: if no account matches (or it
   * disappears between lookup and delete) the account is already gone, so this
   * resolves with `'already-absent'`. That is what makes a retry safe after a
   * previous attempt deleted Cognito but failed to delete the database record.
   *
   * @param email Email stored on the database user record.
   * @returns `'deleted'` or `'already-absent'`, once Cognito has no such account.
   * @throws {BadGatewayException} If the lookup or delete fails, or if more than
   * one account matches the email (nothing is deleted in that case).
   */
  async deleteUserByEmail(email: string): Promise<CognitoDeleteResult> {
    const username = await this.findUsernameByEmail(email);
    if (!username) {
      return 'already-absent';
    }

    try {
      await this.client.send(
        new AdminDeleteUserCommand({
          UserPoolId: this.userPoolId,
          Username: username,
        }),
      );
      return 'deleted';
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return 'already-absent';
      }
      this.logger.error(`Cognito delete failed: ${describeError(error)}`);
      throw new BadGatewayException('Failed to delete the user from Cognito.');
    }
  }

  /**
   * Returns the Cognito status of every account in the pool, keyed by email in
   * lowercase. Reads every page of results, so the map covers the whole pool.
   *
   * Only the email attribute is requested from Cognito, and only error names are
   * logged, so no account details leave this method except the statuses.
   *
   * @returns A map from lowercase email to Cognito status. An email shared by
   * more than one account maps to undefined, since its status is ambiguous.
   * @throws {BadGatewayException} If any page of the lookup fails.
   */
  async listAccountStatusesByEmail(): Promise<Map<string, string | undefined>> {
    const statusesByEmail = new Map<string, string | undefined>();
    let paginationToken: string | undefined;

    do {
      const page = await this.fetchUsersPage(paginationToken);
      this.addPageToMap(page.Users ?? [], statusesByEmail);
      paginationToken = page.PaginationToken;
    } while (paginationToken);

    return statusesByEmail;
  }

    /**
   * Fetches one page of accounts, with only the email attribute.
   * @param paginationToken Where to continue, or undefined for the first page.
   * @throws {BadGatewayException} If Cognito cannot be reached or refuses the request.
   */
  private async fetchUsersPage(
    paginationToken: string | undefined,
  ): Promise<ListUsersCommandOutput> {
    try {
      return await this.client.send(
        new ListUsersCommand({
          UserPoolId: this.userPoolId,
          AttributesToGet: ['email'],
          Limit: LIST_USERS_PAGE_SIZE,
          PaginationToken: paginationToken,
        }),
      );
    } catch (error) {
      this.logger.error(`Cognito account listing failed: ${describeError(error)}`);
      throw new BadGatewayException(
        'Failed to load account information from Cognito.',
      );
    }
  }

    /**
   * Adds one page of accounts to the email-to-status map. Accounts without an
   * email are skipped. If two accounts share an email with different statuses,
   * that email maps to undefined, because which one belongs to the user is
   * ambiguous.
   */
  private addPageToMap(
    users: UserType[],
    statusesByEmail: Map<string, string | undefined>,
  ): void {
    for (const user of users) {
      const email = emailOf(user);
      if (!email) {
        continue;
      }

      const alreadySeen = statusesByEmail.has(email);
      if (alreadySeen && statusesByEmail.get(email) !== user.UserStatus) {
        this.logger.warn(
          'More than one Cognito account shares an email; its onboarding stage cannot be determined.',
        );
        statusesByEmail.set(email, undefined);
      } else {
        statusesByEmail.set(email, user.UserStatus);
      }
    }
  }

  /**
   * Resolves Cognito's canonical username for the account with this email.
   * @returns the username, or `null` if no account matches.
   */
  private async findUsernameByEmail(email: string): Promise<string | null> {
    let usernames: (string | undefined)[];
    try {
      const response = await this.client.send(
        new ListUsersCommand({
          UserPoolId: this.userPoolId,
          // Exact match. Limit 2 is enough to detect an ambiguous email.
          Filter: `email = "${escapeFilterValue(email)}"`,
          Limit: 2,
        }),
      );
      usernames = (response.Users ?? []).map((user) => user.Username);
    } catch (error) {
      this.logger.error(`Cognito lookup failed: ${describeError(error)}`);
      throw new BadGatewayException('Failed to look up the user in Cognito.');
    }

    if (usernames.length > 1) {
      this.logger.error(
        'Cognito lookup matched more than one account; refusing to delete.',
      );
      throw new BadGatewayException(
        'More than one Cognito account matches this user.',
      );
    }

    return usernames[0] ?? null;
  }
}

/** Escapes a value for use inside a double-quoted Cognito `ListUsers` filter. */
export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Error name only: AWS error messages can echo request details. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

/** The account's email in lowercase, or undefined if it has none. */
function emailOf(user: UserType): string | undefined {
  return user.Attributes?.find((attribute) => attribute.Name === 'email')
    ?.Value?.toLowerCase();
}
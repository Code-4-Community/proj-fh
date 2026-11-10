import { Injectable } from '@nestjs/common';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { envUtility } from '../utils/env';

/**
 * Pulls loggable, secret-free details out of an AWS SDK error.
 * awsRequestId lets AWS support trace the exact call.
 */
export function awsErrorInfo(err: unknown) {
  const e = err as {
    name?: string;
    message?: string;
    $metadata?: { requestId?: string };
  };
  return {
    errorName: e?.name,
    errorMessage: e?.message,
    awsRequestId: e?.$metadata?.requestId,
  };
}

/**
 * Thin wrapper around the Cognito admin APIs used to invite users.
 * The backend never sends, generates, or receives a password through this class.
 */
@Injectable()
export class CognitoAdminService {
  readonly userPoolId = envUtility.AUTH_COGNITO_USER_POOL_ID;

  private readonly client = new CognitoIdentityProviderClient({
    region: envUtility.REGION,
    credentials: {
      accessKeyId: envUtility.AWS_ACCESS_KEY_ID,
      secretAccessKey: envUtility.AWS_SECRET_ACCESS_KEY,
    },
  });

  /**
   * Returns true if the pool already has this user.
   * The pool's usernames are case-insensitive, so the lookup is too.
   * @throws any Cognito error other than UserNotFoundException.
   */
  async userExists(email: string): Promise<boolean> {
    try {
      await this.client.send(
        new AdminGetUserCommand({ UserPoolId: this.userPoolId, Username: email }),
      );
      return true;
    } catch (err) {
      if (awsErrorInfo(err).errorName === 'UserNotFoundException') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Creates the user and has Cognito email them a temporary password.
   * TemporaryPassword is omitted so Cognito generates it.
   * MessageAction is omitted so Cognito sends the invitation.
   */
  async createInvitedUser(email: string): Promise<UserType> {
    const result = await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
      }),
    );

    if (!result.User) {
      throw new Error('AdminCreateUser returned no user.');
    }
    return result.User;
  }

  /** Deletes a user from the pool. Used only to roll back a failed invite. */
  async deleteUser(username: string): Promise<void> {
    await this.client.send(
      new AdminDeleteUserCommand({ UserPoolId: this.userPoolId, Username: username }),
    );
  }
}
import { Module } from '@nestjs/common';
import { COGNITO_CONFIG, CognitoAdminService } from './cognito-admin.service';
import { envUtility } from '../utils/env';

/**
 * Provides admin access to the Cognito user pool. This is the one place the
 * Cognito settings are read from the validated env utility.
 */
@Module({
  providers: [
    {
      provide: COGNITO_CONFIG,
      useFactory: () => ({
        region: envUtility.REGION,
        userPoolId: envUtility.AUTH_COGNITO_USER_POOL_ID,
        accessKeyId: envUtility.AWS_ACCESS_KEY_ID,
        secretAccessKey: envUtility.AWS_SECRET_ACCESS_KEY,
      }),
    },
    CognitoAdminService,
  ],
  exports: [CognitoAdminService],
})
export class CognitoModule {}

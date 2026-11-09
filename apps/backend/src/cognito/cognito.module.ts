import { Module } from '@nestjs/common';
import { CognitoAdminService } from './cognito-admin.service';

/** Provides admin access to the Cognito user pool. */
@Module({
  providers: [CognitoAdminService],
  exports: [CognitoAdminService],
})
export class CognitoModule {}

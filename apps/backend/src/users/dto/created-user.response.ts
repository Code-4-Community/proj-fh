import { ApiProperty } from '@nestjs/swagger';
import { INVITABLE_STATUSES, InvitableStatus } from './create-user.dto';

/** Success response for POST /users. Never contains passwords or tokens. */
export class CreatedUserResponse {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ enum: INVITABLE_STATUSES })
  role!: InvitableStatus;

  @ApiProperty({
    enum: ['FORCE_CHANGE_PASSWORD'],
    description:
      'Cognito account status. The user must set a new password at first sign-in.',
  })
  cognitoStatus!: 'FORCE_CHANGE_PASSWORD';
}
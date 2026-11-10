import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Status } from '../types';

/** Roles an admin may invite. PATIENT is deliberately excluded. */
export const INVITABLE_STATUSES = [Status.ADMIN, Status.COMMUNITY_STAFF] as const;
export type InvitableStatus = (typeof INVITABLE_STATUSES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Request body for POST /users.
 * There is intentionally no password field: Cognito generates the temporary password.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email must be a valid email address' })
  email !: string;

  @ApiProperty({ example: 'Jane' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'firstName must not be blank' })
  @MaxLength(100)
  firstName !: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'lastName must not be blank' })
  @MaxLength(100)
  lastName !: string;

  @ApiProperty({ enum: INVITABLE_STATUSES, example: Status.COMMUNITY_STAFF })
  @IsIn([...INVITABLE_STATUSES], {
    message: 'role must be ADMIN or COMMUNITY_STAFF',
  })
  role !: InvitableStatus;
}
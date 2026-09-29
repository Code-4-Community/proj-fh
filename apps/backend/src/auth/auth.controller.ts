import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedIdentity } from './authenticated-identity';

type AuthenticatedRequest = {
  user: AuthenticatedIdentity;
};

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  getIdentity(@Req() request: AuthenticatedRequest): AuthenticatedIdentity {
    return request.user;
  }
}

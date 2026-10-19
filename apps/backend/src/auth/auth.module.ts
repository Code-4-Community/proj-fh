import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

/**
 * Auth module to handle authentication-related functionality and role-based authorization.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [AuthController],
  providers: [JwtStrategy],
})
export class AuthModule {}

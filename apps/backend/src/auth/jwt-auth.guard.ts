import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard to protect routes requiring a valid JWT token.
 * 
 * Extends the default AuthGuard provided by Passport Package to use the JWT strategy.
 * Hence all of the logic is handled by the underlying Passport JWT strategy
 * which is why this file is nearly blank.
 * 
 * This is used in other files to protect routes that require JWT authentication.
 * E.g. @UseGuards(JwtAuthGuard) put above a controller route (method).
 * 
 * The execution chain is:
 * 1. JwtAuthGuard calls Passport (package) with strategy name 'jwt'.
 * 2. Passport (package) finds the registered JwtStrategy (in jwt.strategy.ts)
 * 3. JwtStrategy validates the token.
 * 4. Its validate() result becomes request.user.
 * 5. request.user is autoinjected into any function with the JwtAuthGuard applied.
 * 6. When /auth/me is called in auth.controller.ts, the user comes from that injected user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

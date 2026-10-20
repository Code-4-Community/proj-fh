import { SetMetadata } from '@nestjs/common';
import { Status } from '../users/types';

/** Metadata key used by `RolesGuard` to read required user roles. */
export const ROLES_KEY = 'roles';

/**
 * Declares allowed user roles for a route handler or controller class.
 * Routes without this decorator are not restricted by the guard.
 * @param roles one or more roles permitted to access the route.
 * @returns a Nest metadata decorator consumed by `RolesGuard`.
 */
export const Roles = (...roles: Status[]) => SetMetadata(ROLES_KEY, roles);

import { EntityManager, Like } from 'typeorm';
import { Status } from '../users/types';
import { User } from '../users/user.entity';

/**
 * Email domain shared by every seed user. seedUsers deletes users with this domain
 * before reseeding, so other local accounts are never touched.
 */
const SEED_EMAIL_DOMAIN = 'c4cneu.com';

/**
 * A sample user. IDs are assigned by seedUsers, not stored here, because
 * UsersService assigns IDs as count() + 1 and expects them to have no gaps.
 */
interface SeedUser {
  firstName: string;
  lastName: string;
  email: string;
  status: Status;
}

/**
 * Builds a seed user with an email in the first.last@c4cneu.com format.
 */
function buildSeedUser(
  firstName: string,
  lastName: string,
  status: Status,
): SeedUser {
  return {
    firstName,
    lastName,
    email: `${firstName}.${lastName}@${SEED_EMAIL_DOMAIN}`.toLowerCase(),
    status,
  };
}

/**
 * Five users for each role that has an account.
 */
export const SEED_USERS: SeedUser[] = [
  buildSeedUser('Sita', 'Raman', Status.ADMIN),
  buildSeedUser('Marcus', 'Johnson', Status.ADMIN),
  buildSeedUser('Elena', 'Vasquez', Status.ADMIN),
  buildSeedUser('Kenji', 'Watanabe', Status.ADMIN),
  buildSeedUser('Sophia', 'Lee', Status.ADMIN),

  buildSeedUser('Liam', 'Brown', Status.COMMUNITY_STAFF),
  buildSeedUser('Mateo', 'Herrera', Status.COMMUNITY_STAFF),
  buildSeedUser('Grace', 'Nguyen', Status.COMMUNITY_STAFF),
  buildSeedUser('Emma', 'Moore', Status.COMMUNITY_STAFF),
  buildSeedUser('Jamal', 'Wright', Status.COMMUNITY_STAFF),

  buildSeedUser('Olivia', 'Martinez', Status.PATIENT),
  buildSeedUser('Mei', 'Chen', Status.PATIENT),
  buildSeedUser('Olivia', 'Mendoza', Status.PATIENT),
  buildSeedUser('John', 'Price', Status.PATIENT),
  buildSeedUser('Arno', 'Dorian', Status.PATIENT),
];

/**
 * Replaces all seeded users. Users outside the seed email domain, such as
 * local auth test accounts, are left untouched.
 *
 * New users continue the existing ID sequence because UsersService.create
 * assigns IDs as count() + 1. If the remaining IDs already have a gap, seeding
 * would cause future primary key collisions, so it stops with an error instead.
 *
 * @returns The number of users inserted.
 */
export async function seedUsers(manager: EntityManager): Promise<number> {
  await manager.delete(User, { email: Like(`%@${SEED_EMAIL_DOMAIN}`) });

  const count = await manager.count(User);
  const maxId = (await manager.maximum(User, 'id')) ?? 0;

  if (maxId !== count) {
    throw new Error(
      `Cannot seed users: the users table has ${count} rows but its highest id is ${maxId}. ` +
        'UsersService assigns ids as count() + 1, so a gap would cause future collisions. ' +
        'Remove the gap before seeding.',
    );
  }

  const users = SEED_USERS.map((seed, index) =>
    manager.create(User, { id: count + index + 1, ...seed }),
  );
  await manager.save(User, users);

  return users.length;
}

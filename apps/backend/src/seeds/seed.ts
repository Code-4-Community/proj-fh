/**
 * Seeds the local database with fictional sample data for development.
 *
 * Run after migrations with: POSTGRES_HOST=localhost yarn seed
 *
 * Running it again replaces the sample data: all resources and scores are
 * truncated, and the seeded users (matched by exact email) are replaced.
 * Auth test users (manually created Cognito accounts used for role testing,
 * see AUTH_TEST_USERS in users.seed.ts) are inserted only if missing, and are
 * never replaced. Other users and all tags are left untouched.
 *
 * Re-running is idempotent in row count and content, but not in id: resources
 * get a fresh users.id and resource_id every run, since resources.resource_id
 * is restarted via TRUNCATE ... RESTART IDENTITY, but users.id is not (there's
 * no "RESTART IDENTITY" for a delete), so re-seeding the same 15 SEED_USERS
 * keeps growing users.id instead of reusing the ids from the previous run.
 * Anything that stored an old resources.completed_by_user_id or users.id from
 * a prior seed run (e.g. a Postman variable) will point at a row that no
 * longer exists after reseeding.
 */

import { Logger } from '@nestjs/common';

import AppDataSource from '../data-source';
import { seedAuthTestUsers, seedUsers } from './users.seed';
import { envUtility } from '../utils/env';
import { seedResources } from './resources.seed';
import { Status } from '../users/types';
import { User } from '../users/user.entity';
import { Resource } from '../resources/resources.entity';

/*
 * Context label shown in the logs output. e.g "[Seed] Seed complete"
 */

const LOG_CONTEXT = 'Seed';

/**
 * Database hosts the seed may write to. The seed deletes the data, so it
 * refuses to run on anything other than its own local database.
 */

const LOCAL_DATABASE_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  'host.docker.internal',
]);

/*
 * Throws an error if the seed is run on a database host that is not in the
 * LOCAL_DATABASE_HOSTS set.
 */
function assertLocalDatabase(): void {
  const host = envUtility.POSTGRES_HOST;
  if (!LOCAL_DATABASE_HOSTS.has(host)) {
    throw new Error(
      `Refusing to seed: POSTGRES_HOST is "${host}". The seed only runs against ` +
        `a local database (${[...LOCAL_DATABASE_HOSTS].join(', ')}).`,
    );
  }
}

/*
 * Connects, runs every seeder in one transaction, logs a summary, and
 * disconnects. If any seeders fail, the transaction is rolled back.
 */

async function main(): Promise<void> {
  assertLocalDatabase();

  await AppDataSource.initialize();
  try {
    const counts = await AppDataSource.transaction(async (manager) => {
      const usersBefore = await manager.count(User);
      const resourcesBefore = await manager.count(Resource);

      const users = await seedUsers(manager);
      await seedAuthTestUsers(manager);
      const submitters = users.filter(
        (user) => user.status === Status.COMMUNITY_STAFF,
      );
      await seedResources(manager, submitters);

      return {
        users: (await manager.count(User)) - usersBefore,
        resources: (await manager.count(Resource)) - resourcesBefore,
      };
    });
    Logger.log(
      `Seed complete: inserted ${counts.users} users and ${counts.resources} resources.`,
      LOG_CONTEXT,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  Logger.error(
    'Seed failed',
    error instanceof Error ? error.stack : String(error),
    LOG_CONTEXT,
  );
  process.exit(1);
});

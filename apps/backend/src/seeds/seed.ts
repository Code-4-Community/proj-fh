/**
 * Seeds the local database with fictional sample data for development.
 *
 * Run after migrations with: POSTGRES_HOST=localhost yarn seed
 *
 * Running it again replaces the sample data: all resources and scores are
 * truncated, and the seeded users (matched by exact email) are replaced.
 * Other users and all tags are left untouched.
 */

import { Logger } from '@nestjs/common';

import AppDataSource from '../data-source';
import { seedUsers } from './users.seed';
import { envUtility } from '../utils/env';
import { seedResources } from './resources.seed';

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
      const users = await seedUsers(manager);
      const resources = await seedResources(manager);
      return { users, resources };
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

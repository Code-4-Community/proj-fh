/**
 * Seeds the local database with fictional sample data for development.
 *
 * Run after migrations with: POSTGRES_HOST=localhost yarn seed
 *
 * Each seeder resets only what it owns. Tags come from migrations and are
 * never modified. All data is fictional. Never copy rows from Fenway's real
 * resource lists into these files; the repository is public.
 */

import { Logger } from '@nestjs/common';
import AppDataSource from '../data-source';
import { seedUsers } from './users.seed';
import { envUtility } from '../utils/env';

/*
 * Context label shown in the logs output. e.g "[Seed] Seed complete"
 */

const LOG_OUTPUT = 'Seed';

/**
 * Database hosts the seed may write to. The seed deletes the data, so it
 * refuses to run on anything other than its own local database.
 */

const LOCAL_DATABASE_HOST: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  'host.docker.internal',
]);

/*
 * Throws an error if the seed is run on a database host that is not in the
 * LOCAL_DATABASE_HOST set.
 */
function assertLocalDatabase(): void {
  const host = envUtility.POSTGRES_HOST;
  if (!LOCAL_DATABASE_HOST.has(host)) {
    throw new Error(
      `Refusing to seed: POSTGRES_HOST is "${host}". The seed only runs against ` +
        `a local database (${[...LOCAL_DATABASE_HOST].join(', ')}).`,
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
      return { users };
    });
    Logger.log(`Seed complete: inserted ${counts.users} users.`, LOG_OUTPUT);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  Logger.error(
    'Seed failed',
    error instanceof Error ? error.stack : String(error),
    LOG_OUTPUT,
  );
  process.exit(1);
});

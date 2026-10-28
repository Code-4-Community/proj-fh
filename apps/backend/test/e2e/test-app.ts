import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureGlobalApp } from '../../src/configure-app';
import {
  E2E_DB_NAME,
  E2E_READY_FLAG,
  E2E_SENTINEL_TABLE,
} from './e2e-constants';

export interface E2eApp {
  app: INestApplication;
  dataSource: DataSource;
  /** Base URL of the running backend, e.g. http://127.0.0.1:54321 */
  baseUrl: string;
}

/**
 * Boots the full backend (AppModule) on a random local port, connected to the
 * ephemeral E2E database. Use `customize` to override guards or providers.
 */
export async function startE2eApp(
  customize: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<E2eApp> {
  if (process.env[E2E_READY_FLAG] !== 'true') {
    throw new Error(
      'The E2E database is not set up, so the app would fall back to the database in your .env. ' +
        'Run E2E tests with `yarn test:e2e`, which starts a throwaway Postgres container first.',
    );
  }

  const moduleRef = await customize(
    Test.createTestingModule({ imports: [AppModule] }),
  ).compile();
  const app = moduleRef.createNestApplication();

  // Same /api prefix and ValidationPipe as main.ts, from one shared function.
  configureGlobalApp(app);

  await app.init();
  try {
    await assertIsE2eDatabase(app.get(DataSource));
  } catch (err) {
    await app.close();
    throw err;
  }

  await app.listen(0, '127.0.0.1');
  return { app, dataSource: app.get(DataSource), baseUrl: await app.getUrl() };
}

/** Throws unless `dataSource` points at the ephemeral E2E database. */
export async function assertIsE2eDatabase(
  dataSource: DataSource,
): Promise<void> {
  const rows: Array<{ db: string; marked: boolean }> = await dataSource.query(
    `SELECT current_database() AS db, to_regclass('public.${E2E_SENTINEL_TABLE}') IS NOT NULL AS marked`,
  );
  const row = rows[0];
  if (row?.db !== E2E_DB_NAME || row?.marked !== true) {
    throw new Error(
      `Refusing to continue: the app is connected to database "${row?.db}", ` +
        `not the ephemeral E2E database "${E2E_DB_NAME}". Nothing was read or written.`,
    );
  }
}

/**
 * Empties every entity table (never the migrations table) so each test starts
 * clean. Note this also removes the tags inserted by the seed migration.
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  await assertIsE2eDatabase(dataSource);

  const existing: Array<{ tablename: string }> = await dataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const existingTables = new Set(existing.map((row) => row.tablename));

  const tables = dataSource.entityMetadatas
    .filter(
      (meta) => meta.tableType === 'regular' || meta.tableType === 'junction',
    )
    .map((meta) => meta.tableName)
    // Skip entities that have no table yet (Score has no migration) instead of failing.
    .filter((name) => existingTables.has(name))
    .map((name) => `"public"."${name}"`);

  if (tables.length > 0) {
    await dataSource.query(
      `TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
}

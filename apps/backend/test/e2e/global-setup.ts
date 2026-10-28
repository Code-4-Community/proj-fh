import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';

import {
  E2E_DB_NAME,
  E2E_READY_FLAG,
  E2E_SENTINEL_TABLE,
  POSTGRES_IMAGE,
} from './e2e-constants';

/** apps/backend/test/e2e -> repo root. data-source.ts's migration globs only resolve from here. */
const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** TypeORM's default; data-source.ts doesn't set migrationsTableName. */
const MIGRATIONS_TABLE_NAME = 'migrations';

/**
 * Runs once before all tests are executed.
 * 1. start a throwaway postgres container on a random port
 * 2. point every DB env var at it
 * 3. runs the app's real migrations against the throwaway container
 * 4. confirms the migrations landed there, then plants a sentinel table
 */

export default async function globalSetup(): Promise<void> {
  const container = await startContainer();
  globalThis.__E2E_PG_CONTAINER__ = container;

  try {
    pointEnvAtContainer(container);
    runMigrations();
    await verifyMigrationsAndPlantSentinel(container);
    process.env[E2E_READY_FLAG] = 'true';
  } catch (err) {
    await container.stop();
    globalThis.__E2E_PG_CONTAINER__ = undefined;
    throw err;
  }
}

// Points the environment variables at the ephemeral Postgres container.
function pointEnvAtContainer(container: StartedPostgreSqlContainer): void {
  const host = container.getHost();
  const port = String(container.getPort());
  const user = container.getUsername();
  const password = container.getPassword();
  const database = container.getDatabase();

  // data-source.ts reads these through envUtility. dotenv never overwrites a
  // variable that is already set, so values in your .env can't point the tests
  // back at the dev database.
  process.env.POSTGRES_HOST = host;
  process.env.POSTGRES_PORT = port;
  process.env.POSTGRES_USER = user;
  process.env.POSTGRES_PASSWORD = password;
  process.env.POSTGRES_DB = database;

  // JwtStrategy throws on startup without these. E2E tests never call
  // Cognito, so placeholders are enough (and CI's .env doesn't set them).
  process.env.REGION ??= 'us-east-2';
  process.env.AUTH_COGNITO_USER_POOL_ID ??= 'us-east-2_e2eplaceholder';
  process.env.AUTH_COGNITO_APP_CLIENT_ID ??= 'e2e-placeholder';
}

// Starts a throwaway Postgres container for E2E tests.
async function startContainer(): Promise<StartedPostgreSqlContainer> {
  try {
    return await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(E2E_DB_NAME)
      .withUsername('e2e_user')
      .withPassword('e2e_password')
      .start();
  } catch (err) {
    throw new Error(
      [
        'E2E setup failed: could not start the ephemeral Postgres container.',
        'Is Docker Desktop running? `docker info` should succeed before you run `yarn test:e2e`.',
        `Underlying error: ${errorMessage(err)}`,
      ].join('\n'),
    );
  }
}

// Returns a user-friendly error message for an unknown error.
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function runMigrations(): void {
  // Same command `yarn migration:run` uses (see the "typeorm" script in
  // package.json), called through node directly so yarn doesn't need to be on PATH.
  const result = spawnSync(
    process.execPath,
    [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      'node_modules/typeorm/cli.js',
      'migration:run',
      '-d',
      'apps/backend/src/data-source.ts',
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        TS_NODE_PROJECT: 'apps/backend/tsconfig.app.json',
      },
      encoding: 'utf8',
    },
  );

  if (result.error || result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(
      [
        'E2E setup failed: migrations did not apply to the ephemeral test database.',
        'Check that `yarn migration:run` works locally. Migration output:',
        output || result.error?.message || `exit code ${result.status}`,
      ].join('\n\n'),
    );
  }
}

// Verifies that migrations have been applied and plants a sentinel table in the ephemeral database.
async function verifyMigrationsAndPlantSentinel(
  container: StartedPostgreSqlContainer,
): Promise<void> {
  const client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  try {
    const applied = await countAppliedMigrations(client);
    if (applied === 0) {
      throw migrationsMissing(`the "${MIGRATIONS_TABLE_NAME}" table is empty`);
    }
    await client.query(
      `CREATE TABLE "${E2E_SENTINEL_TABLE}" (created_at timestamptz NOT NULL DEFAULT now())`,
    );
  } finally {
    await client.end();
  }
}

// Counts the number of applied migrations in the ephemeral database.
async function countAppliedMigrations(client: Client): Promise<number> {
  try {
    const { rows } = await client.query<{ applied: number }>(
      `SELECT COUNT(*)::int AS applied FROM "${MIGRATIONS_TABLE_NAME}"`,
    );
    return rows[0].applied;
  } catch (err) {
    throw migrationsMissing(errorMessage(err));
  }
}

// Creates an error indicating that migrations are missing in the ephemeral database.
function migrationsMissing(detail: string): Error {
  return new Error(
    [
      `E2E setup failed: migrations reported success but are not recorded in the ephemeral database (${detail}).`,
      'They probably ran against a different database. global-setup sets every POSTGRES_* variable,',
      'so look for code that overwrites them (for example dotenv with `override: true`).',
    ].join('\n'),
  );
}

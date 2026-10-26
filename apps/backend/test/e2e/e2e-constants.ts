import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/** Image for the throwaway test DB. Keep in sync with the dev image in README.md. */
export const POSTGRES_IMAGE = 'postgres:18-alpine';

/** Name of the ephemeral database. Deliberately different from the dev DB (proj_fh). */
export const E2E_DB_NAME = 'proj_fh_e2e';

/**
 * Table created only inside the ephemeral DB, after migrations run. If the app
 * can't see it, the app is connected to the wrong database and the harness stops.
 */
export const E2E_SENTINEL_TABLE = '__e2e_sentinel';

/** Env flag set by global-setup once the ephemeral DB is migrated and verified. */
export const E2E_READY_FLAG = 'E2E_DATABASE_READY';

declare global {
  // Lets global-teardown find the container that global-setup started.
  // eslint-disable-next-line no-var
  var __E2E_PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

import './e2e-constants';

/** Runs once after all E2E test files: stops and deletes the throwaway container. */
export default async function globalTeardown(): Promise<void> {
  await globalThis.__E2E_PG_CONTAINER__?.stop();
  globalThis.__E2E_PG_CONTAINER__ = undefined;
}

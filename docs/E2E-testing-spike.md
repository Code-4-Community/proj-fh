# Backend E2E Testing Spike (#57)

## The overview

**Why it was needed:** the backend had module-level tests, such as unit tests for `TagsService`, but no way to test the API through real HTTP requests against a real database. Unit tests check one piece at a time with the database faked out. An end-to-end (E2E) test checks the whole chain at once: an HTTP request hits the running backend, goes through the controller and service, reads from a real Postgres database, and comes back as a real response.

**Scope:** one isolated, temporary test database that applies the app's migrations, plus one E2E test (Tag) as a working example. No E2E tests for other modules.

### Acceptance criteria and how each is met

| Criterion | How it's met |
| --- | --- |
| An ephemeral Postgres test database, created and disposed of automatically | `global-setup.ts` starts a Postgres container on a random port with Testcontainers, and `global-teardown.ts` deletes it. Setup failures and crashes are cleaned up too (see "What happens during a run"). |
| Tests cannot connect to or modify a running dev database | Every DB variable points at the container, a ready flag blocks the app from booting without setup, and a sentinel-table check runs before the first request and before every reset. See "Why the dev database is safe". |
| Apply the app's migrations to the test database | Setup runs the same command as `yarn migration:run`, then checks that the migrations are recorded in the container. |
| An E2E test for Tag, making requests through the running backend | `tags.e2e-spec.ts` sends real HTTP requests to `GET /api/tags/:tagId` on a randomly assigned local port. |
| Verify the endpoint reads the expected data from the test database | The test inserts a row directly into the test database, then asserts the response matches it exactly. |
| A guide for a fellow developer | This document. |
| Fail with a clear error if the test database is unavailable or misconfigured | Every setup step throws a plain-English error saying what failed and how to fix it. With Docker unreachable, setup stops with "could not start the ephemeral Postgres container. Is Docker Desktop running?" |

### The files

| File | What it does |
| --- | --- |
| `apps/backend/jest.e2e.config.ts` | Jest config for E2E tests only. Points Jest at the setup and teardown files and at `*.e2e-spec.ts` files. |
| `apps/backend/test/e2e/e2e-constants.ts` | Shared names: the Postgres image, the test database name, the sentinel table, and the ready flag. |
| `apps/backend/test/e2e/global-setup.ts` | Runs once before all tests: starts the container, points the env vars at it, runs migrations, verifies them, and plants the sentinel table. |
| `apps/backend/test/e2e/global-teardown.ts` | Runs once after all tests: stops and deletes the container. |
| `apps/backend/test/e2e/test-app.ts` | Helpers for test files: `startE2eApp()` boots the real backend, `assertIsE2eDatabase()` runs the sentinel check, and `resetDatabase()` empties the tables between tests. |
| `apps/backend/test/e2e/tags.e2e-spec.ts` | The Tag tests: found (200), missing (404), and non-numeric id (400). |
| `apps/backend/src/configure-app.ts` | `configureGlobalApp()`: CORS, the `/api` prefix, and `ValidationPipe`. Used by both `main.ts` and the tests. |


---


## Using E2E tests

### What you can test

**Any backend API route:** tags, resources, users, auth, and anything added later. Each test sends real requests to the real backend, with a real Postgres database behind it.

What doesn't belong here:

- **Frontend tests.** These tests call the API directly, so no React code runs. Testing the UI in a browser needs a tool like Playwright or Cypress.
- **Unit tests.** Tests that check one function or class on its own stay next to the code in `src/` as `.spec.ts` files and run with `yarn test`. Only put a test here if it needs the real app and database.

### One-time setup
1. **Have Docker Desktop installed and running.** You already need it for normal development.
2. **Run `yarn install` after pulling** the branch that added E2E tests. It installs Testcontainers.

### Running the tests

From the repo root, on your own machine:

| To run | Command |
| --- | --- |
| Every E2E test | `yarn test:e2e` |
| One file (matches part of the file name) | `yarn test:e2e resources` |
| One test by name (matches part of the `it(...)` text) | `yarn test:e2e -t "returns 404"` |

Each run creates a brand-new test database, runs the tests, and deletes the database, so no run ever sees data from a previous one. A run takes about 5 to 10 seconds; most of that is starting the database, which happens once per run, not once per test.

A passing run prints `PASS` next to each test file, lists every test with a check mark, and ends with a summary:

```
 PASS   backend-e2e  apps/backend/test/e2e/tags.e2e-spec.ts
Tests:       3 passed, 3 total
```

A failing run prints `FAIL` instead. For each failing test, it shows the test's name, the line that failed, and what it expected compared to what it received.

E2E tests are not part of `yarn test`, so the regular unit tests and the CI Jest job never need Docker.

### Docker and the test database

You don't start a database container yourself. Testcontainers starts the test container and deletes it on its own; Docker Desktop just has to be running.

- **Run `yarn test:e2e` on your own machine, from the repo root, not inside the `proj-fh-backend` container.** The test run needs access to Docker to start its container, and the backend container doesn't have it.
- **Your usual containers don't need to be running, and leaving them running is fine.** The tests never connect to `proj-fh-db`, `proj-fh-backend`, or `proj-fh-frontend`. The test container uses a random port, so it never clashes with `proj-fh-db` on 5432.
- **To watch the test container during a run,** run `docker ps` in another terminal. You'll see a `postgres:18-alpine` container on a random port, plus a small `testcontainers/ryuk` cleanup container.
- **To confirm nothing was left behind afterwards,** run `docker ps -a --filter label=org.testcontainers=true`. It should list nothing.

The test database only exists while the tests run, so you can't open it or browse it. To look at data by hand or click through the app, use your normal dev setup (`proj-fh-db` and the other containers from the README).

### Writing a new test, step by step

**1. Create the file** in `apps/backend/test/e2e/`, named after the module you're testing: `<module>.e2e-spec.ts` (for example `resources.e2e-spec.ts`). The exact suffix matters: `yarn test:e2e` only picks up files ending in `.e2e-spec.ts`, and a name like `resources.e2e.spec.ts` would also be picked up by the unit tests, which can't run it.

**2. Add the scaffolding.** Every E2E test file starts the same way:

```ts
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { resetDatabase, startE2eApp } from './test-app';

describe('Your module (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let baseUrl: string;

  // Boots the real backend once, connected to the test database.
  beforeAll(async () => {
    ({ app, dataSource, baseUrl } = await startE2eApp());
  });

  // Empties every table before each test, so tests can't affect each other.
  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  // Shuts the backend down and closes its database connections.
  afterAll(async () => {
    await app?.close();
  });

  // Your tests go here, inside the describe.
});
```

**3. Write each test in three steps: arrange, act, assert.**

```ts
it('returns the thing stored in the database', async () => {
  // Arrange: put the data the test needs straight into the test database.
  const repo = dataSource.getRepository(YourEntity);
  const saved = await repo.save(repo.create({ /* the entity's fields */ }));

  // Act: send a real HTTP request to the running backend.
  const res = await fetch(`${baseUrl}/api/your-route/${saved.id}`);

  // Assert: check the status code and the response body.
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ /* what you expect back */ });
});
```

For a route that changes data (`POST`, `PATCH`, `DELETE`), send the request with a method and a JSON body, then check the database as well as the response, since the change is what you're really testing:

```ts
const res = await fetch(`${baseUrl}/api/your-route`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* the request body */ }),
});
expect(res.status).toBe(201);

const rows = await dataSource.getRepository(YourEntity).find();
expect(rows).toHaveLength(1);
```

`tags.e2e-spec.ts` is a complete working example to copy from.

**4. Run it** while you work on it:

```
yarn test:e2e <module>
```

**Rules of thumb:**

- **Seed the data inside each test.** Every table is emptied before each test, including the 49 tags from the seed migration, so never rely on data from another test or from migrations.
- **Pass explicit ids for tables that don't generate them**, like `tags`.
- **Routes start with `/api`.**
- **Use made-up data.** Never copy real rows from Fenway's resource sheet into a test.

### Testing routes that require login

Tag routes are open, so their tests don't log in. A route behind an auth guard, like `/api/auth/me`, rejects requests without a valid token. For those, there are two options:

- **Bypass the guard** with the `customize` option of `startE2eApp()`, using the same guard class the route uses:

  ```ts
  ({ app, dataSource, baseUrl } = await startE2eApp((builder) =>
    builder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true }),
  ));
  ```

  This is quick, but the test no longer checks the login logic itself.

- **Sign real test tokens**, reusing the approach in `apps/backend/src/auth/jwt.strategy.spec.ts`. It's more work, but it tests the real guard and roles. See the recommendations at the end of this doc.

### When a test fails

| What you see | Likely cause |
| --- | --- |
| `404` when you expected `200` | The path is wrong. Check it starts with `/api` and matches the controller's route. Or the row really isn't there: check what the test seeded. |
| `400` | Validation rejected the request: a param pipe like `ParseIntPipe`, or a request body that doesn't match the DTO. |
| `401` or `403` | The route requires login. See "Testing routes that require login". |
| `500` | The backend threw an error. Scroll up in the test output for the error Nest logged. |
| `relation "..." does not exist` | The entity has no migration, so its table doesn't exist in a fresh database. That's a real bug the test found. |
| A test passes alone but fails with the others | It depends on data from another test. Seed everything it needs inside the test. |

For errors that stop the run before any test starts, see "Setup errors" below.


---


## Setup errors

These stop the run before any test starts.

| Error starts with | What to do |
| --- | --- |
| `could not start the ephemeral Postgres container` | Start Docker Desktop and confirm `docker info` works. |
| `migrations did not apply` | Run `yarn migration:run` against the dev DB to see the same error with less noise. |
| `migrations reported success but are not recorded` | Something overwrote the DB variables after global setup set them. |
| `The E2E database is not set up` | You ran a spec without the E2E config. Use `yarn test:e2e`. |
| `Refusing to continue: the app is connected to database` | The app ignored the container's DB variables. Same check as above. |
| `DataTypeNotSupportedError: Data type "Object"` | An entity column relies on TypeScript type info that Jest's fast compile mode drops. Give that `@Column` an explicit `type`. |
| Test times out around 27 s on startup | TypeORM is retrying a bad connection (9 attempts, 3 s apart). Check the container started. |
| Hangs or Ryuk errors on startup | Set `TESTCONTAINERS_RYUK_DISABLED=true`. Teardown still removes the container on normal runs. |
| An error listing missing or invalid environment variables | The backend's env validation (`utils/env.ts`) requires a variable the tests don't set. Add a placeholder for it in `pointEnvAtContainer` in `global-setup.ts`. |

---

## Adding global app setup

Global setup is anything that applies to every route in the app, instead of being attached to one controller or route with a decorator. In this codebase that's CORS, the `/api` prefix, and the `ValidationPipe` that validates request data. Other examples are global pipes, filters, interceptors, and guards.

If you add something like this, put it in `configureGlobalApp()` in `apps/backend/src/configure-app.ts`, not directly in `main.ts`. E2E tests never run `main.ts`, so setup added there applies to the real server but not to the tests, and the tests would quietly stop matching how the app really runs.


---


## What happens during a run

1. `global-setup.ts` starts a `postgres:18-alpine` container on a random free port.
2. It points every `POSTGRES_*` variable at the container. `data-source.ts` reads them through `envUtility`.
3. It runs the app's migrations with the same command `yarn migration:run` uses.
4. It confirms the migrations were recorded in the container, then creates a sentinel table (`__e2e_sentinel`) that exists only there.
5. Each test file calls `startE2eApp()`, which boots `AppModule` on a random local port with the same `/api` prefix and `ValidationPipe` as `main.ts`, since both come from `configureGlobalApp()`. It refuses to continue if the app can't see the sentinel table.
6. `resetDatabase()` empties every entity table before each test. This includes the 49 tags from the seed migration, so seed whatever the test needs.
7. `global-teardown.ts` stops and deletes the container.

If setup fails partway, its own `catch` stops the container before rethrowing. If Jest crashes or you press Ctrl+C, Testcontainers' cleanup container (Ryuk) removes it about 10 seconds later. Either way, nothing is left running.


---


## Why the dev database is safe

There are three independent checks:

1. **Env overrides.** Global setup sets all five `POSTGRES_*` variables before the app is imported, and dotenv never overwrites a variable that is already set, so the `.env` can't win.
2. **Ready flag.** `startE2eApp()` refuses to boot unless global setup finished, so running a spec with the wrong Jest config fails before any connection is made.
3. **Sentinel check.** Before the first request and before every reset, the harness checks that the connected database is named `proj_fh_e2e` and contains the sentinel table. The dev database has neither.

---


## Spike findings

### Why Testcontainers instead of SQLite

The ticket suggested a library like SQLite, but SQLite isn't Postgres. Our migrations are Postgres SQL (for example `CREATE TYPE ... AS ENUM` for `tags_category_enum`), so they can't run on SQLite. Testcontainers gives the same "created and thrown away automatically" behavior with real Postgres. Confirmed with Sam on #57: the goal is that a dev never has to manually set up or tear down anything to run the tests.

| Option | Verdict |
| --- | --- |
| SQLite | Rejected. Different database engine; our migrations can't run on it. |
| pg-mem (in-memory Postgres emulator) | Fallback if Docker isn't an option. It emulates a subset of Postgres, so tests can pass on SQL that fails for real. |
| Separate DB on the existing dev Postgres container | Rejected. Not ephemeral, and one wrong env var points tests at dev data. |
| **Testcontainers + `postgres:18-alpine`** | **Chosen.** Same image as dev, random port, auto-cleanup even on crash. Everyone already runs Docker for this repo. |

---

### Measurements

Measured with the `postgres:18-alpine` image already pulled, so these don't include a download.

- First run: about 10 s total (tests about 1.2 s; the rest is container start, migrations, and teardown)
- Warm runs: about 5–7 s total (tests about 1 s)

---

### Things the spike surfaced

- **`AppModule` couldn't boot under Jest.** `tsconfig.spec.json` uses `isolatedModules`, which drops the type info TypeORM uses for a bare `@Column()`. `User.status` (an enum imported with `import type`) came out as `Object`, and TypeORM threw `DataTypeNotSupportedError`. The webpack build type-checks fully, so this never showed up outside Jest. Fixed with an explicit `type: 'varchar'`, which matches the migration.
- **`Score` has no migration.** It's a registered entity, but no migration creates a `scores` table, so a fresh database (CI, a new dev, production built from migrations) doesn't have one. `resetDatabase()` skips missing tables to work around it.
- **`TagsService.create` assigns `tag_id = count() + 1`.** That collides after any delete: with tags 1–49, deleting tag 10 makes the next id 49, which already exists. The entity's comment also says the database generates the id, which it doesn't.
- **`User` entity type errors.** Its properties lack the `!` that `Tag` uses (`tag_id!: number`), which causes 5 "has no initializer" errors in the editor. They don't affect builds or tests.
- **The Docker backend ignores Ctrl+C.** Node runs as process 1 inside the container, so Ctrl+C doesn't stop it; `docker stop proj-fh-backend` does. Adding `app.enableShutdownHooks()` or running the container with `--init` would fix it.

---


### Recommendations for a full rollout

1. **CI:** `jest.yml` runs inside a `node:24-alpine` container, where Testcontainers can't reach Docker without extra setup. Add a separate E2E job that runs directly on `ubuntu-latest` (no `container:`), which ships with Docker.
2. **Auth:** Tag routes are unguarded, so this prototype didn't need auth. For guarded routes, reuse the pattern in `jwt.strategy.spec.ts` (mock `jwks-rsa` with a local keypair and sign real tokens) so E2E tests exercise the real guard and roles.
3. **Fail fast:** a bad connection takes about 27 s to fail because of TypeORM's default retries (9 attempts, 3 s apart). Make `retryAttempts` configurable and set it low for tests.
4. **Reference data:** `resetDatabase()` wipes the 49 seeded tags. Decide whether resets should preserve migration-seeded rows once more tests depend on them.
5. **Factories:** add small seed helpers per entity so tests don't hand-build rows.
6. **Version:** pin the test image to the Postgres version production runs on.
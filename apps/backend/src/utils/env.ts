import * as dotenv from 'dotenv';
// Zod is the validation library. Their docs call this export `z`
// but for the sake of readability, it is called zod in this repo.
import { z as zod } from 'zod';

/**
 * Backend environment variable utility.
 *
 * Behavior:
 * - Validation runs when this module is first imported, so a misconfigured
 *   app fails at startup (Nest server or TypeORM CLI) instead of mid-request.
 * - Every variable is required and must be non-empty (whitespace-only counts
 *   as empty). Values are trimmed and coerced to the declared type.
 * - All problems are reported in a single thrown error that names every
 *   missing/invalid variable. Error messages contain variable NAMES only,
 *   never values, so secrets cannot leak into logs.
 * - The returned object is frozen and contains only the declared keys.
 *
 * Adding a variable (full checklist: README "Environment variables"):
 * 1. Add it to `example.env` WITHOUT the `VITE_` prefix.
 * 2. Add one line to `backendEnvSchema`, choosing the validator below that
 *    matches the value: `requiredString` (text), `port` (number 1-65535) or
 *    `booleanFlag` (true/false). The validator also sets the TypeScript type
 *    of `envUtility.NAME`. If none fits, add a new validator next to these,
 *    built on `requiredString` so it stays required and non-empty, e.g.
 *    `requiredString.pipe(zod.enum(['debug', 'info']))`.
 * 3. Add it to `validEnv` in `env.spec.ts`, and to the `jest.mock` snippet in
 *    any spec that mocks this module and uses the new variable.
 * 4. Read it as `envUtility.NAME`. Never read `process.env` directly.
 */

// Load the repo-root .env (cwd is the repo root for nx serve and the TypeORM
// CLI). Existing process env vars, e.g. from Docker, are never overridden.
dotenv.config();

// Validators: reusable rules for a single variable. Pick one per variable in
// `backendEnvSchema`. Each one also decides the TypeScript type of
// `envUtility.NAME`. `.pipe(next)` runs `next` on the output of the previous
// step, so every validator first goes through `requiredString`.

/** Required, non-empty string. Trims surrounding whitespace. Type: `string`. */
export const requiredString = zod.string().trim().min(1);

/** Required TCP port, converted to a whole number in 1-65535. Type: `number`. */
export const port = requiredString.pipe(
  zod.coerce.number<string>().int().min(1).max(65535),
);

/**
 * Required boolean. Accepts true/false, 1/0, yes/no, on/off (any case).
 * Type: `boolean`.
 */
export const booleanFlag = requiredString.pipe(zod.stringbool());

/**
 * Every backend env var and its validator. Keys are the exact variable names in
 * `.env`.
 * Anything not listed here is ignored and not exposed by `envUtility`.
 */
const backendEnvSchema = zod.object({
  POSTGRES_HOST: requiredString,
  POSTGRES_PORT: port,
  POSTGRES_USER: requiredString,
  POSTGRES_PASSWORD: requiredString,
  POSTGRES_DB: requiredString,
  SWAGGER_ENABLED: booleanFlag,
  REGION: requiredString,
  AUTH_COGNITO_APP_CLIENT_ID: requiredString,
  AUTH_COGNITO_USER_POOL_ID: requiredString,
  AWS_ACCESS_KEY_ID: requiredString,
  AWS_SECRET_ACCESS_KEY: requiredString,
});

/**
 * Validates `source` against `schema` and returns the parsed, frozen result.
 *
 * @param schema Zod object schema; its keys are the allowed variable names.
 * @param source Raw env object (`process.env`).
 * @returns Only the declared keys, coerced to their declared types.
 * @throws Error naming every missing or invalid variable (names only, no values),
 * or if the schema declares a `VITE_` variable, which belongs to the frontend.
 */
export function parseEnv<Schema extends zod.ZodObject>(
  schema: Schema,
  source: Record<string, unknown>,
): Readonly<zod.infer<Schema>> {
  // Schema keys with the VITE_ prefix. Those belong in the frontend utility,
  // because Vite exposes them to the browser. Refuse them here.
  const frontendKeys = Object.keys(schema.shape).filter((key) =>
    key.startsWith('VITE_'),
  );
  if (frontendKeys.length > 0) {
    throw new Error(
      `VITE_ variables are exposed to the browser and belong in the frontend env utility: ${frontendKeys.join(', ')}`,
    );
  }

  // Run every validator at once. Keys not in the schema are dropped from `data`.
  const parseResult = schema.safeParse(source);
  if (parseResult.success) {
    // Freeze so no code can change env values at runtime.
    return Object.freeze(parseResult.data);
  }

  // Every variable that failed validation, each listed once. `issue.path[0]` is
  // the variable name. We only ever use names (never `issue.message`), so no
  // value ends up in the error.
  const failedVarNames = [
    ...new Set(parseResult.error.issues.map((issue) => String(issue.path[0]))),
  ];

  // A variable is "missing" if it is unset, empty, or whitespace only.
  // Anything else that failed was set but had the wrong format ("invalid").
  const isMissing = (varName: string) => {
    const rawValue = source[varName];
    return typeof rawValue !== 'string' || rawValue.trim() === '';
  };
  const missingVarNames = failedVarNames.filter(isMissing);
  const invalidVarNames = failedVarNames.filter(
    (varName) => !isMissing(varName),
  );

  // One error listing every problem
  const messageParts = ['Environment validation failed.'];
  if (missingVarNames.length > 0) {
    messageParts.push(`Missing: ${missingVarNames.join(', ')}.`);
  }
  if (invalidVarNames.length > 0) {
    messageParts.push(`Invalid: ${invalidVarNames.join(', ')}.`);
  }
  messageParts.push('See example.env for the expected variables.');
  throw new Error(messageParts.join(' '));
}

/** Validated backend env vars. See the module docs above. */
export const envUtility = parseEnv(backendEnvSchema, process.env);

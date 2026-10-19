import * as dotenv from 'dotenv';
import { z } from 'zod';

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
 * Adding a variable:
 * 1. Add it to `example.env`.
 * 2. Add one line to `backendEnvSchema` using a building block below.
 * 3. Add it to the `jest.mock` snippet in any spec that needs it.
 */

// Load the repo-root .env (cwd is the repo root for nx serve and the TypeORM
// CLI). Existing process env vars, e.g. from Docker, are never overridden.
dotenv.config();

/** Required, non-empty string. Trims surrounding whitespace. */
export const requiredString = z.string().trim().min(1);

/** Required TCP port, coerced to a number in 1-65535. */
export const port = requiredString.pipe(
  z.coerce.number<string>().int().min(1).max(65535),
);

/** Required boolean: accepts true/false, 1/0, yes/no, on/off (any case). */
export const booleanFlag = requiredString.pipe(z.stringbool());

const backendEnvSchema = z.object({
  POSTGRES_HOST: requiredString,
  POSTGRES_PORT: port,
  POSTGRES_USER: requiredString,
  POSTGRES_PASSWORD: requiredString,
  POSTGRES_DB: requiredString,
  PORT: port,
  SWAGGER_ENABLED: booleanFlag,
  REGION: requiredString,
  AUTH_COGNITO_APP_CLIENT_ID: requiredString,
  AUTH_COGNITO_USER_POOL_ID: requiredString,
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
export function parseEnv<S extends z.ZodObject>(
  schema: S,
  source: Record<string, unknown>,
): Readonly<z.infer<S>> {
  const frontendKeys = Object.keys(schema.shape).filter((key) =>
    key.startsWith('VITE_'),
  );
  if (frontendKeys.length > 0) {
    throw new Error(
      `VITE_ variables are exposed to the browser and belong in the frontend env utility: ${frontendKeys.join(', ')}`,
    );
  }

  const result = schema.safeParse(source);
  if (result.success) {
    return Object.freeze(result.data);
  }

  // Build the message from issue paths only; issue messages are never used,
  // so no value can end up in the error.
  const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
  const isBlank = (name: string) => {
    const value = source[name];
    return typeof value !== 'string' || value.trim() === '';
  };
  const missing = names.filter(isBlank);
  const invalid = names.filter((name) => !isBlank(name));

  const parts = ['Environment validation failed.'];
  if (missing.length > 0) parts.push(`Missing: ${missing.join(', ')}.`);
  if (invalid.length > 0) parts.push(`Invalid: ${invalid.join(', ')}.`);
  parts.push('See example.env for the expected variables.');
  throw new Error(parts.join(' '));
}

/** Validated backend env vars. See the module docs above. */
export const envUtility = parseEnv(backendEnvSchema, process.env);

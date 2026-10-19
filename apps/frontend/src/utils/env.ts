import { z } from 'zod';
import { rawEnv } from './envSource';

/**
 * Frontend environment variable utility.
 *
 * Behavior:
 * - Validation runs when this module is first imported, so a misconfigured
 *   app fails at startup instead of on first use.
 * - Every variable is required and must be non-empty (whitespace-only counts
 *   as empty). Values are trimmed and checked against the declared format.
 * - All problems are reported in a single thrown error that names every
 *   missing/invalid variable. Error messages contain variable NAMES only,
 *   never values.
 * - The returned object is frozen and contains only the declared keys.
 *
 * Security: Vite inlines every `VITE_` value into the public JS bundle, so
 * only public identifiers belong here (Cognito pool/client IDs, the API URL).
 * Never add secrets. Only `VITE_` keys are accepted, both by the type of
 * `parseEnv` and by a runtime check.
 *
 * Adding a variable:
 * 1. Add it to `example.env` with the `VITE_` prefix.
 * 2. Add one line to `frontendEnvSchema` using a building block below.
 * 3. Add it to the `jest.mock` snippet in any spec that needs it.
 */

/** Required, non-empty string. Trims surrounding whitespace. */
export const requiredString = z.string().trim().min(1);

/** Required absolute http(s) URL. */
export const url = requiredString.pipe(z.url({ protocol: /^https?$/ }));

const frontendEnvSchema = z.object({
  VITE_COGNITO_APP_CLIENT_ID: requiredString,
  VITE_COGNITO_USER_POOL_ID: requiredString,
  VITE_API_BASE_URL: url,
});

/** Compile-time error unless every key of the schema starts with `VITE_`. */
type VitePrefixedKeys<S extends z.ZodObject> = [
  Exclude<keyof S['shape'], `VITE_${string}`>,
] extends [never]
  ? unknown
  : { 'Frontend env keys must start with VITE_': never };

/**
 * Validates `source` against `schema` and returns the parsed, frozen result.
 *
 * @param schema Zod object schema; its keys are the allowed variable names.
 * @param source Raw env object (`import.meta.env`).
 * @returns Only the declared keys, coerced to their declared types.
 * @throws Error naming every missing or invalid variable (names only, no values),
 * or if the schema declares a key without the `VITE_` prefix.
 */
export function parseEnv<S extends z.ZodObject>(
  schema: S & VitePrefixedKeys<S>,
  source: Record<string, unknown>,
): Readonly<z.infer<S>> {
  const unprefixedKeys = Object.keys(schema.shape).filter(
    (key) => !key.startsWith('VITE_'),
  );
  if (unprefixedKeys.length > 0) {
    throw new Error(
      `Frontend env variables must be prefixed with VITE_: ${unprefixedKeys.join(', ')}`,
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

/** Validated frontend env vars. See the module docs above. */
export const envUtility = parseEnv(frontendEnvSchema, rawEnv);

// Zod is the validation library. Their docs call this export `z`
// but for the sake of readability, it is called zod in this repo.
import { z as zod } from 'zod';
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
 * Adding a variable (full checklist: README "Environment variables"):
 * 1. Add it to `example.env` WITH the `VITE_` prefix. Public values only.
 * 2. Add one line to `frontendEnvSchema`, choosing the validator below that
 *    matches the value: `requiredString` (text) or `url` (http/https URL).
 *    The validator also sets the TypeScript type of `envUtility.NAME`. If
 *    none fits, add a new validator next to these, built on `requiredString`
 *    so it stays required and non-empty.
 * 3. Add it to `validEnv` in `env.spec.ts`, and to the `jest.mock` snippet in
 *    any spec that mocks this module and uses the new variable.
 * 4. Add it as a build arg in `apps/frontend/Dockerfile` (ARG, ENV and the
 *    missing-args check) and to the frontend build commands in the README.
 * 5. Read it as `envUtility.NAME`. Never read `import.meta.env` directly.
 */

// Validators: reusable rules for a single variable. Pick one per variable in
// `frontendEnvSchema`. Each one also decides the TypeScript type of
// `envUtility.NAME`. `.pipe(next)` runs `next` on the output of the previous
// step, so every validator first goes through `requiredString`.

/** Required, non-empty string. Trims surrounding whitespace. Type: `string`. */
export const requiredString = zod.string().trim().min(1);

/** Required absolute URL starting with http:// or https://. Type: `string`. */
export const url = requiredString.pipe(zod.url({ protocol: /^https?$/ }));

/**
 * Every frontend env var and its validator. Keys are the exact variable names
 * in `.env` and must start with `VITE_`; anything not listed here is ignored
 * and not exposed by `envUtility`.
 */
const frontendEnvSchema = zod.object({
  VITE_COGNITO_APP_CLIENT_ID: requiredString,
  VITE_COGNITO_USER_POOL_ID: requiredString,
  VITE_API_BASE_URL: url,
});

/**
 * Compile-time check that every key of `Schema` starts with `VITE_`.
 * Resolves to `unknown` (no effect) when all keys are prefixed; otherwise to an
 * object type that the schema can't satisfy, so `parseEnv` fails to compile.
 */
type VitePrefixedKeys<Schema extends zod.ZodObject> = [
  Exclude<keyof Schema['shape'], `VITE_${string}`>,
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
export function parseEnv<Schema extends zod.ZodObject>(
  schema: Schema & VitePrefixedKeys<Schema>,
  source: Record<string, unknown>,
): Readonly<zod.infer<Schema>> {
  // Schema keys WITHOUT the VITE_ prefix. Vite never exposes those to the
  // browser, so they can't be frontend vars. Runtime backup for the
  // compile-time `VitePrefixedKeys` check.
  const unprefixedKeys = Object.keys(schema.shape).filter(
    (key) => !key.startsWith('VITE_'),
  );
  if (unprefixedKeys.length > 0) {
    throw new Error(
      `Frontend env variables must be prefixed with VITE_: ${unprefixedKeys.join(', ')}`,
    );
  }

  // Run every validator at once. `safeParse` never throws. 
  // Keys not in the schema are dropped from `data`.
  const parseResult = schema.safeParse(source);
  if (parseResult.success) {
    // Freeze so no code can change env values at runtime.
    return Object.freeze(parseResult.data);
  }

  // Every variable that failed validation, each listed once. `issue.path[0]` is
  // the variable name. We only ever use names (never `issue.message`), so no
  // value can end up in the error.
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

/** Validated frontend env vars. See the module docs above. */
export const envUtility = parseEnv(frontendEnvSchema, rawEnv);

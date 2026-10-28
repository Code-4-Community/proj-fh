/**
 * The raw bundler env object. This is the ONLY file that reads
 * `import.meta.env`; everything else goes through `envUtility` in ./env.
 *
 * It lives in its own module because ts-jest (CommonJS) cannot compile
 * `import.meta`, so specs mock this file to supply a fake env object.
 */
export const rawEnv: Record<string, unknown> = import.meta.env;

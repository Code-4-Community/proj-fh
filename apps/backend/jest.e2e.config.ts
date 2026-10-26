/* eslint-disable */
// E2E tests boot the real backend against a throwaway Postgres container.
// Run with `yarn test:e2e`. Kept separate from jest.config.ts so `yarn test`
// (and the CI Jest job) never needs Docker. The *.e2e-spec.ts naming is
// deliberate: it does NOT match the Nx preset's testMatch, so the unit-test
// config never picks these files up.
export default {
  displayName: 'backend-e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  globalSetup: '<rootDir>/test/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/test/e2e/global-teardown.ts',
  testTimeout: 30_000,
};

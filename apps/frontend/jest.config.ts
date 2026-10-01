export default {
	displayName: 'frontend',
	preset: '../../jest.preset.js',
	testEnvironment: 'node',
	transform: {
		'^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
	},
	moduleFileExtensions: ['ts', 'js', 'html'],
	testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
	coverageDirectory: '../../coverage/apps/frontend',
};

export default {
	displayName: 'frontend',
	preset: '../../jest.preset.js',
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'html'],
	testMatch: ['<rootDir>/src/**/*.spec.ts(x)', '<rootDir>/src/**/*.test.ts?(x)'],
	coverageDirectory: '../../coverage/apps/frontend',
};

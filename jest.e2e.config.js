/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'node',
        },
      },
    ],
  },
  testMatch: ['**/__tests__/e2e/**/*.e2e.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: 'coverage-e2e',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.e2e.test.ts',
    '!src/__tests__/**',
    '!src/presentation/cli.ts', // CLI uses import.meta which causes issues with coverage
  ],
  // Coverage thresholds are not applicable for e2e tests that spawn CLI processes
  // as Jest cannot track coverage across process boundaries
  testTimeout: 30000, // E2E tests may take longer
  maxWorkers: 1, // Run e2e tests sequentially to avoid conflicts
};
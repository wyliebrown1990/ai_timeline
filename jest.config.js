/**
 * Jest configuration for unit tests
 * @see https://jestjs.io/docs/configuration
 */
export default {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'jsdom',

  // Setup files after environment is ready
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test file patterns
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],

  // Module path aliases matching tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment - use node for VS Code extensions
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: './',

  // Test match patterns
  testMatch: [
    '**/src/test/suite/**/*.test.ts'
  ],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Critical paths require higher coverage
    './src/services/profile-service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/board-sync-service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/config-state-tracker.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Module name mapper for absolute imports
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/mocks/vscode-mock.ts',
    '^vscode-arduino-api$': '<rootDir>/src/test/mocks/arduino-api-mock.ts'
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/out/'
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Timeout for tests (10 seconds)
  testTimeout: 10000
};

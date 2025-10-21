/**
 * Global test setup for Jest
 *
 * This file runs once before all tests and sets up the global test environment.
 */

// Set up test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for async operations in tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly enabled
  log: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
  info: jest.fn(),
  debug: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Restore all mocks
  jest.restoreAllMocks();
});

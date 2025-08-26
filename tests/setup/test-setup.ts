/**
 * Global test setup for unit and integration tests
 * This file is executed before all tests run
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Import VS Code mocks setup
import '../mocks/setup';

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VSCODE_TEST_MODE = 'true';
  
  // Initialize any global test resources
  console.log('🧪 Initializing test environment...');
});

afterAll(async () => {
  // Clean up global test resources
  console.log('🧹 Cleaning up test environment...');
});

beforeEach(() => {
  // Reset any global state before each test
  // This ensures test isolation
});

afterEach(() => {
  // Clean up after each test
  // Clear any mocks or temporary state
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, let the test framework handle it
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, let the test framework handle it
});

// Export test utilities that can be used across tests
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Create a mock function with proper typing
   */
  createMockFn: <T extends (...args: any[]) => any>(): T => {
    return (() => {}) as T;
  },
  
  /**
   * Generate a unique test ID
   */
  generateTestId: (): string => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Create a temporary directory path for testing
   */
  createTempPath: (): string => `/tmp/kiro-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};
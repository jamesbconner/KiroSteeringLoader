/**
 * Global test setup for unit and integration tests
 * This file is executed before all tests run
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Import VS Code mocks setup
import '../mocks/setup';
import { setupGlobalFailureHandling } from '../utils/failureHandler';

// Determine test type from environment or config
const getTestType = (): 'unit' | 'integration' | 'e2e' | 'performance' | 'memory' => {
  const configPath = process.env.VITEST_CONFIG || '';
  if (configPath.includes('unit')) return 'unit';
  if (configPath.includes('integration')) return 'integration';
  if (configPath.includes('e2e')) return 'e2e';
  if (configPath.includes('performance')) return 'performance';
  if (configPath.includes('memory')) return 'memory';
  
  // Check test file patterns
  const testFile = process.env.VITEST_TEST_FILE || '';
  if (testFile.includes('/unit/')) return 'unit';
  if (testFile.includes('/integration/')) return 'integration';
  if (testFile.includes('/e2e/')) return 'e2e';
  if (testFile.includes('/performance/')) return 'performance';
  if (testFile.includes('/memory/')) return 'memory';
  
  // Default to unit tests
  return 'unit';
};

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VSCODE_TEST_MODE = 'true';
  
  // Setup failure handling
  const testType = getTestType();
  setupGlobalFailureHandling(testType);
  
  // Initialize any global test resources
  console.log(`🧪 Initializing test environment for ${testType} tests...`);
});

afterAll(async () => {
  // Save failure report if there were any failures
  try {
    const { getGlobalFailureHandler } = await import('../utils/failureHandler');
    const handler = getGlobalFailureHandler();
    await handler.saveFailureReport();
  } catch (error) {
    // Handler might not be initialized if no failures occurred
  }
  
  // Remove error handlers to prevent memory leaks
  if (unhandledRejectionHandler) {
    process.removeListener('unhandledRejection', unhandledRejectionHandler);
  }
  if (uncaughtExceptionHandler) {
    process.removeListener('uncaughtException', uncaughtExceptionHandler);
  }
  
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
let unhandledRejectionHandler: (reason: any, promise: Promise<any>) => void;
let uncaughtExceptionHandler: (error: Error) => void;

// Set up error handlers
unhandledRejectionHandler = (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, let the test framework handle it
};

uncaughtExceptionHandler = (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, let the test framework handle it
};

// Increase max listeners to prevent warnings
process.setMaxListeners(50);

process.on('unhandledRejection', unhandledRejectionHandler);
process.on('uncaughtException', uncaughtExceptionHandler);

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
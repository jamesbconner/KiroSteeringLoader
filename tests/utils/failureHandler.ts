/**
 * Test Failure Handler Utility
 * 
 * This utility provides centralized failure handling for all test types.
 * It integrates with the failure handling configuration and provides
 * consistent error reporting and recovery mechanisms.
 */

import { afterEach, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTestTypeConfig, getEnvironmentConfig } from '../config/failure-handling.config.js';

export interface TestFailure {
  testName: string;
  testFile: string;
  error: Error;
  duration: number;
  timestamp: Date;
  retryCount: number;
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'memory';
  context?: Record<string, any>;
}

export interface TestArtifacts {
  screenshots?: string[];
  logs?: string[];
  dumps?: string[];
  traces?: string[];
}

export class TestFailureHandler {
  private failures: TestFailure[] = [];
  private artifacts: Map<string, TestArtifacts> = new Map();
  private retryCount: Map<string, number> = new Map();
  private testType: string;
  private config: any;

  constructor(testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'memory') {
    this.testType = testType;
    this.config = getTestTypeConfig(testType);
  }

  /**
   * Handle test failure
   */
  async handleFailure(testName: string, testFile: string, error: Error, duration: number): Promise<boolean> {
    const testKey = `${testFile}:${testName}`;
    const currentRetryCount = this.retryCount.get(testKey) || 0;

    const failure: TestFailure = {
      testName,
      testFile,
      error,
      duration,
      timestamp: new Date(),
      retryCount: currentRetryCount,
      testType: this.testType as any,
      context: this.gatherTestContext()
    };

    this.failures.push(failure);

    // Save test artifacts
    await this.saveTestArtifacts(testKey, failure);

    // Check if we should retry
    if (currentRetryCount < this.config.maxRetries) {
      this.retryCount.set(testKey, currentRetryCount + 1);
      console.log(`🔄 Retrying test "${testName}" (attempt ${currentRetryCount + 2}/${this.config.maxRetries + 1})`);
      return true; // Indicate retry
    }

    // Log failure details
    this.logFailure(failure);

    // Check if we should stop on first failure
    if (this.config.stopOnFirstFailure) {
      console.log('🛑 Stopping test execution due to failure (stopOnFirstFailure enabled)');
      process.exit(1);
    }

    return false; // No retry
  }

  /**
   * Gather test context information
   */
  private gatherTestContext(): Record<string, any> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        CI: process.env.CI,
        GITHUB_ACTIONS: process.env.GITHUB_ACTIONS
      }
    };
  }

  /**
   * Save test artifacts
   */
  private async saveTestArtifacts(testKey: string, failure: TestFailure): Promise<void> {
    const artifactsDir = path.join('coverage', 'artifacts', this.testType);
    
    // Ensure artifacts directory exists
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const artifacts: TestArtifacts = {};

    try {
      // Save error details
      const errorFile = path.join(artifactsDir, `${this.sanitizeFilename(testKey)}-error.json`);
      fs.writeFileSync(errorFile, JSON.stringify({
        testName: failure.testName,
        testFile: failure.testFile,
        error: {
          name: failure.error.name,
          message: failure.error.message,
          stack: failure.error.stack
        },
        duration: failure.duration,
        timestamp: failure.timestamp,
        retryCount: failure.retryCount,
        context: failure.context
      }, null, 2));

      // Save console logs if available
      if (this.config.debugging?.verboseLogging) {
        const logFile = path.join(artifactsDir, `${this.sanitizeFilename(testKey)}-logs.txt`);
        // In a real implementation, you would capture console output
        fs.writeFileSync(logFile, `Test logs for ${failure.testName}\nError: ${failure.error.message}\nStack: ${failure.error.stack}`);
        artifacts.logs = [logFile];
      }

      // Save memory dump for memory tests
      if (this.testType === 'memory' || this.testType === 'performance') {
        const memoryDump = path.join(artifactsDir, `${this.sanitizeFilename(testKey)}-memory.json`);
        fs.writeFileSync(memoryDump, JSON.stringify({
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }, null, 2));
        artifacts.dumps = [memoryDump];
      }

      this.artifacts.set(testKey, artifacts);
    } catch (error) {
      console.warn(`Warning: Could not save test artifacts: ${error.message}`);
    }
  }

  /**
   * Sanitize filename for safe file system operations
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  }

  /**
   * Log failure details
   */
  private logFailure(failure: TestFailure): void {
    console.error(`\n❌ Test Failure: ${failure.testName}`);
    console.error(`   File: ${failure.testFile}`);
    console.error(`   Duration: ${failure.duration}ms`);
    console.error(`   Retry Count: ${failure.retryCount}`);
    console.error(`   Error: ${failure.error.message}`);
    
    if (this.config.debugging?.verboseLogging) {
      console.error(`   Stack: ${failure.error.stack}`);
    }
  }

  /**
   * Get failure summary
   */
  getFailureSummary(): { total: number; byType: Record<string, number>; failures: TestFailure[] } {
    const byType: Record<string, number> = {};
    
    for (const failure of this.failures) {
      const errorType = failure.error.name || 'Unknown';
      byType[errorType] = (byType[errorType] || 0) + 1;
    }

    return {
      total: this.failures.length,
      byType,
      failures: this.failures
    };
  }

  /**
   * Save failure report
   */
  async saveFailureReport(): Promise<string | null> {
    if (this.failures.length === 0) {
      return null;
    }

    const reportDir = 'coverage';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `${this.testType}-failures-${timestamp}.json`);

    const report = {
      testType: this.testType,
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: this.getFailureSummary(),
      failures: this.failures,
      artifacts: Object.fromEntries(this.artifacts)
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`💾 Failure report saved to: ${reportFile}`);
    
    return reportFile;
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.failures = [];
    this.artifacts.clear();
    this.retryCount.clear();
  }

  /**
   * Check if test should be skipped based on previous failures
   */
  shouldSkipTest(testName: string, testFile: string): boolean {
    const testKey = `${testFile}:${testName}`;
    const retryCount = this.retryCount.get(testKey) || 0;
    
    // Skip if we've exceeded max retries
    return retryCount > this.config.maxRetries;
  }

  /**
   * Setup failure handling hooks
   */
  setupHooks(): void {
    let currentTest: { name: string; file: string; startTime: number } | null = null;

    beforeEach((context) => {
      currentTest = {
        name: context.task?.name || 'Unknown Test',
        file: context.task?.file?.name || 'Unknown File',
        startTime: Date.now()
      };
    });

    afterEach(async (context) => {
      if (context.task?.result?.state === 'fail' && currentTest) {
        const duration = Date.now() - currentTest.startTime;
        const error = context.task.result.errors?.[0] || new Error('Unknown test failure');
        
        await this.handleFailure(
          currentTest.name,
          currentTest.file,
          error,
          duration
        );
      }
      
      currentTest = null;
    });
  }
}

/**
 * Create a failure handler for a specific test type
 */
export function createFailureHandler(testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'memory'): TestFailureHandler {
  return new TestFailureHandler(testType);
}

/**
 * Global failure handler instance
 */
let globalFailureHandler: TestFailureHandler | null = null;

/**
 * Get or create global failure handler
 */
export function getGlobalFailureHandler(testType?: 'unit' | 'integration' | 'e2e' | 'performance' | 'memory'): TestFailureHandler {
  if (!globalFailureHandler && testType) {
    globalFailureHandler = new TestFailureHandler(testType);
  }
  
  if (!globalFailureHandler) {
    throw new Error('Global failure handler not initialized. Call with testType first.');
  }
  
  return globalFailureHandler;
}

/**
 * Setup global failure handling
 */
export function setupGlobalFailureHandling(testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'memory'): void {
  const handler = getGlobalFailureHandler(testType);
  handler.setupHooks();
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('🚨 Uncaught Exception:', error);
    await handler.handleFailure('Uncaught Exception', 'process', error, 0);
    
    // Don't call process.exit in test environment to avoid infinite loops with Vitest
    if (process.env.NODE_ENV !== 'test' && process.env.VSCODE_TEST_MODE !== 'true') {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('🚨 Unhandled Promise Rejection:', error);
    await handler.handleFailure('Unhandled Promise Rejection', 'process', error, 0);
    
    // Don't call process.exit in test environment to avoid infinite loops with Vitest
    if (process.env.NODE_ENV !== 'test' && process.env.VSCODE_TEST_MODE !== 'true') {
      process.exit(1);
    }
  });
}

export default TestFailureHandler;
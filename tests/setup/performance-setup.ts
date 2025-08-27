/**
 * Performance Test Setup
 * Configures the test environment for performance testing
 */

import { beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Global performance test configuration
const PERFORMANCE_CONFIG = {
  // Ensure coverage directory exists for performance reports
  coverageDir: path.join(process.cwd(), 'coverage'),
  
  // Performance test timeout settings
  defaultTimeout: 60000,
  
  // Memory monitoring settings
  enableMemoryMonitoring: true,
  
  // Performance report settings
  generateReports: true
};

/**
 * Global setup for performance tests
 */
beforeAll(async () => {
  console.log('Setting up performance test environment...');
  
  // Ensure coverage directory exists for performance reports
  if (!fs.existsSync(PERFORMANCE_CONFIG.coverageDir)) {
    fs.mkdirSync(PERFORMANCE_CONFIG.coverageDir, { recursive: true });
  }
  
  // Clear any existing performance reports
  const performanceReportPath = path.join(PERFORMANCE_CONFIG.coverageDir, 'performance-report.json');
  const performanceBaselinePath = path.join(PERFORMANCE_CONFIG.coverageDir, 'performance-baseline.json');
  
  // Don't delete existing baseline, but clear the current report
  if (fs.existsSync(performanceReportPath)) {
    fs.unlinkSync(performanceReportPath);
  }
  
  // Set up memory monitoring if enabled
  if (PERFORMANCE_CONFIG.enableMemoryMonitoring) {
    // Force garbage collection before tests if available
    if (global.gc) {
      global.gc();
    }
    
    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log('Initial memory usage:', {
      rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(initialMemory.external / 1024 / 1024).toFixed(2)} MB`
    });
  }
  
  // Set up performance monitoring
  console.log('Performance test configuration:', PERFORMANCE_CONFIG);
  
  // Warm up the test environment
  console.log('Warming up test environment...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Performance test environment ready.');
});

/**
 * Global cleanup for performance tests
 */
afterAll(async () => {
  console.log('Cleaning up performance test environment...');
  
  // Log final memory usage if monitoring is enabled
  if (PERFORMANCE_CONFIG.enableMemoryMonitoring) {
    const finalMemory = process.memoryUsage();
    console.log('Final memory usage:', {
      rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(finalMemory.external / 1024 / 1024).toFixed(2)} MB`
    });
    
    // Force garbage collection after tests if available
    if (global.gc) {
      global.gc();
      
      const afterGcMemory = process.memoryUsage();
      console.log('Memory usage after GC:', {
        rss: `${(afterGcMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(afterGcMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(afterGcMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(afterGcMemory.external / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }
  
  console.log('Performance test environment cleanup complete.');
});

/**
 * Performance test utilities
 */
export const performanceUtils = {
  /**
   * Measure execution time of a function
   */
  async measureTime<T>(fn: () => Promise<T> | T, label?: string): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration}ms`);
    }
    
    return { result, duration };
  },
  
  /**
   * Get current memory usage
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  },
  
  /**
   * Format memory usage for display
   */
  formatMemoryUsage(memory: NodeJS.MemoryUsage): Record<string, string> {
    return {
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(memory.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
    };
  },
  
  /**
   * Wait for a specified amount of time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag for more accurate memory measurements.');
    }
  }
};

// Export configuration for use in tests
export { PERFORMANCE_CONFIG };
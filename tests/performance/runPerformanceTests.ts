/**
 * Performance Test Runner
 * Alternative runner for performance tests using Vitest directly
 * This is useful for debugging or running performance tests with specific configurations
 */

import { startVitest } from 'vitest/node';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

/**
 * Configuration for performance test execution
 */
interface PerformanceTestConfig {
  /** Test file patterns to include */
  include: string[];
  /** Test file patterns to exclude */
  exclude: string[];
  /** Enable memory monitoring */
  memoryMonitoring: boolean;
  /** Enable watch mode */
  watch: boolean;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Generate performance reports */
  generateReports: boolean;
  /** Enable garbage collection exposure */
  exposeGc: boolean;
}

/**
 * Default configuration for performance tests
 */
const DEFAULT_CONFIG: PerformanceTestConfig = {
  include: ['tests/performance/**/*.test.ts'],
  exclude: [
    'node_modules/**',
    'out/**',
    '.vscode-test/**',
    'tests/unit/**',
    'tests/integration/**',
    'tests/e2e/**'
  ],
  memoryMonitoring: true,
  watch: false,
  timeout: 300000, // 5 minutes for performance tests
  generateReports: true,
  exposeGc: true
};

/**
 * Setup performance test environment
 */
function setupPerformanceEnvironment(config: PerformanceTestConfig): void {
  // Ensure coverage directory exists for performance reports
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const coverageDir = path.resolve(__dirname, '../../coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  // Set environment variables for performance tests
  process.env.NODE_ENV = 'test';
  process.env.PERFORMANCE_TEST = 'true';
  
  if (config.memoryMonitoring) {
    process.env.ENABLE_MEMORY_MONITORING = 'true';
  }
  
  if (config.generateReports) {
    process.env.GENERATE_PERFORMANCE_REPORTS = 'true';
  }
  
  // Warn if GC is not exposed but memory monitoring is enabled
  if (config.memoryMonitoring && config.exposeGc && !global.gc) {
    console.warn('⚠️  Garbage collection not exposed. Run with --expose-gc for accurate memory measurements.');
    console.warn('   Example: node --expose-gc tests/performance/runPerformanceTests.js');
  }
}

/**
 * Main function to run performance tests with Vitest
 */
async function main(config: Partial<PerformanceTestConfig> = {}): Promise<void> {
  try {
    console.log('⚡ Starting performance test execution...');
    
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Setup performance test environment
    setupPerformanceEnvironment(finalConfig);
    
    console.log('Performance test configuration:', {
      include: finalConfig.include,
      memoryMonitoring: finalConfig.memoryMonitoring,
      watch: finalConfig.watch,
      timeout: finalConfig.timeout,
      generateReports: finalConfig.generateReports,
      exposeGc: finalConfig.exposeGc && !!global.gc
    });
    
    // Log initial system information
    console.log('System information:', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      }
    });
    
    // Start Vitest programmatically using the existing performance config
    const vitest = await startVitest('test', [], {
      config: './vitest.performance.config.ts',
      watch: finalConfig.watch,
      run: !finalConfig.watch
    });
    
    if (!vitest) {
      throw new Error('Failed to start Vitest for performance tests');
    }
    
    // Wait for tests to complete if not in watch mode
    if (!finalConfig.watch) {
      await vitest.close();
      
      // Generate performance report if enabled
      if (finalConfig.generateReports) {
        await generatePerformanceReport();
      }
      
      console.log('✅ Performance tests completed successfully');
    } else {
      console.log('👀 Performance tests running in watch mode...');
    }
    
  } catch (error) {
    console.error('❌ Performance tests failed:', error);
    process.exit(1);
  }
}

/**
 * Generate performance report from test results
 */
async function generatePerformanceReport(): Promise<void> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resultsPath = path.resolve(__dirname, '../../coverage/performance-results.json');
    const reportPath = path.resolve(__dirname, '../../coverage/performance-report.json');
    const markdownReportPath = path.resolve(__dirname, '../../coverage/performance-report.md');
    
    if (!fs.existsSync(resultsPath)) {
      console.warn('⚠️  Performance results file not found, skipping report generation');
      return;
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    // Extract performance metrics from test results
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      testSuite: 'Performance Tests',
      totalTests: results.numTotalTests || 0,
      passedTests: results.numPassedTests || 0,
      failedTests: results.numFailedTests || 0,
      duration: results.testResults?.reduce((total: number, test: any) => {
        return total + (test.perfStats?.runtime || 0);
      }, 0) || 0,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    // Write JSON report
    fs.writeFileSync(reportPath, JSON.stringify(performanceMetrics, null, 2));
    
    // Write Markdown report
    const markdownReport = `# Performance Test Report

Generated: ${performanceMetrics.timestamp}

## Summary
- **Total Tests**: ${performanceMetrics.totalTests}
- **Passed**: ${performanceMetrics.passedTests}
- **Failed**: ${performanceMetrics.failedTests}
- **Total Duration**: ${performanceMetrics.duration}ms

## System Information
- **Node Version**: ${performanceMetrics.nodeVersion}
- **Platform**: ${performanceMetrics.platform}

## Memory Usage
- **RSS**: ${(performanceMetrics.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB
- **Heap Total**: ${(performanceMetrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
- **Heap Used**: ${(performanceMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
- **External**: ${(performanceMetrics.memoryUsage.external / 1024 / 1024).toFixed(2)} MB

## Test Results
${results.testResults?.map((test: any) => `
### ${test.name || 'Unknown Test'}
- **Status**: ${test.status || 'unknown'}
- **Duration**: ${test.perfStats?.runtime || 0}ms
`).join('') || 'No detailed test results available'}
`;
    
    fs.writeFileSync(markdownReportPath, markdownReport);
    
    console.log(`📊 Performance report generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownReportPath}`);
    
  } catch (error) {
    console.warn('⚠️  Failed to generate performance report:', error);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<PerformanceTestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<PerformanceTestConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--watch':
      case '-w':
        config.watch = true;
        break;
      case '--no-memory':
        config.memoryMonitoring = false;
        break;
      case '--no-reports':
        config.generateReports = false;
        break;
      case '--no-gc':
        config.exposeGc = false;
        break;
      case '--timeout':
        const timeout = parseInt(args[++i]);
        if (!isNaN(timeout)) {
          config.timeout = timeout;
        }
        break;
      case '--help':
      case '-h':
        console.log(`
Performance Test Runner

Usage: node tests/performance/runPerformanceTests.js [options]

Options:
  --watch, -w        Run tests in watch mode
  --no-memory        Disable memory monitoring
  --no-reports       Disable performance report generation
  --no-gc            Don't expect garbage collection to be exposed
  --timeout <ms>     Set test timeout in milliseconds
  --help, -h         Show this help message

Examples:
  node --expose-gc tests/performance/runPerformanceTests.js           # Run with GC exposed (recommended)
  node tests/performance/runPerformanceTests.js --watch               # Run in watch mode
  node tests/performance/runPerformanceTests.js --no-memory           # Run without memory monitoring
  node tests/performance/runPerformanceTests.js --timeout 600000      # Set 10 minute timeout
        `);
        process.exit(0);
        break;
    }
  }
  
  return config;
}

// Run if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1]) === resolve(__filename);

if (isMainModule) {
  const config = parseArgs();
  main(config);
}

export { main, PerformanceTestConfig };
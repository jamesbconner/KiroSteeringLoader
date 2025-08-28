/**
 * Integration Test Runner
 * Alternative runner for integration tests using Vitest directly
 * This is useful for debugging or running integration tests with specific configurations
 */

import { startVitest } from 'vitest/node';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

/**
 * Configuration for integration test execution
 */
interface IntegrationTestConfig {
  /** Test file patterns to include */
  include: string[];
  /** Test file patterns to exclude */
  exclude: string[];
  /** Enable coverage reporting */
  coverage: boolean;
  /** Enable watch mode */
  watch: boolean;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Run tests sequentially to avoid conflicts */
  sequential: boolean;
  /** Enable detailed logging */
  verbose: boolean;
}

/**
 * Default configuration for integration tests
 */
const DEFAULT_CONFIG: IntegrationTestConfig = {
  include: ['tests/integration/**/*.test.ts'],
  exclude: [
    'node_modules/**',
    'out/**',
    '.vscode-test/**',
    'tests/unit/**',
    'tests/performance/**',
    'tests/e2e/**'
  ],
  coverage: true,
  watch: false,
  timeout: 60000, // 1 minute for integration tests
  sequential: true, // Integration tests may have dependencies
  verbose: true
};

/**
 * Setup integration test environment
 */
function setupIntegrationEnvironment(config: IntegrationTestConfig): void {
  // Get current directory from import.meta.url
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  
  // Ensure coverage directory exists
  const coverageDir = path.resolve(__dirname, '../../coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  // Set environment variables for integration tests
  process.env.NODE_ENV = 'test';
  process.env.INTEGRATION_TEST = 'true';
  
  if (config.verbose) {
    process.env.VERBOSE_LOGGING = 'true';
  }
  
  // Clean up any previous test artifacts
  const testArtifacts = [
    path.resolve(coverageDir, 'integration-test-results.json'),
    path.resolve(coverageDir, 'integration-test-results.html')
  ];
  
  testArtifacts.forEach(artifact => {
    if (fs.existsSync(artifact)) {
      try {
        fs.unlinkSync(artifact);
      } catch (error) {
        console.warn(`⚠️  Could not clean up ${artifact}:`, error);
      }
    }
  });
}

/**
 * Main function to run integration tests with Vitest
 */
async function main(config: Partial<IntegrationTestConfig> = {}): Promise<void> {
  try {
    console.log('🔗 Starting integration test execution...');
    
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Setup integration test environment
    setupIntegrationEnvironment(finalConfig);
    
    console.log('Integration test configuration:', {
      include: finalConfig.include,
      coverage: finalConfig.coverage,
      watch: finalConfig.watch,
      timeout: finalConfig.timeout,
      sequential: finalConfig.sequential,
      verbose: finalConfig.verbose
    });
    
    // Log system information for debugging
    if (finalConfig.verbose) {
      console.log('System information:', {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      });
    }
    
    // Start Vitest programmatically with integration-specific configuration
    const vitest = await startVitest('test', [], {
      config: './vitest.integration.config.ts',
      watch: finalConfig.watch,
      run: !finalConfig.watch
    });
    
    if (!vitest) {
      throw new Error('Failed to start Vitest for integration tests');
    }
    
    // Wait for tests to complete if not in watch mode
    if (!finalConfig.watch) {
      await vitest.close();
      
      // Generate integration test summary
      await generateIntegrationSummary(finalConfig);
      
      console.log('✅ Integration tests completed successfully');
    } else {
      console.log('👀 Integration tests running in watch mode...');
    }
    
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  }
}

/**
 * Generate integration test summary
 */
async function generateIntegrationSummary(config: IntegrationTestConfig): Promise<void> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resultsPath = path.resolve(__dirname, '../../coverage/integration-test-results.json');
    
    if (!fs.existsSync(resultsPath)) {
      console.warn('⚠️  Integration test results file not found, skipping summary generation');
      return;
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    console.log('\n📋 Integration Test Summary:');
    console.log(`   Total Tests: ${results.numTotalTests || 0}`);
    console.log(`   Passed: ${results.numPassedTests || 0}`);
    console.log(`   Failed: ${results.numFailedTests || 0}`);
    console.log(`   Skipped: ${results.numPendingTests || 0}`);
    
    if (results.testResults && config.verbose) {
      console.log('\n📝 Test Details:');
      results.testResults.forEach((test: any, index: number) => {
        const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
        const duration = test.perfStats?.runtime ? `(${test.perfStats.runtime}ms)` : '';
        console.log(`   ${status} ${test.name || `Test ${index + 1}`} ${duration}`);
      });
    }
    
    if (results.numFailedTests > 0) {
      console.log('\n❌ Failed Tests:');
      results.testResults?.forEach((test: any) => {
        if (test.status === 'failed') {
          console.log(`   - ${test.name || 'Unknown Test'}`);
          if (test.message) {
            console.log(`     Error: ${test.message}`);
          }
        }
      });
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to generate integration test summary:', error);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<IntegrationTestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<IntegrationTestConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--watch':
      case '-w':
        config.watch = true;
        break;
      case '--no-coverage':
        config.coverage = false;
        break;
      case '--parallel':
        config.sequential = false;
        break;
      case '--quiet':
      case '-q':
        config.verbose = false;
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
Integration Test Runner

Usage: node tests/integration/runIntegrationTests.js [options]

Options:
  --watch, -w        Run tests in watch mode
  --no-coverage      Disable coverage reporting
  --parallel         Run tests in parallel (default: sequential)
  --quiet, -q        Reduce output verbosity
  --timeout <ms>     Set test timeout in milliseconds
  --help, -h         Show this help message

Examples:
  node tests/integration/runIntegrationTests.js                    # Run all integration tests
  node tests/integration/runIntegrationTests.js --watch            # Run tests in watch mode
  node tests/integration/runIntegrationTests.js --no-coverage      # Run without coverage
  node tests/integration/runIntegrationTests.js --parallel         # Run tests in parallel
  node tests/integration/runIntegrationTests.js --timeout 120000   # Set 2 minute timeout
        `);
        process.exit(0);
        break;
    }
  }
  
  return config;
}

// Run if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1]) === __filename;

if (isMainModule) {
  const config = parseArgs();
  main(config);
}

export { main, IntegrationTestConfig };
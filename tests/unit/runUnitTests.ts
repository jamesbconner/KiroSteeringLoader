/**
 * Unit Test Runner
 * Alternative runner for unit tests using Vitest directly
 * This is useful for debugging or running tests outside of npm scripts
 */

import { startVitest } from 'vitest/node';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for unit test execution
 */
interface UnitTestConfig {
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
}

/**
 * Default configuration for unit tests
 */
const DEFAULT_CONFIG: UnitTestConfig = {
  include: ['tests/unit/**/*.test.ts'],
  exclude: [
    'node_modules/**',
    'out/**',
    '.vscode-test/**',
    'tests/e2e/**',
    'tests/integration/**',
    'tests/performance/**'
  ],
  coverage: true,
  watch: false,
  timeout: 30000
};

/**
 * Main function to run unit tests with Vitest
 */
async function main(config: Partial<UnitTestConfig> = {}): Promise<void> {
  try {
    console.log('🧪 Starting unit test execution...');
    
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Ensure coverage directory exists
    const coverageDir = path.resolve(__dirname, '../../coverage');
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    
    console.log('Unit test configuration:', {
      include: finalConfig.include,
      coverage: finalConfig.coverage,
      watch: finalConfig.watch,
      timeout: finalConfig.timeout
    });
    
    // Start Vitest programmatically using the existing config
    const vitest = await startVitest('test', [], {
      config: './vitest.unit.config.ts',
      watch: finalConfig.watch,
      run: !finalConfig.watch
    });
    
    if (!vitest) {
      throw new Error('Failed to start Vitest');
    }
    
    // Wait for tests to complete if not in watch mode
    if (!finalConfig.watch) {
      await vitest.close();
      console.log('✅ Unit tests completed successfully');
    } else {
      console.log('👀 Unit tests running in watch mode...');
    }
    
  } catch (error) {
    console.error('❌ Unit tests failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<UnitTestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<UnitTestConfig> = {};
  
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
      case '--timeout':
        const timeout = parseInt(args[++i]);
        if (!isNaN(timeout)) {
          config.timeout = timeout;
        }
        break;
      case '--help':
      case '-h':
        console.log(`
Unit Test Runner

Usage: node tests/unit/runUnitTests.js [options]

Options:
  --watch, -w        Run tests in watch mode
  --no-coverage      Disable coverage reporting
  --timeout <ms>     Set test timeout in milliseconds
  --help, -h         Show this help message

Examples:
  node tests/unit/runUnitTests.js                    # Run all unit tests once
  node tests/unit/runUnitTests.js --watch            # Run tests in watch mode
  node tests/unit/runUnitTests.js --no-coverage      # Run without coverage
  node tests/unit/runUnitTests.js --timeout 60000    # Set 60 second timeout
        `);
        process.exit(0);
        break;
    }
  }
  
  return config;
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('runUnitTests.ts')) {
  const config = parseArgs();
  main(config);
}

export { main, UnitTestConfig };
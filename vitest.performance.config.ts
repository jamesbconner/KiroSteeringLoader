import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Performance test environment
    environment: 'node',
    
    // Performance test file patterns
    include: ['tests/performance/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'out/**',
      '.vscode-test/**',
      'tests/unit/**',
      'tests/integration/**',
      'tests/e2e/**'
    ],
    
    // Performance test setup
    setupFiles: ['./tests/setup/performance-setup.ts'],
    
    // Longer timeouts for performance tests
    testTimeout: 60000, // 1 minute for performance tests
    hookTimeout: 30000,
    teardownTimeout: 15000,
    
    // Sequential execution for performance tests to avoid interference
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Reporter configuration for performance tests
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './coverage/performance-results.json'
    },
    
    // No coverage for performance tests (they test performance, not code coverage)
    coverage: {
      enabled: false
    },
    
    // Performance test specific configuration
    logHeapUsage: true,
    
    // Retry configuration for performance tests (to handle timing variations)
    retry: 1
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  },
  
  // Define global variables for performance tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.TEST_TYPE': '"performance"'
  }
});
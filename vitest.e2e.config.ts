import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // E2E test environment
    environment: 'node',
    
    // E2E test file patterns
    include: ['tests/e2e/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'out/**',
      '.vscode-test/**',
      'tests/unit/**',
      'tests/integration/**'
    ],
    
    // E2E specific setup
    setupFiles: ['./tests/setup/e2e-setup.ts'],
    
    // Longer timeouts for E2E tests
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    
    // Sequential execution for E2E tests to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './coverage/e2e-results.json'
    },
    
    // No coverage for E2E tests (covered by unit/integration tests)
    coverage: {
      enabled: false
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  },
  
  // Define global variables for E2E tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.TEST_TYPE': '"e2e"'
  }
});
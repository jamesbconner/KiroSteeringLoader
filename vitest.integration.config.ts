import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Integration test file patterns only
    include: [
      'tests/integration/**/*.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'out/**',
      '.vscode-test/**',
      'tests/unit/**',
      'tests/performance/**',
      'tests/e2e/**'
    ],
    
    // Global test setup
    setupFiles: ['./tests/setup/test-setup.ts'],
    
    // Test execution configuration
    testTimeout: 60000, // 1 minute for integration tests
    hookTimeout: 30000,
    teardownTimeout: 15000,
    
    // Sequential execution for integration tests to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/integration-test-results.json',
      html: './coverage/integration-test-results.html'
    },
    
    // Coverage configuration with v8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      
      // Slightly lower thresholds for integration tests
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      
      // Include/exclude patterns
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'out/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      
      // Fail build if coverage is below threshold
      skipFull: false,
      all: true
    },
    
    // TypeScript configuration
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json'
    }
  },
  
  // Resolve configuration for TypeScript paths
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  },
  
  // Define global variables for integration tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.INTEGRATION_TEST': '"true"'
  }
});
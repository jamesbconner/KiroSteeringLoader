import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Unit test file patterns only
    include: [
      'tests/unit/**/*.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'out/**',
      '.vscode-test/**',
      'tests/e2e/**',
      'tests/integration/**',
      'tests/performance/**'
    ],
    
    // Global test setup
    setupFiles: ['./tests/setup/test-setup.ts'],
    
    // Test execution configuration
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 10000,
    
    // Limit concurrent tests to reduce memory usage
    maxConcurrency: 5,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 3,
        minForks: 1
      }
    },
    
    // Failure handling configuration
    retry: process.env.CI ? 1 : 0,
    bail: process.env.CI ? 1 : 0,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/unit-test-results.json',
      html: './coverage/unit-test-results.html'
    },
    
    // Coverage configuration with v8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds (85% as specified in requirements)
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
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
  
  // Define global variables for tests
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});
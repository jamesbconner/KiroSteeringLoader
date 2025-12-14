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
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        minForks: 1
      }
    },
    
    // Failure handling configuration
    retry: 0,
    bail: 1,
    
    // Reporter configuration
    reporter: ['basic'],
    
    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'out/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'coverage/**',
        '.vscode-test/**',
        'scripts/**'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      },
      clean: true
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
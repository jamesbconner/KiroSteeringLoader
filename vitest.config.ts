import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'out/**',
      '.vscode-test/**',
      'tests/e2e/**'
    ],
    
    // Global test setup
    setupFiles: ['./tests/setup/test-setup.ts'],
    
    // Test execution configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html'
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
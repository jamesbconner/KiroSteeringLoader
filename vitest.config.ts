import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/performance/**/*.test.ts'
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
    testTimeout: 60000, // Increased for performance tests
    hookTimeout: 30000, // Increased for performance test setup
    teardownTimeout: 15000, // Increased for performance test cleanup
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html'
    },
    
    // Coverage configuration with v8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds (85% as specified in requirements)
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
        // Per-file thresholds
        perFile: true
      },
      
      // Include/exclude patterns
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
      
      // Fail build if coverage is below threshold
      skipFull: false,
      all: true,
      
      // Clean coverage directory before each run
      clean: true,
      
      // Enable branch coverage
      branches: 85,
      
      // Watermarks for coverage reporting
      watermarks: {
        statements: [85, 95],
        functions: [85, 95],
        branches: [85, 95],
        lines: [85, 95]
      }
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
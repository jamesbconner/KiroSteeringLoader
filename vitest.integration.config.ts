import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'out/**',
      '**/*.d.ts'
    ],
    environment: 'node',
    globals: true,
    setupFiles: ['tests/mocks/setup.ts'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Prevent race conditions in integration tests
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/integration',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'tests/**/*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    reporter: ['verbose', 'json'],
    outputFile: {
      json: 'coverage/integration-test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests')
    }
  },
  esbuild: {
    target: 'node18'
  }
});
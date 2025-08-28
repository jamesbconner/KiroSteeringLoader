"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    test: {
        // Test environment configuration
        environment: 'node',
        // Mock configuration for performance tests
        globals: true,
        // Performance test file patterns only
        include: [
            'tests/performance/**/*.test.ts'
        ],
        exclude: [
            'node_modules/**',
            'out/**',
            '.vscode-test/**',
            'tests/unit/**',
            'tests/integration/**',
            'tests/e2e/**'
        ],
        // Global test setup
        setupFiles: ['./tests/setup/performance-setup.ts'],
        // Extended timeouts for performance tests
        testTimeout: 300000, // 5 minutes for large dataset tests
        hookTimeout: 60000, // 1 minute for setup/teardown
        teardownTimeout: 30000, // 30 seconds for cleanup
        // Performance test specific configuration
        maxConcurrency: 1, // Run performance tests sequentially to avoid interference
        isolate: true, // Isolate each test for accurate measurements
        // Reporter configuration
        reporter: ['verbose', 'json'],
        outputFile: {
            json: './coverage/performance-results.json'
        },
        // Disable coverage for performance tests (focus on performance, not coverage)
        coverage: {
            enabled: false
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
            '@': (0, path_1.resolve)(__dirname, './src'),
            '@tests': (0, path_1.resolve)(__dirname, './tests')
        }
    },
    // Define global variables for performance tests
    define: {
        'process.env.NODE_ENV': '"test"',
        'process.env.PERFORMANCE_TEST': '"true"'
    }
});
//# sourceMappingURL=vitest.performance.config.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
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
            '@': (0, path_1.resolve)(__dirname, './src'),
            '@tests': (0, path_1.resolve)(__dirname, './tests')
        }
    },
    // Define global variables for E2E tests
    define: {
        'process.env.NODE_ENV': '"test"',
        'process.env.TEST_TYPE': '"e2e"'
    }
});
//# sourceMappingURL=vitest.e2e.config.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
var path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
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
        reporters: ['verbose', 'json'],
        outputFile: {
            json: 'coverage/integration-test-results.json'
        }
    },
    resolve: {
        alias: {
            '@': (0, path_1.resolve)(__dirname, 'src'),
            '@tests': (0, path_1.resolve)(__dirname, 'tests')
        }
    },
    esbuild: {
        target: 'node18'
    }
});

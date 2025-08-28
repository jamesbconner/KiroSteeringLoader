"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
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
            '@': (0, path_1.resolve)(__dirname, './src'),
            '@tests': (0, path_1.resolve)(__dirname, './tests')
        }
    },
    // Define global variables for tests
    define: {
        'process.env.NODE_ENV': '"test"'
    }
});
//# sourceMappingURL=vitest.config.js.map
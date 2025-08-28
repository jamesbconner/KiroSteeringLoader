# Integration Test Runner

This directory contains the integration test runner for the project, designed to test component interactions and system integrations.

## Usage

### Via npm scripts (recommended)
```bash
# Run integration tests once
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run integration tests with the custom runner
npm run test:integration:runner
```

### Direct execution
```bash
# Compile first
npm run compile

# Run with default settings
node out/tests/integration/runIntegrationTests.js

# Run in watch mode
node out/tests/integration/runIntegrationTests.js --watch

# Run without coverage
node out/tests/integration/runIntegrationTests.js --no-coverage

# Run tests in parallel (default is sequential)
node out/tests/integration/runIntegrationTests.js --parallel

# Run quietly (less verbose output)
node out/tests/integration/runIntegrationTests.js --quiet

# Set custom timeout
node out/tests/integration/runIntegrationTests.js --timeout 120000

# Show help
node out/tests/integration/runIntegrationTests.js --help
```

## Features

- **Sequential Execution**: Tests run sequentially by default to avoid conflicts
- **Coverage Reporting**: V8 coverage with slightly relaxed thresholds for integration tests
- **Detailed Logging**: Verbose output with test summaries and failure details
- **Environment Setup**: Automatic test environment configuration and cleanup
- **Watch Mode**: Automatic re-running on file changes
- **Multiple Reporters**: Verbose, JSON, and HTML output formats

## Configuration

The runner focuses on integration tests in the `tests/integration/` directory and excludes unit, performance, and E2E tests. Tests run sequentially by default since integration tests may have dependencies or shared resources.

## Coverage Thresholds

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

*Note: Slightly lower thresholds than unit tests since integration tests focus on interactions rather than comprehensive code coverage.*

## Test Environment

- **NODE_ENV**: Set to "test"
- **INTEGRATION_TEST**: Set to "true"
- **VERBOSE_LOGGING**: Enabled by default for detailed output
- **Cleanup**: Automatic cleanup of test artifacts between runs
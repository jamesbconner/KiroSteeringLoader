# Unit Test Runner

This directory contains the unit test runner for the project, similar to the E2E test runner.

## Usage

### Via npm scripts (recommended)
```bash
# Run unit tests once
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with the custom runner
npm run test:unit:runner
```

### Direct execution
```bash
# Compile first
npm run compile

# Run with default settings
node out/tests/unit/runUnitTests.js

# Run in watch mode
node out/tests/unit/runUnitTests.js --watch

# Run without coverage
node out/tests/unit/runUnitTests.js --no-coverage

# Set custom timeout
node out/tests/unit/runUnitTests.js --timeout 60000

# Show help
node out/tests/unit/runUnitTests.js --help
```

## Features

- **TypeScript Support**: Full TypeScript compilation and type checking
- **Coverage Reporting**: V8 coverage with 85% thresholds
- **Watch Mode**: Automatic re-running on file changes
- **Configurable Timeouts**: Customizable test timeouts
- **Multiple Reporters**: Verbose, JSON, and HTML output formats
- **Path Aliases**: Support for `@` (src) and `@tests` aliases

## Configuration

The runner uses the main Vitest configuration but focuses specifically on unit tests in the `tests/unit/` directory. It excludes E2E, integration, and performance tests to ensure fast execution.

## Coverage Thresholds

- Lines: 85%
- Functions: 85%
- Branches: 85%
- Statements: 85%

Coverage reports are generated in the `coverage/` directory with multiple formats (text, HTML, JSON, LCOV).
# Testing Infrastructure

This directory contains the comprehensive testing framework for the Kiro Steering Loader VS Code extension.

## Structure

```
tests/
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests for VS Code API interactions
├── e2e/                    # End-to-end tests using @vscode/test-electron
├── fixtures/               # Test data and sample files
├── mocks/                  # Mock implementations for VS Code APIs
├── utils/                  # Test utilities and helpers
└── setup/                  # Test setup and configuration files
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### With UI (interactive test runner)
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Configuration

- **vitest.config.ts**: Main configuration for unit and integration tests
- **vitest.e2e.config.ts**: Configuration for end-to-end tests
- **tests/tsconfig.json**: TypeScript configuration for tests
- **tests/setup/test-setup.ts**: Global setup for unit/integration tests
- **tests/setup/e2e-setup.ts**: Global setup for E2E tests

## Coverage Requirements

The test suite enforces a minimum coverage threshold of 85% for:
- Lines
- Functions
- Branches
- Statements

Tests will fail if coverage drops below this threshold.

## Writing Tests

### Unit Tests
Place unit tests in `tests/unit/` with the naming pattern `*.test.ts`.

### Integration Tests
Place integration tests in `tests/integration/` with the naming pattern `*.test.ts`.

### End-to-End Tests
Place E2E tests in `tests/e2e/` with the naming pattern `*.test.ts`.

## Test Utilities

Common test utilities are available in `tests/utils/` and can be imported as needed.

Mock implementations for VS Code APIs are available in `tests/mocks/`.

Test fixtures and sample data are available in `tests/fixtures/`.
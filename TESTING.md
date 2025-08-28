# Testing Infrastructure Documentation

## Overview

This document describes the comprehensive testing framework set up for the Kiro Steering Loader VS Code extension. The testing infrastructure follows TypeScript best practices and provides high code coverage while maintaining type safety.

## Testing Framework

### Core Technologies

- **Test Runner**: Vitest 1.6.x (modern, fast, TypeScript-first)
- **Coverage Provider**: V8 (built into Vitest)
- **E2E Testing**: @vscode/test-electron for VS Code extension testing
- **Type Checking**: Built-in TypeScript support with strict mode

### Configuration Files

- `vitest.config.ts` - Main configuration for unit and integration tests
- `vitest.e2e.config.ts` - Configuration for end-to-end tests
- `tests/tsconfig.json` - TypeScript configuration for tests
- `tests/setup/test-setup.ts` - Global setup for unit/integration tests
- `tests/setup/e2e-setup.ts` - Global setup for E2E tests

## Directory Structure

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

## Available Scripts

### Development Scripts

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## Coverage Requirements

The testing framework enforces a **minimum coverage threshold of 85%** for:

- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 85%
- **Statements**: 85%

Tests will **fail** if coverage drops below these thresholds, ensuring high code quality.

## Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output during test runs
- **HTML**: Interactive HTML report in `coverage/` directory
- **JSON**: Machine-readable report for CI/CD integration
- **LCOV**: Standard format for coverage tools

## Test Environment

### Environment Variables

The following environment variables are automatically set during testing:

- `NODE_ENV=test` - Indicates test environment
- `VSCODE_TEST_MODE=true` - Indicates VS Code testing mode
- `TEST_TYPE=e2e` - Set for end-to-end tests

### Global Setup

- **Unit/Integration Tests**: `tests/setup/test-setup.ts`
  - Configures test environment
  - Provides common test utilities
  - Handles global setup/teardown

- **E2E Tests**: `tests/setup/e2e-setup.ts`
  - Configures VS Code test environment
  - Manages test workspaces
  - Handles E2E-specific setup

## TypeScript Configuration

### Strict Type Checking

The testing framework uses strict TypeScript configuration:

- `strict: true` - Enables all strict type checking options
- Full type safety for test code
- Type checking integrated with test execution

### Path Aliases

Convenient path aliases are configured:

- `@/*` - Maps to `src/*` (source code)
- `@tests/*` - Maps to `tests/*` (test utilities)

## Test Utilities

### Built-in Utilities

The `tests/setup/test-setup.ts` file provides common utilities:

```typescript
import { testUtils } from '@tests/setup/test-setup';

// Wait for async operations
await testUtils.wait(100);

// Create mock functions with proper typing
const mockFn = testUtils.createMockFn<(arg: string) => number>();

// Generate unique test IDs
const testId = testUtils.generateTestId();

// Create temporary paths for testing
const tempPath = testUtils.createTempPath();
```

## Writing Tests

### Unit Tests

Place unit tests in `tests/unit/` with the naming pattern `*.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should do something', () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Integration Tests

Place integration tests in `tests/integration/` with the naming pattern `*.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('VS Code Integration', () => {
  it('should integrate with VS Code API', () => {
    // Integration test implementation
  });
});
```

### End-to-End Tests

Place E2E tests in `tests/e2e/` with the naming pattern `*.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { e2eUtils } from '@tests/setup/e2e-setup';

describe('Complete Workflow', () => {
  it('should complete user workflow', async () => {
    // E2E test implementation
  });
});
```

## Continuous Integration

### GitHub Actions Integration

The testing framework is designed to work seamlessly with CI/CD pipelines:

1. **Automated Test Execution**: All tests run automatically on code changes
2. **Coverage Enforcement**: Builds fail if coverage drops below 85%
3. **Multi-Platform Support**: Tests can run on Windows, macOS, and Linux
4. **Artifact Storage**: Test results and coverage reports are stored as artifacts

### Quality Gates

- **Test Failures**: Any test failure blocks the build
- **Coverage Threshold**: Coverage below 85% blocks the build
- **Type Errors**: TypeScript compilation errors block the build

## Performance Considerations

### Test Execution Speed

- **Parallel Execution**: Unit and integration tests run in parallel
- **Sequential E2E**: E2E tests run sequentially to avoid conflicts
- **Optimized Configuration**: Minimal overhead for fast feedback

### Memory Management

- **Proper Cleanup**: Global setup/teardown ensures clean test environment
- **Mock Management**: Mocks are properly reset between tests
- **Resource Cleanup**: Temporary files and resources are cleaned up

## Troubleshooting

### Common Issues

1. **Coverage Below Threshold**
   - Add tests for uncovered code paths
   - Check coverage report for specific areas needing tests

2. **TypeScript Errors**
   - Ensure proper type annotations in test files
   - Check that test utilities are properly typed

3. **E2E Test Failures**
   - Verify VS Code test environment setup
   - Check that test workspaces are properly configured

### Debug Configuration

VS Code debug configuration is available for debugging tests:

1. Open VS Code
2. Go to Run and Debug panel
3. Select test debugging configuration
4. Set breakpoints in test files
5. Start debugging

## Best Practices

### Test Organization

- **One Test File Per Source File**: Mirror source structure in tests
- **Descriptive Test Names**: Use clear, descriptive test names
- **Logical Grouping**: Group related tests using `describe` blocks

### Test Quality

- **Test Isolation**: Each test should be independent
- **Clear Assertions**: Use specific, meaningful assertions
- **Edge Case Coverage**: Test both happy path and edge cases

### Maintenance

- **Regular Updates**: Keep testing dependencies up to date
- **Coverage Monitoring**: Monitor coverage trends over time
- **Performance Monitoring**: Watch for test execution time increases

## Future Enhancements

### Planned Improvements

- **Visual Regression Testing**: Screenshot comparison for UI components
- **Performance Benchmarking**: Automated performance regression detection
- **Mutation Testing**: Advanced test quality assessment
- **Cross-Browser E2E**: Testing across different VS Code versions

This testing infrastructure provides a solid foundation for maintaining high code quality and ensuring the reliability of the Kiro Steering Loader extension.
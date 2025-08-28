# Testing Guide for Kiro Steering Loader Extension

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Testing Patterns](#testing-patterns)
6. [Test Utilities](#test-utilities)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [CI/CD Integration](#cicd-integration)

## Overview

This guide provides comprehensive documentation for the testing framework used in the Kiro Steering Loader VS Code extension. Our testing strategy follows a three-tier approach:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and VS Code API integration
- **End-to-End Tests**: Test complete user workflows in a real VS Code environment

### Testing Stack

- **Test Runner**: Vitest (fast, TypeScript-first)
- **Assertion Library**: Vitest built-in assertions
- **Mocking**: Vitest mocking with custom VS Code API mocks
- **Coverage**: c8 (V8 coverage) with 85% threshold
- **E2E Testing**: @vscode/test-electron
- **Type Safety**: Full TypeScript support throughout

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js 20+
- npm or pnpm
- VS Code (for E2E tests)

### Installation

```bash
# Install dependencies
npm install

# Install development dependencies (if not already installed)
npm install --save-dev vitest @vitest/ui c8 @vscode/test-electron
```

### Project Structure

```
tests/
├── unit/                           # Unit tests
│   ├── extension.test.ts          # Extension activation tests
│   ├── steeringTemplateProvider.test.ts  # Provider unit tests
│   └── templateItem.test.ts       # TemplateItem class tests
├── integration/                    # Integration tests
│   ├── commands.test.ts           # Command integration tests
│   ├── configuration.test.ts     # Configuration integration tests
│   └── treeDataProvider.test.ts  # Tree provider integration tests
├── e2e/                           # End-to-end tests
│   ├── templateLoading.test.ts    # Complete workflow tests
│   ├── errorHandling.test.ts      # Error scenario tests
│   └── userInteraction.test.ts    # User interaction tests
├── fixtures/                      # Test data and fixtures
├── mocks/                         # Mock implementations
├── utils/                         # Test utilities
└── TESTING_GUIDE.md              # This guide
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with UI
npm run test:ui
```

### Advanced Options

```bash
# Run specific test file
npx vitest run tests/unit/extension.test.ts

# Run tests matching pattern
npx vitest run --grep "SteeringTemplateProvider"

# Run tests with verbose output
npx vitest run --reporter=verbose

# Run tests with specific timeout
npx vitest run --testTimeout=10000
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI integration
- `coverage/coverage-final.json` - JSON format for programmatic access

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { createMockExtensionContext } from '../utils/testHelpers';

describe('SteeringTemplateProvider', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    provider = new SteeringTemplateProvider(mockContext);
  });

  it('should initialize with extension context', () => {
    expect(provider).toBeDefined();
    expect(provider.context).toBe(mockContext);
  });

  it('should fire onDidChangeTreeData when refresh is called', () => {
    const spy = vi.fn();
    provider.onDidChangeTreeData(spy);
    
    provider.refresh();
    
    expect(spy).toHaveBeenCalledOnce();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension';

// Mock VS Code API
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
  },
  window: {
    registerTreeDataProvider: vi.fn(),
  },
}));

describe('Extension Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register all commands on activation', async () => {
    const mockContext = createMockExtensionContext();
    
    await activate(mockContext);
    
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiro-steering-loader.refresh',
      expect.any(Function)
    );
  });
});
```

### E2E Test Example

```typescript
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { runTests } from '@vscode/test-electron';

describe('Template Loading E2E', () => {
  it('should load template successfully', async () => {
    // This test runs in a real VS Code environment
    const extension = vscode.extensions.getExtension('kiro.steering-loader');
    await extension?.activate();
    
    // Test complete workflow
    await vscode.commands.executeCommand('kiro-steering-loader.loadTemplate', 'test-template');
    
    // Verify results
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    expect(workspaceFolder).toBeDefined();
  });
});
```

## Testing Patterns

### 1. Arrange-Act-Assert Pattern

```typescript
it('should return correct tree item', () => {
  // Arrange
  const templateItem = new TemplateItem('test', 'template');
  const provider = new SteeringTemplateProvider(mockContext);
  
  // Act
  const result = provider.getTreeItem(templateItem);
  
  // Assert
  expect(result.label).toBe('test');
  expect(result.contextValue).toBe('template');
});
```

### 2. Mock Setup Pattern

```typescript
describe('FileSystem Operations', () => {
  beforeEach(() => {
    // Setup mocks before each test
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['template1.md', 'template2.md']);
  });
  
  afterEach(() => {
    // Clean up mocks after each test
    vi.clearAllMocks();
  });
});
```

### 3. Error Testing Pattern

```typescript
it('should handle file system errors gracefully', async () => {
  // Setup error condition
  vi.mocked(fs.readFileSync).mockImplementation(() => {
    throw new Error('File not found');
  });
  
  // Test error handling
  await expect(provider.loadTemplate('invalid-path')).rejects.toThrow('File not found');
  
  // Verify error was handled properly
  expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
    expect.stringContaining('File not found')
  );
});
```

### 4. Async Testing Pattern

```typescript
it('should handle async operations correctly', async () => {
  const promise = provider.loadTemplate('test-template');
  
  // Test that operation is in progress
  expect(provider.isLoading).toBe(true);
  
  // Wait for completion
  await promise;
  
  // Verify final state
  expect(provider.isLoading).toBe(false);
});
```

## Test Utilities

### Mock Helpers

```typescript
// tests/utils/testHelpers.ts
export function createMockExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
    },
    extensionPath: '/mock/extension/path',
    // ... other properties
  };
}

export function createMockWorkspaceFolder(path: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path),
    name: 'test-workspace',
    index: 0,
  };
}
```

### Fixture Factories

```typescript
// tests/utils/fixtures.ts
export function createTemplateFixture(name: string, content: string): TemplateFixture {
  return {
    name,
    content,
    path: `/templates/${name}.md`,
    expectedTreeItem: {
      label: name,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      itemType: 'template',
    },
  };
}
```

### Type Assertions

```typescript
// tests/utils/typeAssertions.ts
export function assertType<T>(value: unknown): asserts value is T {
  // Runtime type checking logic
}

export function expectType<T>(value: T): T {
  return value;
}
```

## Best Practices

### 1. Test Organization

- **Group related tests**: Use `describe` blocks to group related functionality
- **Clear test names**: Use descriptive test names that explain what is being tested
- **One assertion per test**: Focus each test on a single behavior
- **Setup and teardown**: Use `beforeEach`/`afterEach` for consistent test setup

### 2. Mock Management

- **Mock at the right level**: Mock external dependencies, not internal logic
- **Reset mocks**: Always reset mocks between tests to avoid interference
- **Verify mock calls**: Assert that mocks were called with expected parameters
- **Use type-safe mocks**: Maintain TypeScript type safety in mocks

### 3. Coverage Guidelines

- **Aim for 85%+ coverage**: Maintain high code coverage across all metrics
- **Test edge cases**: Include tests for error conditions and edge cases
- **Cover all branches**: Ensure all conditional branches are tested
- **Exclude appropriate files**: Exclude test files and generated code from coverage

### 4. Performance Considerations

- **Fast tests**: Keep unit tests fast (< 100ms each)
- **Parallel execution**: Leverage Vitest's parallel test execution
- **Efficient mocks**: Use lightweight mocks that don't slow down tests
- **Resource cleanup**: Properly clean up resources to prevent memory leaks

### 5. Type Safety

- **Maintain types in tests**: Don't use `any` in test code
- **Test type definitions**: Include tests for complex type definitions
- **Mock with types**: Ensure mocks maintain proper TypeScript types
- **Assert return types**: Verify that functions return expected types

## Troubleshooting

### Common Issues

#### 1. Mock Not Working

**Problem**: Mock functions are not being called or returning expected values.

**Solutions**:
```typescript
// Ensure mock is properly setup
vi.mocked(fs.existsSync).mockReturnValue(true);

// Check mock was called
expect(vi.mocked(fs.existsSync)).toHaveBeenCalledWith('/expected/path');

// Reset mocks if needed
vi.clearAllMocks();
```

#### 2. Async Test Failures

**Problem**: Async tests are failing or timing out.

**Solutions**:
```typescript
// Always await async operations
await expect(asyncFunction()).resolves.toBe(expectedValue);

// Use proper error testing
await expect(asyncFunction()).rejects.toThrow('Expected error');

// Increase timeout if needed
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

#### 3. VS Code API Mocking Issues

**Problem**: VS Code API mocks are not working correctly.

**Solutions**:
```typescript
// Ensure VS Code module is mocked
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
  },
}));

// Import after mocking
const vscode = await import('vscode');
```

#### 4. Coverage Issues

**Problem**: Coverage is lower than expected or not reporting correctly.

**Solutions**:
```bash
# Check coverage configuration
npx vitest run --coverage --reporter=verbose

# Exclude files from coverage
# Add to vitest.config.ts:
coverage: {
  exclude: ['tests/**', 'node_modules/**']
}
```

#### 5. E2E Test Environment Issues

**Problem**: E2E tests fail to start VS Code or find extension.

**Solutions**:
```typescript
// Ensure proper test setup
import { runTests } from '@vscode/test-electron';

// Check extension is packaged
await runTests({
  extensionDevelopmentPath: __dirname,
  extensionTestsPath: path.resolve(__dirname, './e2e'),
});
```

### Debugging Tests

#### 1. Debug in VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### 2. Console Debugging

```typescript
// Add debug output
console.log('Debug info:', { variable, state });

// Use Vitest's debug mode
npx vitest run --reporter=verbose --no-coverage
```

#### 3. Isolate Failing Tests

```bash
# Run single test file
npx vitest run tests/unit/specific.test.ts

# Run specific test
npx vitest run --grep "specific test name"
```

### Performance Issues

#### 1. Slow Tests

**Symptoms**: Tests take too long to run.

**Solutions**:
- Profile test execution with `--reporter=verbose`
- Optimize mock setup and teardown
- Use `vi.hoisted()` for expensive mock setup
- Consider parallel execution settings

#### 2. Memory Issues

**Symptoms**: Tests consume too much memory or cause out-of-memory errors.

**Solutions**:
- Ensure proper cleanup in `afterEach`
- Avoid creating large test fixtures
- Use `vi.clearAllMocks()` to free mock memory
- Monitor memory usage with `--reporter=verbose`

### CI/CD Issues

#### 1. Tests Pass Locally But Fail in CI

**Common causes**:
- Environment differences
- Timing issues in CI environment
- Missing dependencies
- File path differences

**Solutions**:
- Use consistent Node.js versions
- Add appropriate timeouts for CI
- Ensure all dependencies are installed
- Use cross-platform path handling

#### 2. Coverage Reporting Issues

**Solutions**:
```bash
# Generate coverage in CI-friendly format
npx vitest run --coverage --reporter=json

# Upload coverage to services
# Add to CI configuration
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Coverage Quality Gates

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});
```

This ensures builds fail if coverage drops below the threshold.

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [TypeScript Testing Best Practices](https://typescript-eslint.io/docs/linting/troubleshooting/)
- [Mock Service Worker](https://mswjs.io/) - For API mocking in integration tests

For questions or issues not covered in this guide, please check the project's issue tracker or reach out to the development team.
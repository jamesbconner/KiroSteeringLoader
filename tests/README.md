# Testing Infrastructure

This directory contains the comprehensive testing framework for the Kiro Steering Loader VS Code extension.

## Documentation

📚 **Complete Testing Documentation:**

- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive guide covering all aspects of testing
- **[VS Code Testing Patterns](./VSCODE_TESTING_PATTERNS.md)** - Specific patterns for VS Code extension testing
- **[Quick Reference](./TESTING_QUICK_REFERENCE.md)** - Quick commands and troubleshooting guide

## Structure

```
tests/
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests for VS Code API interactions
├── e2e/                    # End-to-end tests using @vscode/test-electron
├── fixtures/               # Test data and sample files
├── mocks/                  # Mock implementations for VS Code APIs
├── utils/                  # Test utilities and helpers
├── setup/                  # Test setup and configuration files
├── TESTING_GUIDE.md        # Complete testing documentation
├── VSCODE_TESTING_PATTERNS.md # VS Code-specific testing patterns
└── TESTING_QUICK_REFERENCE.md # Quick reference and troubleshooting
```

## Quick Start

### Running Tests

```bash
# Run all tests with coverage
npm test

# Development mode (watch + UI)
npm run test:watch
npm run test:ui

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Single test file
npx vitest run tests/unit/extension.test.ts
```

### Writing Your First Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Configuration

- **vitest.config.ts**: Main configuration for unit and integration tests
- **vitest.e2e.config.ts**: Configuration for end-to-end tests
- **tests/tsconfig.json**: TypeScript configuration for tests
- **tests/setup/test-setup.ts**: Global setup for unit/integration tests
- **tests/setup/e2e-setup.ts**: Global setup for E2E tests

## Coverage Requirements

The test suite enforces a minimum coverage threshold of **85%** for:
- Lines
- Functions  
- Branches
- Statements

Tests will fail if coverage drops below this threshold.

## Testing Framework

### Stack
- **Test Runner**: Vitest (fast, TypeScript-first)
- **Assertions**: Vitest built-in assertions
- **Mocking**: Vitest mocking with custom VS Code API mocks
- **Coverage**: c8 (V8 coverage)
- **E2E**: @vscode/test-electron
- **Type Safety**: Full TypeScript support

### Key Features
- ✅ Type-safe mocks and assertions
- ✅ Fast parallel test execution
- ✅ Interactive test UI for development
- ✅ Comprehensive VS Code API mocking
- ✅ Real VS Code environment for E2E tests
- ✅ Detailed coverage reporting
- ✅ CI/CD integration ready

## Test Categories

### Unit Tests (`tests/unit/`)
Test individual components in isolation with mocked dependencies.

**Example**: Testing `SteeringTemplateProvider` methods independently.

### Integration Tests (`tests/integration/`)
Test component interactions and VS Code API integration.

**Example**: Testing command registration and execution flow.

### End-to-End Tests (`tests/e2e/`)
Test complete user workflows in a real VS Code environment.

**Example**: Testing the entire template loading workflow from UI interaction to file creation.

## Common Patterns

### Mock VS Code API
```typescript
vi.mock('vscode', () => ({
  window: { showInformationMessage: vi.fn() },
  commands: { registerCommand: vi.fn() },
}));
```

### Test Async Operations
```typescript
await expect(asyncFunction()).resolves.toBe('result');
await expect(asyncFunction()).rejects.toThrow('error');
```

### Verify Mock Calls
```typescript
expect(mockFunction).toHaveBeenCalledWith('expected', 'args');
expect(mockFunction).toHaveBeenCalledTimes(2);
```

## Troubleshooting

### Quick Fixes
- **Mock not working?** → Check `vi.clearAllMocks()` in `beforeEach`
- **Test timeout?** → Add `await` to async operations
- **Coverage low?** → Check `coverage/index.html` for uncovered lines
- **E2E failing?** → Verify VS Code test environment setup

### Get Help
1. Check the [Quick Reference Guide](./TESTING_QUICK_REFERENCE.md)
2. Review [VS Code Testing Patterns](./VSCODE_TESTING_PATTERNS.md)
3. Read the complete [Testing Guide](./TESTING_GUIDE.md)

## Best Practices

✅ **Do:**
- Use descriptive test names
- Test one behavior per test
- Mock external dependencies
- Maintain 85%+ coverage
- Test error conditions

❌ **Don't:**
- Use `any` in test code
- Create interdependent tests
- Skip async/await
- Ignore error scenarios

---

**Need more details?** Check out the comprehensive [Testing Guide](./TESTING_GUIDE.md) for in-depth documentation, patterns, and best practices.
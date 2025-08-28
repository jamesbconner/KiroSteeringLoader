# Testing Quick Reference Guide

## Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e

# Run single test file
npx vitest run tests/unit/extension.test.ts

# Run tests matching pattern
npx vitest run --grep "SteeringTemplateProvider"

# Watch mode
npm run test:watch

# Debug mode
npx vitest run --reporter=verbose --no-coverage
```

## Common Test Patterns

### Basic Unit Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mock Setup

```typescript
// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
  },
}));

// Mock file system
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
```

### Async Testing

```typescript
// Test async function
it('should handle async operation', async () => {
  await expect(asyncFunction()).resolves.toBe('result');
});

// Test async error
it('should handle async error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Mock Verification

```typescript
// Verify mock was called
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith('expected', 'arguments');
expect(mockFunction).toHaveBeenCalledTimes(2);

// Verify mock was not called
expect(mockFunction).not.toHaveBeenCalled();
```

## Troubleshooting Checklist

### ❌ Test Failing

1. **Check mock setup**
   ```typescript
   // Ensure mocks are properly configured
   vi.mocked(functionName).mockReturnValue('expected');
   ```

2. **Verify imports**
   ```typescript
   // Import after mocking
   vi.mock('module');
   const module = await import('module');
   ```

3. **Check async handling**
   ```typescript
   // Always await async operations
   await expect(asyncFunction()).resolves.toBe('result');
   ```

### ❌ Mock Not Working

1. **Clear mocks between tests**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

2. **Check mock implementation**
   ```typescript
   vi.mocked(fs.existsSync).mockImplementation((path) => {
     return path === '/expected/path';
   });
   ```

3. **Verify mock is called**
   ```typescript
   expect(vi.mocked(functionName)).toHaveBeenCalled();
   ```

### ❌ Coverage Issues

1. **Check excluded files**
   ```typescript
   // vitest.config.ts
   coverage: {
     exclude: ['tests/**', 'node_modules/**']
   }
   ```

2. **Run coverage report**
   ```bash
   npx vitest run --coverage --reporter=verbose
   ```

3. **Check uncovered lines**
   - Open `coverage/index.html` in browser
   - Look for red highlighted lines

### ❌ E2E Tests Failing

1. **Check VS Code test setup**
   ```typescript
   import { runTests } from '@vscode/test-electron';
   ```

2. **Verify extension path**
   ```typescript
   await runTests({
     extensionDevelopmentPath: __dirname,
     extensionTestsPath: path.resolve(__dirname, './e2e'),
   });
   ```

3. **Check test workspace**
   - Ensure test workspace is properly set up
   - Verify file permissions

## Common Error Messages

### "Cannot find module 'vscode'"

**Solution**: Ensure VS Code is properly mocked
```typescript
vi.mock('vscode', () => ({
  // Mock implementation
}));
```

### "TypeError: Cannot read property 'mockReturnValue' of undefined"

**Solution**: Check mock setup order
```typescript
// Mock first
vi.mock('module');
// Then import
const module = await import('module');
// Then configure
vi.mocked(module.function).mockReturnValue('value');
```

### "Test timeout"

**Solution**: Increase timeout or fix async handling
```typescript
// Increase timeout
it('slow test', async () => {
  // test code
}, 10000); // 10 seconds

// Or fix async handling
await expect(asyncFunction()).resolves.toBe('result');
```

### "Coverage threshold not met"

**Solution**: Add tests or adjust threshold
```typescript
// Add more tests to cover untested code
// Or adjust threshold in vitest.config.ts
coverage: {
  thresholds: {
    lines: 80, // Reduce if needed
  }
}
```

## Test Data Factories

### Create Mock Extension Context

```typescript
function createMockExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: { get: vi.fn(), update: vi.fn() },
    globalState: { get: vi.fn(), update: vi.fn() },
    extensionPath: '/mock/path',
    // ... other properties
  };
}
```

### Create Mock Workspace Folder

```typescript
function createMockWorkspaceFolder(path: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path),
    name: 'test-workspace',
    index: 0,
  };
}
```

### Create Template Fixture

```typescript
function createTemplateFixture(name: string): TemplateFixture {
  return {
    name,
    content: `# ${name}\nTemplate content`,
    path: `/templates/${name}.md`,
    expectedTreeItem: {
      label: name,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      itemType: 'template',
    },
  };
}
```

## Performance Testing

### Measure Execution Time

```typescript
function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

// Usage
it('should execute within time limit', () => {
  const { result, duration } = measureTime(() => expensiveFunction());
  
  expect(result).toBe('expected');
  expect(duration).toBeLessThan(100); // 100ms limit
});
```

### Memory Usage Testing

```typescript
function measureMemory<T>(fn: () => T): { result: T; memoryUsed: number } {
  const initial = process.memoryUsage().heapUsed;
  const result = fn();
  const final = process.memoryUsage().heapUsed;
  return { result, memoryUsed: final - initial };
}
```

## CI/CD Integration

### GitHub Actions Test Step

```yaml
- name: Run tests
  run: |
    npm ci
    npm run test:coverage
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Quality Gates

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

## Debugging Tests

### VS Code Debug Configuration

```json
{
  "name": "Debug Tests",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--no-coverage"],
  "console": "integratedTerminal"
}
```

### Console Debugging

```typescript
// Add debug output
console.log('Debug:', { variable, state });

// Use test.only to run single test
it.only('debug this test', () => {
  // test code
});
```

## File Organization

```
tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests  
├── e2e/                     # End-to-end tests
├── fixtures/                # Test data
├── mocks/                   # Mock implementations
├── utils/                   # Test utilities
├── TESTING_GUIDE.md         # Main guide
├── VSCODE_TESTING_PATTERNS.md # VS Code patterns
└── TESTING_QUICK_REFERENCE.md # This file
```

## Best Practices Summary

✅ **Do:**
- Use descriptive test names
- Test one thing per test
- Mock external dependencies
- Clean up mocks between tests
- Maintain high coverage (85%+)
- Test error conditions
- Use type-safe mocks

❌ **Don't:**
- Use `any` in test code
- Test implementation details
- Create interdependent tests
- Ignore async operations
- Skip error testing
- Leave mocks configured between tests

## Resources

- [Main Testing Guide](./TESTING_GUIDE.md)
- [VS Code Testing Patterns](./VSCODE_TESTING_PATTERNS.md)
- [Vitest Documentation](https://vitest.dev/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
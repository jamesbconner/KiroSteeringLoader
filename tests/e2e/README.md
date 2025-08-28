# E2E Testing Infrastructure

This directory contains the end-to-end (E2E) testing infrastructure for the Kiro Steering Loader VS Code extension.

## Overview

The E2E testing infrastructure provides:

- **VS Code Instance Management**: Automated download and setup of VS Code for testing
- **Test Workspace Creation**: Utilities to create isolated test workspaces
- **Extension Testing**: Tools to test the extension in a real VS Code environment
- **Cleanup Management**: Automatic cleanup of test resources

## Architecture

### Key Components

1. **E2E Setup (`../setup/e2e-setup.ts`)**: Global setup and teardown for E2E tests
2. **E2E Test Utils (`../utils/e2eTestUtils.ts`)**: Utilities for managing test lifecycle
3. **Test Runner (`runE2ETests.ts`)**: Standalone script to run E2E tests
4. **VS Code Bridge (`index.ts`)**: Bridge between VS Code test runner and our tests

### Directory Structure

```
tests/e2e/
├── README.md                    # This file
├── index.ts                     # VS Code test runner entry point
├── runE2ETests.ts              # Standalone E2E test runner
├── infrastructure.test.ts       # Infrastructure validation tests
└── [future test files]         # Additional E2E test files
```

## Configuration

### Vitest E2E Configuration

The E2E tests use a separate Vitest configuration (`vitest.e2e.config.ts`) with:

- **Sequential Execution**: Tests run one at a time to avoid conflicts
- **Extended Timeouts**: Longer timeouts for VS Code operations
- **Isolated Environment**: Separate from unit and integration tests
- **No Coverage**: E2E tests don't contribute to coverage metrics

### VS Code Test Configuration

- **Extension Path**: Automatically detected from project structure
- **Test Workspaces**: Created in `tests/fixtures/workspaces/`
- **VS Code Version**: Downloads latest stable VS Code
- **Launch Args**: Configured for headless testing

## Usage

### Running E2E Tests

```bash
# Run E2E tests with Vitest
npm run test:e2e

# Run E2E tests with VS Code test runner (alternative)
node tests/e2e/runE2ETests.js
```

### Writing E2E Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs } from '../utils/e2eTestUtils';

describe('My E2E Test', () => {
  let testManager: ReturnType<typeof createE2ETestManager>;
  let testContext: E2ETestContext;

  beforeEach(async () => {
    testManager = createE2ETestManager();
    testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.withKiro);
  });

  afterEach(async () => {
    await testContext.cleanup();
    await testManager.cleanupAll();
  });

  it('should test extension functionality', async () => {
    // Your test code here
    expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(true);
  });
});
```

## Test Workspace Management

### Common Workspace Configurations

The infrastructure provides pre-configured workspace types:

- **`empty`**: Empty workspace with no Kiro structure
- **`withKiro`**: Workspace with `.kiro/steering/` directory structure
- **`withTemplates`**: Workspace with sample template files
- **`configured`**: Workspace with extension settings pre-configured

### Custom Workspace Creation

```typescript
const customWorkspace = await testManager.createTestWorkspace({
  name: 'my-custom-workspace',
  hasKiroDirectory: true,
  hasSteeringDirectory: true,
  existingTemplates: ['template1', 'template2'],
  settings: {
    'kiroSteeringLoader.templatesPath': '/custom/path'
  }
});
```

## Utilities and Assertions

### Test Manager Methods

- `createTestWorkspace()`: Create isolated test workspace
- `waitForExtensionActivation()`: Wait for extension to activate
- `executeCommand()`: Execute VS Code commands
- `simulateTreeViewInteraction()`: Simulate user interactions
- `verifyFileExists()`: Check file existence
- `waitForFile()`: Wait for file creation

### Assertion Helpers

- `assertCommandRegistered()`: Verify command registration
- `assertExtensionActive()`: Verify extension activation
- `assertFileExists()`: Assert file existence
- `assertDirectoryExists()`: Assert directory existence
- `assertFileContent()`: Assert file content matches

## Best Practices

### Test Isolation

- Each test should create its own workspace
- Always clean up resources in `afterEach`
- Use unique workspace names to avoid conflicts

### Async Operations

- Use appropriate timeouts for VS Code operations
- Wait for extension activation before testing
- Handle Promise rejections properly

### Error Handling

- Wrap VS Code operations in try-catch blocks
- Provide meaningful error messages
- Clean up resources even when tests fail

## Troubleshooting

### Common Issues

1. **VS Code Download Fails**: Check network connectivity and disk space
2. **Extension Not Activating**: Verify extension ID and activation events
3. **Workspace Creation Fails**: Check file system permissions
4. **Tests Timeout**: Increase timeout values for slow operations

### Debug Mode

To run E2E tests with debug output:

```bash
DEBUG=* npm run test:e2e
```

### VS Code Test Logs

VS Code test logs are available in:
- Console output during test execution
- `.vscode-test/` directory (if created)

## Future Enhancements

- [ ] Headless browser testing for web extensions
- [ ] Multi-platform testing (Windows, macOS, Linux)
- [ ] Performance benchmarking
- [ ] Visual regression testing
- [ ] Automated screenshot capture
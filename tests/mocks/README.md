# VS Code API Mocks

This directory contains comprehensive, type-safe mock implementations for the VS Code API, designed specifically for testing the Kiro Steering Loader extension.

## Overview

The VS Code mocks provide:
- **Type Safety**: All mocks maintain full TypeScript type compatibility with the VS Code API
- **Comprehensive Coverage**: Mocks for all VS Code APIs used in the extension
- **Test Utilities**: Helper functions for common testing scenarios
- **Factory Functions**: Easy creation of mock objects with proper typing

## Files

### Core Mock Files

- **`vscode.ts`** - Main VS Code API mock implementations
- **`vscodeFactories.ts`** - Factory functions for creating mock objects
- **`setup.ts`** - Global test setup and utility functions
- **`index.ts`** - Main entry point with clean API exports

### Usage Files

- **`README.md`** - This documentation file
- **Test examples** - See `tests/unit/vscode-mocks.test.ts` for usage examples

## Quick Start

### Basic Import

```typescript
import { vscode } from '../mocks';
// or
import * as vscode from 'vscode'; // Automatically mocked
```

### Using Factory Functions

```typescript
import {
  createMockExtensionContext,
  createMockWorkspaceFolder,
  createTemplateItem
} from '../mocks';

// Create a mock extension context
const context = createMockExtensionContext();

// Create a mock workspace folder
const workspace = createMockWorkspaceFolder('my-project', '/path/to/project');

// Create a template item
const templateItem = createTemplateItem('My Template', '/path/to/template.md', 'template');
```

### Test Setup Utilities

```typescript
import { setupWorkspace, setupConfiguration } from '../mocks';

// Setup workspace with folders
setupWorkspace([
  createMockWorkspaceFolder('project1', '/path/to/project1')
]);

// Setup configuration values
setupConfiguration({
  'templatesPath': '/path/to/templates'
});
```

## Available Mocks

### vscode.window

- `showInformationMessage()` - Mock for information messages
- `showErrorMessage()` - Mock for error messages  
- `showOpenDialog()` - Mock for file/folder selection dialogs
- `registerTreeDataProvider()` - Mock for tree view registration

### vscode.commands

- `registerCommand()` - Mock for command registration

### vscode.workspace

- `getConfiguration()` - Mock for configuration access
- `workspaceFolders` - Mock workspace folder array

### vscode.EventEmitter

- Full mock implementation with `event`, `fire()`, and `dispose()` methods
- Type-safe event handling

### vscode.TreeItem

- Mock implementation with all standard properties
- Support for commands, icons, tooltips, etc.

### vscode.ThemeIcon

- Mock implementation for VS Code theme icons
- Supports icon ID and color properties

## Factory Functions

### createMockExtensionContext(overrides?)

Creates a complete mock ExtensionContext with all required properties.

```typescript
const context = createMockExtensionContext({
  extensionPath: '/custom/path'
});
```

### createMockWorkspaceFolder(name, fsPath)

Creates a mock WorkspaceFolder with proper URI handling.

```typescript
const folder = createMockWorkspaceFolder('my-project', '/path/to/project');
```

### createMockWorkspaceConfiguration(configValues)

Creates a mock configuration object with predefined values.

```typescript
const config = createMockWorkspaceConfiguration({
  'setting1': 'value1',
  'setting2': 'value2'
});
```

### createTemplateItem(label, templatePath, itemType)

Creates a mock template item specific to the extension's needs.

```typescript
const item = createTemplateItem('My Template', '/path/to/template.md', 'template');
```

## Test Utilities

### setupWorkspace(folders)

Configures the mock workspace with the specified folders.

```typescript
setupWorkspace([
  createMockWorkspaceFolder('project1', '/path1'),
  createMockWorkspaceFolder('project2', '/path2')
]);
```

### setupConfiguration(values)

Configures the mock configuration system with predefined values.

```typescript
setupConfiguration({
  'kiroSteeringLoader.templatesPath': '/templates',
  'other.setting': 'value'
});
```

### userInteractions

Utilities for simulating user interactions:

```typescript
import { userInteractions } from '../mocks';

// Simulate user selecting a folder
userInteractions.selectFolder('/selected/path');

// Simulate user canceling dialog
userInteractions.cancelDialog();
```

## Testing Patterns

### Testing Extension Activation

```typescript
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { createMockExtensionContext } from '../mocks';
import { activate } from '../../src/extension';

describe('Extension Activation', () => {
  it('should register commands and tree provider', () => {
    const context = createMockExtensionContext();
    
    activate(context);
    
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.refresh',
      expect.any(Function)
    );
    expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledWith(
      'kiroSteeringLoader',
      expect.any(Object)
    );
  });
});
```

### Testing Tree Data Provider

```typescript
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { createMockExtensionContext, setupConfiguration } from '../mocks';

describe('SteeringTemplateProvider', () => {
  it('should return template items when configured', async () => {
    const context = createMockExtensionContext();
    const provider = new SteeringTemplateProvider(context);
    
    setupConfiguration({
      'templatesPath': '/test/templates'
    });
    
    const items = await provider.getChildren();
    expect(items).toBeDefined();
  });
});
```

### Testing User Interactions

```typescript
import { userInteractions } from '../mocks';

describe('Template Path Configuration', () => {
  it('should update configuration when user selects folder', async () => {
    userInteractions.selectFolder('/new/templates/path');
    
    // Execute the command that shows the dialog
    await executeCommand('kiroSteeringLoader.setTemplatesPath');
    
    expect(vscode.workspace.getConfiguration().update).toHaveBeenCalledWith(
      'templatesPath',
      '/new/templates/path',
      vscode.ConfigurationTarget.Global
    );
  });
});
```

## Type Safety

All mocks maintain full TypeScript compatibility:

```typescript
// This will provide full IntelliSense and type checking
const context: vscode.ExtensionContext = createMockExtensionContext();
const folder: vscode.WorkspaceFolder = createMockWorkspaceFolder('test', '/path');
const item: vscode.TreeItem = createMockTreeItem('Test', vscode.TreeItemCollapsibleState.None);
```

## Best Practices

1. **Use Factory Functions**: Always prefer factory functions over manual mock creation
2. **Reset Between Tests**: The setup automatically resets mocks between tests
3. **Type Everything**: Leverage TypeScript types for better test reliability
4. **Test Real Scenarios**: Use the utilities to simulate realistic user interactions
5. **Verify Mock Calls**: Always verify that the expected VS Code APIs were called

## Extending the Mocks

To add new mock functionality:

1. Add the mock implementation to `vscode.ts`
2. Create factory functions in `vscodeFactories.ts` if needed
3. Add utility functions to `setup.ts` for common scenarios
4. Export everything through `index.ts`
5. Add tests to verify the new mocks work correctly

## Troubleshooting

### Mock Not Working

- Ensure the mock setup is imported: `import '../mocks/setup'`
- Check that the mock is properly exported from `index.ts`
- Verify the mock is included in the global vscode mock object

### Type Errors

- Ensure all mock implementations match the VS Code API types
- Check that factory functions return the correct types
- Verify imports are using the correct type definitions

### Test Isolation Issues

- The setup automatically resets mocks between tests
- If you need custom reset logic, use `vi.clearAllMocks()` in your test
- Ensure you're not sharing state between tests
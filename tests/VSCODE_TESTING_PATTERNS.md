# VS Code Extension Testing Patterns

## Overview

This document provides specific patterns and utilities for testing VS Code extensions, complementing the main testing guide with VS Code-specific considerations.

## VS Code API Testing Patterns

### 1. Command Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

describe('Command Registration and Execution', () => {
  let mockContext: vscode.ExtensionContext;
  let commandRegistry: Map<string, Function>;

  beforeEach(() => {
    commandRegistry = new Map();
    
    // Mock command registration to capture registered commands
    vi.mocked(vscode.commands.registerCommand).mockImplementation(
      (command: string, callback: Function) => {
        commandRegistry.set(command, callback);
        return { dispose: vi.fn() };
      }
    );
    
    mockContext = createMockExtensionContext();
  });

  it('should register refresh command', async () => {
    await activate(mockContext);
    
    expect(commandRegistry.has('kiro-steering-loader.refresh')).toBe(true);
  });

  it('should execute refresh command correctly', async () => {
    await activate(mockContext);
    
    const refreshCommand = commandRegistry.get('kiro-steering-loader.refresh');
    expect(refreshCommand).toBeDefined();
    
    // Execute the command
    await refreshCommand!();
    
    // Verify expected behavior
    expect(mockTreeDataProvider.refresh).toHaveBeenCalled();
  });
});
```

### 2. Tree Data Provider Testing Pattern

```typescript
describe('Tree Data Provider', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    provider = new SteeringTemplateProvider(mockContext);
  });

  describe('getChildren', () => {
    it('should return setup item when no templates path configured', async () => {
      // Mock configuration to return undefined
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const children = await provider.getChildren();
      
      expect(children).toHaveLength(1);
      expect(children[0].itemType).toBe('setup');
    });

    it('should return template items when templates exist', async () => {
      // Mock configuration
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn().mockReturnValue('/mock/templates/path'),
      } as any);

      // Mock file system
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['template1.md', 'template2.md']);

      const children = await provider.getChildren();
      
      expect(children).toHaveLength(2);
      expect(children.every(item => item.itemType === 'template')).toBe(true);
    });
  });

  describe('getTreeItem', () => {
    it('should return correct TreeItem for template', () => {
      const templateItem = new TemplateItem('Test Template', 'template');
      
      const treeItem = provider.getTreeItem(templateItem);
      
      expect(treeItem.label).toBe('Test Template');
      expect(treeItem.contextValue).toBe('template');
      expect(treeItem.command).toEqual({
        command: 'kiro-steering-loader.loadTemplate',
        title: 'Load Template',
        arguments: ['Test Template'],
      });
    });
  });
});
```

### 3. Configuration Testing Pattern

```typescript
describe('Configuration Management', () => {
  let mockConfiguration: vscode.WorkspaceConfiguration;

  beforeEach(() => {
    mockConfiguration = {
      get: vi.fn(),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    };

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfiguration);
  });

  it('should read templates path from configuration', () => {
    const expectedPath = '/test/templates/path';
    vi.mocked(mockConfiguration.get).mockReturnValue(expectedPath);

    const provider = new SteeringTemplateProvider(mockContext);
    const templatesPath = provider.getTemplatesPath();

    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
    expect(mockConfiguration.get).toHaveBeenCalledWith('templatesPath');
    expect(templatesPath).toBe(expectedPath);
  });

  it('should update configuration when setting templates path', async () => {
    const newPath = '/new/templates/path';
    vi.mocked(mockConfiguration.update).mockResolvedValue();

    await setTemplatesPath(newPath);

    expect(mockConfiguration.update).toHaveBeenCalledWith(
      'templatesPath',
      newPath,
      vscode.ConfigurationTarget.Global
    );
  });
});
```

### 4. File System Operations Testing Pattern

```typescript
describe('File System Operations', () => {
  beforeEach(() => {
    // Reset all file system mocks
    vi.clearAllMocks();
  });

  describe('template loading', () => {
    it('should create .kiro/steering directory if it does not exist', async () => {
      // Setup: directory doesn't exist
      vi.mocked(fs.existsSync).mockImplementation((path: string) => {
        return !path.includes('.kiro/steering');
      });
      vi.mocked(fs.mkdirSync).mockImplementation(() => {});

      // Mock workspace folder
      const mockWorkspaceFolder = createMockWorkspaceFolder('/test/workspace');
      vi.mocked(vscode.workspace.workspaceFolders).mockReturnValue([mockWorkspaceFolder]);

      await loadTemplate('test-template');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/steering'),
        { recursive: true }
      );
    });

    it('should copy template file to destination', async () => {
      const templateContent = '# Test Template\nThis is a test template.';
      
      // Mock file operations
      vi.mocked(fs.readFileSync).mockReturnValue(templateContent);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await loadTemplate('test-template');

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-template.md'),
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/steering/test-template.md'),
        templateContent
      );
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(loadTemplate('nonexistent-template')).rejects.toThrow();
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load template')
      );
    });

    it('should handle permission errors', async () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await expect(loadTemplate('test-template')).rejects.toThrow();
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    });
  });
});
```

## Mock Utilities for VS Code Extensions

### Complete VS Code API Mock

```typescript
// tests/mocks/vscode.ts
import { vi } from 'vitest';

export const mockVSCode = {
  // Window API
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    registerTreeDataProvider: vi.fn(),
    createTreeView: vi.fn(),
    showTextDocument: vi.fn(),
  },

  // Commands API
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
    getCommands: vi.fn(),
  },

  // Workspace API
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: undefined as any,
    onDidChangeConfiguration: vi.fn(),
    onDidChangeWorkspaceFolders: vi.fn(),
    findFiles: vi.fn(),
    openTextDocument: vi.fn(),
  },

  // URI utilities
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path })),
    parse: vi.fn(),
  },

  // Event emitter
  EventEmitter: vi.fn(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  })),

  // Tree item
  TreeItem: vi.fn(),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },

  // Theme icon
  ThemeIcon: vi.fn((id: string) => ({ id })),

  // Configuration target
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },

  // Disposable
  Disposable: {
    from: vi.fn((...disposables: any[]) => ({
      dispose: vi.fn(() => disposables.forEach(d => d.dispose?.())),
    })),
  },
};

// Auto-mock the vscode module
vi.mock('vscode', () => mockVSCode);
```

### File System Mock Utilities

```typescript
// tests/mocks/fs.ts
import { vi } from 'vitest';

export interface MockFileSystem {
  files: Map<string, string>;
  directories: Set<string>;
}

export function createMockFileSystem(): MockFileSystem {
  return {
    files: new Map(),
    directories: new Set(),
  };
}

export function setupFileSystemMocks(mockFs: MockFileSystem) {
  vi.mocked(fs.existsSync).mockImplementation((path: string) => {
    return mockFs.files.has(path) || mockFs.directories.has(path);
  });

  vi.mocked(fs.readFileSync).mockImplementation((path: string, encoding?: string) => {
    const content = mockFs.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  });

  vi.mocked(fs.writeFileSync).mockImplementation((path: string, data: string) => {
    mockFs.files.set(path, data);
  });

  vi.mocked(fs.mkdirSync).mockImplementation((path: string, options?: any) => {
    mockFs.directories.add(path);
  });

  vi.mocked(fs.readdirSync).mockImplementation((path: string) => {
    const entries: string[] = [];
    
    // Find files in this directory
    for (const [filePath] of mockFs.files) {
      if (filePath.startsWith(path + '/')) {
        const relativePath = filePath.substring(path.length + 1);
        if (!relativePath.includes('/')) {
          entries.push(relativePath);
        }
      }
    }
    
    return entries;
  });
}

// Usage example:
export function addMockFile(mockFs: MockFileSystem, path: string, content: string) {
  mockFs.files.set(path, content);
}

export function addMockDirectory(mockFs: MockFileSystem, path: string) {
  mockFs.directories.add(path);
}
```

## Test Helper Utilities

### Extension Context Factory

```typescript
// tests/utils/testHelpers.ts
export function createMockExtensionContext(): vscode.ExtensionContext {
  const subscriptions: vscode.Disposable[] = [];
  
  return {
    subscriptions,
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(() => []),
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
      setKeysForSync: vi.fn(),
      keys: vi.fn(() => []),
    },
    extensionPath: '/mock/extension/path',
    extensionUri: vscode.Uri.file('/mock/extension/path'),
    environmentVariableCollection: {
      persistent: true,
      replace: vi.fn(),
      append: vi.fn(),
      prepend: vi.fn(),
      get: vi.fn(),
      forEach: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    asAbsolutePath: vi.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
    storageUri: vscode.Uri.file('/mock/storage'),
    globalStorageUri: vscode.Uri.file('/mock/global-storage'),
    logUri: vscode.Uri.file('/mock/logs'),
    extensionMode: 3, // Test mode
    extension: {
      id: 'test.extension',
      extensionPath: '/mock/extension/path',
      isActive: true,
      packageJSON: {},
      extensionKind: 1,
      exports: {},
      activate: vi.fn(),
    },
  };
}
```

### Workspace Folder Factory

```typescript
export function createMockWorkspaceFolder(
  path: string,
  name?: string
): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path),
    name: name || path.split('/').pop() || 'workspace',
    index: 0,
  };
}
```

### Configuration Factory

```typescript
export function createMockConfiguration(
  values: Record<string, any> = {}
): vscode.WorkspaceConfiguration {
  return {
    get: vi.fn((key: string, defaultValue?: any) => {
      return values.hasOwnProperty(key) ? values[key] : defaultValue;
    }),
    has: vi.fn((key: string) => values.hasOwnProperty(key)),
    inspect: vi.fn(),
    update: vi.fn(),
  };
}
```

## Advanced Testing Patterns

### 1. Event Testing Pattern

```typescript
describe('Event Handling', () => {
  it('should emit tree data change event on refresh', () => {
    const provider = new SteeringTemplateProvider(mockContext);
    const eventSpy = vi.fn();
    
    // Subscribe to the event
    provider.onDidChangeTreeData(eventSpy);
    
    // Trigger the event
    provider.refresh();
    
    // Verify event was emitted
    expect(eventSpy).toHaveBeenCalledOnce();
  });

  it('should handle configuration change events', () => {
    let configChangeHandler: Function;
    
    // Capture the configuration change handler
    vi.mocked(vscode.workspace.onDidChangeConfiguration).mockImplementation(
      (handler: Function) => {
        configChangeHandler = handler;
        return { dispose: vi.fn() };
      }
    );
    
    const provider = new SteeringTemplateProvider(mockContext);
    
    // Simulate configuration change
    configChangeHandler!({
      affectsConfiguration: vi.fn().mockReturnValue(true),
    });
    
    // Verify provider responded to change
    expect(provider.refresh).toHaveBeenCalled();
  });
});
```

### 2. Async Operation Testing Pattern

```typescript
describe('Async Operations', () => {
  it('should handle concurrent template loading', async () => {
    const provider = new SteeringTemplateProvider(mockContext);
    
    // Start multiple concurrent operations
    const promises = [
      provider.loadTemplate('template1'),
      provider.loadTemplate('template2'),
      provider.loadTemplate('template3'),
    ];
    
    // Wait for all to complete
    await Promise.all(promises);
    
    // Verify all operations completed successfully
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
  });

  it('should handle operation cancellation', async () => {
    const provider = new SteeringTemplateProvider(mockContext);
    
    // Create a slow operation
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve('content'), 1000));
    });
    
    const promise = provider.loadTemplate('slow-template');
    
    // Cancel the operation
    provider.cancel();
    
    // Verify operation was cancelled
    await expect(promise).rejects.toThrow('Operation cancelled');
  });
});
```

### 3. Error Recovery Testing Pattern

```typescript
describe('Error Recovery', () => {
  it('should recover from temporary file system errors', async () => {
    let callCount = 0;
    
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Temporary error');
      }
      // Success on retry
    });
    
    const provider = new SteeringTemplateProvider(mockContext);
    
    // Should succeed after retry
    await expect(provider.loadTemplate('test-template')).resolves.not.toThrow();
    
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });
});
```

## Performance Testing Utilities

### Memory Usage Testing

```typescript
// tests/utils/performanceHelpers.ts
export function measureMemoryUsage<T>(fn: () => T): { result: T; memoryUsed: number } {
  const initialMemory = process.memoryUsage().heapUsed;
  const result = fn();
  const finalMemory = process.memoryUsage().heapUsed;
  
  return {
    result,
    memoryUsed: finalMemory - initialMemory,
  };
}

export async function measureAsyncMemoryUsage<T>(
  fn: () => Promise<T>
): Promise<{ result: T; memoryUsed: number }> {
  const initialMemory = process.memoryUsage().heapUsed;
  const result = await fn();
  const finalMemory = process.memoryUsage().heapUsed;
  
  return {
    result,
    memoryUsed: finalMemory - initialMemory,
  };
}
```

### Timing Utilities

```typescript
export function measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  return {
    result,
    duration: end - start,
  };
}
```

This comprehensive guide provides the specific patterns and utilities needed for effective VS Code extension testing, ensuring type safety and proper mocking of the VS Code API.
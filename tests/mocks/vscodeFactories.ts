/**
 * Mock factory functions for creating VS Code objects with proper typing
 * These factories help create consistent, type-safe mock objects for testing
 * 
 * @fileoverview Updated 2025-12-13: Enhanced factories with better defaults and validation
 * @version 2.0.0 - Improved type safety and added new utility functions
 */

import { vi } from 'vitest';
import { 
  MockUri, 
  MockDisposable, 
  MockEventEmitter, 
  MockTreeItem, 
  MockThemeIcon,
  TreeItemCollapsibleState,
  ConfigurationTarget,
  ExtensionMode,
  type MockedExtensionContext,
  type MockedWorkspaceConfiguration
} from './vscode';

/**
 * Creates a mock ExtensionContext with all required properties
 */
export function createMockExtensionContext(overrides: Partial<MockedExtensionContext> = {}): MockedExtensionContext {
  const mockMemento = {
    keys: vi.fn().mockReturnValue([]),
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    setKeysForSync: vi.fn()
  };

  const mockSecretStorage = {
    get: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    onDidChange: vi.fn().mockReturnValue(new MockDisposable())
  };

  const mockEnvironmentVariableCollection = {
    persistent: true,
    description: 'Test Environment Variables',
    replace: vi.fn(),
    append: vi.fn(),
    prepend: vi.fn(),
    get: vi.fn(),
    forEach: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    getScoped: vi.fn()
  };

  const mockExtension = {
    id: 'test.extension',
    extensionUri: MockUri.file('/test/extension'),
    extensionPath: '/test/extension',
    isActive: true,
    packageJSON: {},
    extensionKind: 1,
    exports: undefined,
    activate: vi.fn().mockResolvedValue(undefined)
  };

  return {
    subscriptions: [],
    workspaceState: mockMemento,
    globalState: mockMemento,
    extensionUri: MockUri.file('/test/extension'),
    extensionPath: '/test/extension',
    asAbsolutePath: vi.fn().mockImplementation((relativePath: string) => `/test/extension/${relativePath}`),
    storageUri: MockUri.file('/test/storage'),
    storagePath: '/test/storage',
    globalStorageUri: MockUri.file('/test/global-storage'),
    globalStoragePath: '/test/global-storage',
    logUri: MockUri.file('/test/logs'),
    logPath: '/test/logs',
    extensionMode: ExtensionMode.Test,
    extension: mockExtension,
    secrets: mockSecretStorage,
    environmentVariableCollection: mockEnvironmentVariableCollection,
    ...overrides
  };
}

/**
 * Creates a mock WorkspaceFolder with proper typing
 */
export function createMockWorkspaceFolder(
  name: string = 'test-workspace',
  fsPath: string = '/test/workspace'
): vscode.WorkspaceFolder {
  return {
    uri: MockUri.file(fsPath),
    name,
    index: 0
  };
}

/**
 * Creates a mock WorkspaceConfiguration with customizable behavior
 */
export function createMockWorkspaceConfiguration(
  configValues: Record<string, any> = {}
): MockedWorkspaceConfiguration {
  return {
    get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
      return configValues.hasOwnProperty(key) ? configValues[key] : defaultValue;
    }),
    update: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockImplementation((key: string) => configValues.hasOwnProperty(key)),
    inspect: vi.fn().mockImplementation((key: string) => ({
      key,
      defaultValue: undefined,
      globalValue: configValues[key],
      workspaceValue: undefined,
      workspaceFolderValue: undefined
    }))
  };
}

/**
 * Creates a mock TreeItem with proper typing and default values
 */
export function createMockTreeItem(
  label: string,
  collapsibleState: vscode.TreeItemCollapsibleState = TreeItemCollapsibleState.None,
  overrides: Partial<vscode.TreeItem> = {}
): MockTreeItem {
  const item = new MockTreeItem(label, collapsibleState);
  
  // Apply any overrides
  Object.assign(item, overrides);
  
  return item;
}

/**
 * Creates a mock ThemeIcon with proper typing
 */
export function createMockThemeIcon(
  id: string,
  color?: vscode.ThemeColor
): MockThemeIcon {
  return new MockThemeIcon(id, color);
}

/**
 * Creates a mock EventEmitter with proper typing
 */
export function createMockEventEmitter<T>(): MockEventEmitter<T> {
  return new MockEventEmitter<T>();
}

/**
 * Creates a mock Command object
 */
export function createMockCommand(
  command: string,
  title: string,
  args?: any[]
): vscode.Command {
  return {
    command,
    title,
    arguments: args
  };
}

/**
 * Creates a mock OpenDialogOptions object
 */
export function createMockOpenDialogOptions(
  overrides: Partial<vscode.OpenDialogOptions> = {}
): vscode.OpenDialogOptions {
  return {
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Open',
    ...overrides
  };
}

/**
 * Creates multiple mock workspace folders
 */
export function createMockWorkspaceFolders(
  folders: Array<{ name: string; fsPath: string }>
): vscode.WorkspaceFolder[] {
  return folders.map((folder, index) => ({
    uri: MockUri.file(folder.fsPath),
    name: folder.name,
    index
  }));
}

/**
 * Creates a mock Disposable with tracking capabilities
 */
export function createMockDisposable(onDispose?: () => void): MockDisposable {
  const disposable = new MockDisposable();
  
  if (onDispose) {
    const originalDispose = disposable.dispose.bind(disposable);
    disposable.dispose = () => {
      originalDispose();
      onDispose();
    };
  }
  
  return disposable;
}

/**
 * Creates a collection of commonly used mock objects for testing
 */
export function createTestSuite() {
  const context = createMockExtensionContext();
  const workspaceFolder = createMockWorkspaceFolder();
  const configuration = createMockWorkspaceConfiguration();
  
  return {
    context,
    workspaceFolder,
    configuration,
    // Helper to reset all mocks
    resetMocks: () => {
      vi.clearAllMocks();
    }
  };
}

/**
 * Type-safe factory for creating template items used in the extension
 * Enhanced with better validation and error handling
 */
export function createTemplateItem(
  label: string,
  templatePath: string,
  itemType: 'template' | 'info' | 'error' | 'setup'
): MockTreeItem {
  // Validate inputs
  if (!label || typeof label !== 'string') {
    throw new Error('Template item label must be a non-empty string');
  }
  
  if (!templatePath || typeof templatePath !== 'string') {
    throw new Error('Template path must be a non-empty string');
  }
  
  const item = createMockTreeItem(label, TreeItemCollapsibleState.None);
  
  // Add properties specific to TemplateItem with proper typing
  (item as any).templatePath = templatePath;
  (item as any).itemType = itemType;
  
  // Set up command and icon based on item type
  switch (itemType) {
    case 'template':
      item.tooltip = `Load template: ${label}`;
      item.command = createMockCommand(
        'kiroSteeringLoader.loadTemplate',
        'Load Template',
        [templatePath]
      );
      item.iconPath = createMockThemeIcon('file-text');
      break;
      
    case 'setup':
      item.tooltip = 'Click to configure templates directory';
      item.command = createMockCommand(
        'kiroSteeringLoader.setTemplatesPath',
        'Set Templates Path'
      );
      item.iconPath = createMockThemeIcon('folder-opened');
      break;
      
    case 'info':
      item.tooltip = `Information: ${label}`;
      item.iconPath = createMockThemeIcon('info');
      break;
      
    case 'error':
      item.tooltip = `Error: ${label}`;
      item.iconPath = createMockThemeIcon('error');
      break;
      
    default:
      throw new Error(`Unsupported template item type: ${itemType}`);
  }
  
  return item;
}

/**
 * Validates that a mock object has the expected structure
 * Added for better test reliability and debugging
 */
export function validateMockObject<T>(
  mockObject: T,
  expectedProperties: (keyof T)[]
): boolean {
  if (!mockObject || typeof mockObject !== 'object') {
    return false;
  }
  
  return expectedProperties.every(prop => prop in mockObject);
}

/**
 * Creates a batch of mock objects for complex test scenarios
 * Useful for integration tests that need multiple related mocks
 */
export function createMockBatch(config: {
  workspaceFolders?: Array<{ name: string; fsPath: string }>;
  configValues?: Record<string, any>;
  templateItems?: Array<{ label: string; path: string; type: 'template' | 'info' | 'error' | 'setup' }>;
}) {
  const context = createMockExtensionContext();
  const workspaceFolders = config.workspaceFolders 
    ? createMockWorkspaceFolders(config.workspaceFolders)
    : [createMockWorkspaceFolder()];
  const configuration = createMockWorkspaceConfiguration(config.configValues || {});
  const templateItems = config.templateItems?.map(item => 
    createTemplateItem(item.label, item.path, item.type)
  ) || [];
  
  return {
    context,
    workspaceFolders,
    configuration,
    templateItems,
    resetAll: () => {
      vi.clearAllMocks();
    }
  };
}
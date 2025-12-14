/**
 * Comprehensive VS Code API mocks for testing
 * Provides type-safe mock implementations for all VS Code APIs used in the extension
 */

import { vi, type MockedFunction } from 'vitest';

// Mock types for VS Code API objects
export interface MockedVSCodeWindow {
  showInformationMessage: MockedFunction<typeof vscode.window.showInformationMessage>;
  showErrorMessage: MockedFunction<typeof vscode.window.showErrorMessage>;
  showWarningMessage: MockedFunction<typeof vscode.window.showWarningMessage>;
  showInputBox: MockedFunction<typeof vscode.window.showInputBox>;
  showOpenDialog: MockedFunction<typeof vscode.window.showOpenDialog>;
  registerTreeDataProvider: MockedFunction<typeof vscode.window.registerTreeDataProvider>;
  createOutputChannel: MockedFunction<typeof vscode.window.createOutputChannel>;
}

export interface MockedVSCodeCommands {
  registerCommand: MockedFunction<typeof vscode.commands.registerCommand>;
}

export interface MockedVSCodeWorkspace {
  getConfiguration: MockedFunction<typeof vscode.workspace.getConfiguration>;
  workspaceFolders: vscode.WorkspaceFolder[] | undefined;
}

export interface MockedWorkspaceConfiguration {
  get: MockedFunction<any>;
  update: MockedFunction<any>;
  has: MockedFunction<any>;
  inspect: MockedFunction<any>;
}

export interface MockedExtensionContext {
  subscriptions: vscode.Disposable[];
  workspaceState: vscode.Memento;
  globalState: vscode.Memento;
  extensionUri: vscode.Uri;
  extensionPath: string;
  asAbsolutePath: MockedFunction<any>;
  storageUri: vscode.Uri | undefined;
  storagePath: string | undefined;
  globalStorageUri: vscode.Uri;
  globalStoragePath: string;
  logUri: vscode.Uri;
  logPath: string;
  extensionMode: vscode.ExtensionMode;
  extension: vscode.Extension<any>;
  secrets: vscode.SecretStorage;
  environmentVariableCollection: vscode.EnvironmentVariableCollection;
}

// Mock EventEmitter class
export class MockEventEmitter<T> implements vscode.EventEmitter<T> {
  private listeners: Array<(e: T) => any> = [];
  
  public readonly event: vscode.Event<T> = (listener: (e: T) => any) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
          this.listeners.splice(index, 1);
        }
      }
    };
  };

  fire(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// Mock TreeItem class
export class MockTreeItem implements vscode.TreeItem {
  public label?: string | vscode.TreeItemLabel;
  public id?: string;
  public iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;
  public description?: string | boolean;
  public resourceUri?: vscode.Uri;
  public tooltip?: string | vscode.MarkdownString;
  public command?: vscode.Command;
  public collapsibleState?: vscode.TreeItemCollapsibleState;
  public contextValue?: string;
  public accessibilityInformation?: vscode.AccessibilityInformation;

  constructor(
    label: string | vscode.TreeItemLabel,
    collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

// Mock ThemeIcon class
export class MockThemeIcon implements vscode.ThemeIcon {
  public readonly id: string;
  public readonly color?: vscode.ThemeColor;

  constructor(id: string, color?: vscode.ThemeColor) {
    this.id = id;
    this.color = color;
  }
}

// Mock Uri class
export class MockUri implements vscode.Uri {
  public readonly scheme: string;
  public readonly authority: string;
  public readonly path: string;
  public readonly query: string;
  public readonly fragment: string;
  public readonly fsPath: string;

  constructor(fsPath: string) {
    this.scheme = 'file';
    this.authority = '';
    this.path = fsPath.replace(/\\/g, '/');
    this.query = '';
    this.fragment = '';
    this.fsPath = fsPath;
  }

  static file(path: string): MockUri {
    return new MockUri(path);
  }

  static parse(value: string): MockUri {
    return new MockUri(value);
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): vscode.Uri {
    return new MockUri(change.path || this.fsPath);
  }

  toString(): string {
    return this.fsPath;
  }

  toJSON(): any {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
      fsPath: this.fsPath
    };
  }
}

// Mock Disposable
export class MockDisposable implements vscode.Disposable {
  private disposed = false;

  dispose(): void {
    this.disposed = true;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

// Mock OutputChannel
export class MockOutputChannel implements vscode.OutputChannel {
  public readonly name: string;
  private _content: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  append(value: string): void {
    this._content.push(value);
  }

  appendLine(value: string): void {
    this._content.push(value + '\n');
  }

  clear(): void {
    this._content = [];
  }

  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(_columnOrPreserveFocus?: vscode.ViewColumn | boolean, _preserveFocus?: boolean): void {
    // Mock implementation - does nothing
  }

  hide(): void {
    // Mock implementation - does nothing
  }

  dispose(): void {
    this._content = [];
  }

  replace(value: string): void {
    this._content = [value];
  }

  getContent(): string {
    return this._content.join('');
  }
}

// Enums
export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
} as const;

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
} as const;

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3
} as const;

// Create the main vscode mock object
export const createVSCodeMock = () => {
  const mockWindow: MockedVSCodeWindow = {
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    showInputBox: vi.fn().mockResolvedValue(undefined),
    showOpenDialog: vi.fn().mockResolvedValue(undefined),
    registerTreeDataProvider: vi.fn().mockReturnValue(new MockDisposable()),
    createOutputChannel: vi.fn().mockImplementation((name: string) => new MockOutputChannel(name))
  };

  const mockCommands: MockedVSCodeCommands = {
    registerCommand: vi.fn().mockReturnValue(new MockDisposable())
  };

  const mockWorkspaceConfiguration: MockedWorkspaceConfiguration = {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(false),
    inspect: vi.fn()
  };

  const mockWorkspace: MockedVSCodeWorkspace = {
    getConfiguration: vi.fn().mockReturnValue(mockWorkspaceConfiguration),
    workspaceFolders: undefined
  };

  return {
    window: mockWindow,
    commands: mockCommands,
    workspace: mockWorkspace,
    EventEmitter: MockEventEmitter,
    TreeItem: MockTreeItem,
    ThemeIcon: MockThemeIcon,
    Uri: MockUri,
    Disposable: MockDisposable,
    TreeItemCollapsibleState,
    ConfigurationTarget,
    ExtensionMode
  };
};

// Global vscode mock for module mocking
export const vscode = createVSCodeMock();

// Default export for easier importing
export default vscode;
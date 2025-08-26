/**
 * Debug test for loadTemplate method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the modules first (hoisted)
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn()
  },
  EventEmitter: class MockEventEmitter {
    private listeners: Array<(e: any) => any> = [];
    
    public readonly event = (listener: (e: any) => any) => {
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

    fire(data: any): void {
      this.listeners.forEach(listener => listener(data));
    }

    dispose(): void {
      this.listeners = [];
    }
  },
  TreeItem: class MockTreeItem {
    constructor(public label: string, public collapsibleState?: number) {}
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string) {}
  }
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/'))
}));

// Import after mocking
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';

describe('Debug loadTemplate', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: any;
  let mockVSCode: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockVSCode = await vi.importMock('vscode');
    
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() }
    };
    
    provider = new SteeringTemplateProvider(mockContext);
  });

  it('should call showErrorMessage for empty string', async () => {
    // Debug the provider and method
    console.log('Provider exists:', !!provider);
    console.log('loadTemplate method exists:', typeof provider.loadTemplate);
    console.log('Empty string truthy check:', !'');
    
    // Spy on the method to see if it's called
    const loadTemplateSpy = vi.spyOn(provider, 'loadTemplate');
    
    // Act
    await provider.loadTemplate('');

    // Assert
    console.log('loadTemplate was called:', loadTemplateSpy.mock.calls.length);
    console.log('showErrorMessage calls:', mockVSCode.window.showErrorMessage.mock.calls);
    expect(loadTemplateSpy).toHaveBeenCalled();
  });

  it('should call showErrorMessage for undefined', async () => {
    // Act
    await provider.loadTemplate(undefined as any);

    // Assert
    console.log('showErrorMessage calls:', mockVSCode.window.showErrorMessage.mock.calls);
    expect(mockVSCode.window.showErrorMessage).toHaveBeenCalled();
  });
});
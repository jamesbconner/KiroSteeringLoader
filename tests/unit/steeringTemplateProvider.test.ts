/**
 * Unit tests for SteeringTemplateProvider class
 * Tests constructor initialization, refresh method, getTreeItem, getChildren, and private getTemplateItems method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockEventEmitter, TreeItemCollapsibleState } from '../mocks/vscode';
import { fileSystemMockUtils } from '../mocks/fs';

// Mock the modules first (hoisted)
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: undefined
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn()
  },
  EventEmitter: MockEventEmitter,
  TreeItem: class MockTreeItem {
    constructor(public label: string, public collapsibleState?: number) {}
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string) {}
  },
  TreeItemCollapsibleState
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  basename: vi.fn((path, ext) => {
    const name = path.split('/').pop() || path;
    return ext ? name.replace(ext, '') : name;
  })
}));

// Import after mocking
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';

// Helper function to create mock workspace folder
function createMockWorkspaceFolder(name: string, fsPath: string) {
  return {
    uri: { fsPath } as any,
    name,
    index: 0
  };
}

describe('SteeringTemplateProvider', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: any;
  let mockVSCode: any;
  let mockFs: any;
  let mockPath: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
    // Get the mocked modules
    mockVSCode = await vi.importMock('vscode');
    mockFs = await vi.importMock('fs');
    mockPath = await vi.importMock('path');
    
    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() }
    };
    
    // Create provider instance
    provider = new SteeringTemplateProvider(mockContext);
  });

  describe('Constructor', () => {
    it('should initialize with ExtensionContext parameter', () => {
      // Arrange
      const customContext = {
        subscriptions: [],
        extensionPath: '/custom/extension/path',
        workspaceState: { get: vi.fn(), update: vi.fn() },
        globalState: { get: vi.fn(), update: vi.fn() }
      };

      // Act
      const customProvider = new SteeringTemplateProvider(customContext);

      // Assert
      expect(customProvider).toBeInstanceOf(SteeringTemplateProvider);
      expect((customProvider as any).context).toBe(customContext);
    });

    it('should initialize onDidChangeTreeData event emitter', () => {
      // Assert
      expect(provider.onDidChangeTreeData).toBeDefined();
      expect(typeof provider.onDidChangeTreeData).toBe('function');
    });

    it('should have private _onDidChangeTreeData EventEmitter', () => {
      // Assert
      const privateEmitter = (provider as any)._onDidChangeTreeData;
      expect(privateEmitter).toBeDefined();
      expect(privateEmitter.fire).toBeDefined();
      expect(typeof privateEmitter.fire).toBe('function');
    });

    it('should store context reference for later use', () => {
      // Assert
      expect((provider as any).context).toBe(mockContext);
    });
  });

  describe('refresh method', () => {
    it('should fire onDidChangeTreeData event', () => {
      // Arrange
      const eventSpy = vi.fn();
      provider.onDidChangeTreeData(eventSpy);

      // Act
      provider.refresh();

      // Assert
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(undefined);
    });

    it('should fire event multiple times when called multiple times', () => {
      // Arrange
      const eventSpy = vi.fn();
      provider.onDidChangeTreeData(eventSpy);

      // Act
      provider.refresh();
      provider.refresh();
      provider.refresh();

      // Assert
      expect(eventSpy).toHaveBeenCalledTimes(3);
    });

    it('should notify multiple listeners', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      
      provider.onDidChangeTreeData(listener1);
      provider.onDidChangeTreeData(listener2);
      provider.onDidChangeTreeData(listener3);

      // Act
      provider.refresh();

      // Assert
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when no listeners are registered', () => {
      // Act & Assert
      expect(() => provider.refresh()).not.toThrow();
    });
  });

  describe('getTreeItem method', () => {
    it('should return the same TemplateItem that was passed in', () => {
      // Arrange
      const mockTemplateItem = {
        label: 'test-template',
        templatePath: '/test/path/template.md',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'template'
      };

      // Act
      const result = provider.getTreeItem(mockTemplateItem as any);

      // Assert
      expect(result).toBe(mockTemplateItem);
    });

    it('should handle template type TemplateItem', () => {
      // Arrange
      const mockTemplateItem = {
        label: 'My Template',
        templatePath: '/path/to/template.md',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'template',
        tooltip: 'Load template: My Template',
        command: {
          command: 'kiroSteeringLoader.loadTemplate',
          title: 'Load Template',
          arguments: ['/path/to/template.md']
        }
      };

      // Act
      const result = provider.getTreeItem(mockTemplateItem as any);

      // Assert
      expect(result).toBe(mockTemplateItem);
      expect(result.label).toBe('My Template');
      expect(result.itemType).toBe('template');
    });

    it('should handle setup type TemplateItem', () => {
      // Arrange
      const mockSetupItem = {
        label: 'Click to set templates path',
        templatePath: '',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'setup',
        tooltip: 'Click to configure templates directory',
        command: {
          command: 'kiroSteeringLoader.setTemplatesPath',
          title: 'Set Templates Path'
        }
      };

      // Act
      const result = provider.getTreeItem(mockSetupItem as any);

      // Assert
      expect(result).toBe(mockSetupItem);
      expect(result.itemType).toBe('setup');
    });

    it('should handle info type TemplateItem', () => {
      // Arrange
      const mockInfoItem = {
        label: 'No templates found',
        templatePath: '',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'info'
      };

      // Act
      const result = provider.getTreeItem(mockInfoItem as any);

      // Assert
      expect(result).toBe(mockInfoItem);
      expect(result.itemType).toBe('info');
    });

    it('should handle error type TemplateItem', () => {
      // Arrange
      const mockErrorItem = {
        label: 'Templates path not found',
        templatePath: '',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'error'
      };

      // Act
      const result = provider.getTreeItem(mockErrorItem as any);

      // Assert
      expect(result).toBe(mockErrorItem);
      expect(result.itemType).toBe('error');
    });
  });

  describe('getChildren method', () => {
    it('should return empty array when element is provided', async () => {
      // Arrange
      const mockElement = {
        label: 'test',
        templatePath: '/test/path',
        collapsibleState: TreeItemCollapsibleState.None,
        itemType: 'template' as const
      };

      // Act
      const result = await provider.getChildren(mockElement as any);

      // Assert
      expect(result).toEqual([]);
    });

    it('should call getTemplateItems when no element is provided', async () => {
      // Arrange
      const mockConfig = { get: vi.fn().mockReturnValue(undefined) };
      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      // Spy on private method
      const getTemplateItemsSpy = vi.spyOn(provider as any, 'getTemplateItems');
      getTemplateItemsSpy.mockReturnValue([]);

      // Act
      await provider.getChildren();

      // Assert
      expect(getTemplateItemsSpy).toHaveBeenCalledTimes(1);
    });

    it('should return result from getTemplateItems when no element provided', async () => {
      // Arrange
      const expectedItems = [
        { label: 'template1', itemType: 'template' },
        { label: 'template2', itemType: 'template' }
      ];

      // Spy on private method
      const getTemplateItemsSpy = vi.spyOn(provider as any, 'getTemplateItems');
      getTemplateItemsSpy.mockReturnValue(expectedItems);

      // Act
      const result = await provider.getChildren();

      // Assert
      expect(result).toEqual(expectedItems);
    });

    it('should handle undefined element parameter', async () => {
      // Arrange
      const mockConfig = { get: vi.fn().mockReturnValue(undefined) };
      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      // Spy on private method
      const getTemplateItemsSpy = vi.spyOn(provider as any, 'getTemplateItems');
      getTemplateItemsSpy.mockReturnValue([]);

      // Act
      const result = await provider.getChildren(undefined);

      // Assert
      expect(getTemplateItemsSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('getTemplateItems private method', () => {
    describe('when no templates path is configured', () => {
      it('should return setup item when templatesPath is undefined', () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue(undefined) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Click to set templates path');
        expect(result[0].itemType).toBe('setup');
      });

      it('should return setup item when templatesPath is empty string', () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('') };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Click to set templates path');
        expect(result[0].itemType).toBe('setup');
      });

      it('should return setup item when templatesPath is null', () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue(null) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Click to set templates path');
        expect(result[0].itemType).toBe('setup');
      });
    });

    describe('when templates path does not exist', () => {
      it('should return error and setup items when path does not exist', () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('/nonexistent/path') };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(false);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('Templates path not found');
        expect(result[0].itemType).toBe('error');
        expect(result[1].label).toBe('Click to set new path');
        expect(result[1].itemType).toBe('setup');
      });

      it('should handle different non-existent paths', () => {
        // Arrange
        const paths = ['/does/not/exist', 'C:\\invalid\\path', '/tmp/missing'];
        
        paths.forEach(path => {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(path) };
          mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
          mockFs.existsSync.mockReturnValue(false);

          // Act
          const result = (provider as any).getTemplateItems();

          // Assert
          expect(result).toHaveLength(2);
          expect(result[0].itemType).toBe('error');
          expect(result[1].itemType).toBe('setup');
        });
      });
    });

    describe('when templates directory exists but is empty', () => {
      it('should return info items when no .md files found', () => {
        // Arrange
        const templatesPath = '/test/empty';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue([]);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('No .md template files found');
        expect(result[0].itemType).toBe('info');
        expect(result[1].label).toBe('Path: /test/empty');
        expect(result[1].itemType).toBe('info');
      });

      it('should return info items when directory has non-markdown files', () => {
        // Arrange
        const templatesPath = '/test/non-markdown';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['readme.txt', 'config.json', 'script.js']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('No .md template files found');
        expect(result[0].itemType).toBe('info');
        expect(result[1].label).toBe(`Path: ${templatesPath}`);
        expect(result[1].itemType).toBe('info');
      });
    });

    describe('when templates directory has valid templates', () => {
      it('should return template items for .md files', () => {
        // Arrange
        const templatesPath = '/test/templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template1.md', 'template2.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('template1');
        expect(result[0].itemType).toBe('template');
        expect(result[0].templatePath).toBe('/test/templates/template1.md');
        expect(result[1].label).toBe('template2');
        expect(result[1].itemType).toBe('template');
        expect(result[1].templatePath).toBe('/test/templates/template2.md');
      });

      it('should filter out non-markdown files', () => {
        // Arrange
        const templatesPath = '/test/mixed';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template1.md', 'template2.md', 'readme.txt', 'config.json', 'template3.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3);
        expect(result.every(item => item.itemType === 'template')).toBe(true);
        expect(result.map(item => item.label)).toEqual(['template1', 'template2', 'template3']);
      });

      it('should handle templates with different naming patterns', () => {
        // Arrange
        const templatesPath = '/test/naming';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['simple.md', 'with-dashes.md', 'with_underscores.md', 'CamelCase.md', '123-numeric.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(5);
        expect(result.map(item => item.label)).toEqual([
          'simple',
          'with-dashes',
          'with_underscores',
          'CamelCase',
          '123-numeric'
        ]);
      });

      it('should create correct template paths', () => {
        // Arrange
        const templatesPath = '/custom/templates/path';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template1.md', 'template2.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].templatePath).toBe(`${templatesPath}/template1.md`);
        expect(result[1].templatePath).toBe(`${templatesPath}/template2.md`);
      });
    });

    describe('error handling', () => {
      it('should return error items when readdir throws exception', () => {
        // Arrange
        const templatesPath = '/test/error';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].label).toBe('Error reading templates directory');
        expect(result[0].itemType).toBe('error');
        expect(result[1].label).toBe('Click to set new path');
        expect(result[1].itemType).toBe('setup');
      });

      it('should handle different types of file system errors', () => {
        // Arrange
        const templatesPath = '/test/error';
        const errors = [
          new Error('EACCES: permission denied'),
          new Error('ENOENT: no such file or directory'),
          new Error('EMFILE: too many open files'),
          new Error('Unknown error')
        ];

        errors.forEach(error => {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
          mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
          mockFs.existsSync.mockReturnValue(true);
          mockFs.readdirSync.mockImplementation(() => {
            throw error;
          });

          // Act
          const result = (provider as any).getTemplateItems();

          // Assert
          expect(result).toHaveLength(2);
          expect(result[0].itemType).toBe('error');
          expect(result[1].itemType).toBe('setup');
        });
      });

      it('should handle null or undefined from readdirSync', () => {
        // Arrange
        const templatesPath = '/test/null';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(null as any);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].itemType).toBe('error');
        expect(result[1].itemType).toBe('setup');
      });
    });

    describe('configuration integration', () => {
      it('should read configuration from correct section', () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('/test/path') };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(false);

        // Act
        (provider as any).getTemplateItems();

        // Assert
        expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
        expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      });

      it('should handle configuration get method returning different types', () => {
        // Arrange
        const testValues = [undefined, null, '', 'valid/path', 123, {}, []];
        
        testValues.forEach(value => {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(value) };
          mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
          mockFs.existsSync.mockReturnValue(false);

          // Act & Assert - should not throw
          expect(() => (provider as any).getTemplateItems()).not.toThrow();
        });
      });
    });

    describe('path handling', () => {
      it('should handle Windows-style paths', () => {
        // Arrange
        const templatesPath = 'C:\\Users\\Test\\Templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].itemType).toBe('template');
      });

      it('should handle Unix-style paths', () => {
        // Arrange
        const templatesPath = '/home/user/templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].itemType).toBe('template');
      });

      it('should handle relative paths', () => {
        // Arrange
        const templatesPath = './templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].itemType).toBe('template');
      });
    });
  });

  describe('loadTemplate method', () => {
    describe('successful template loading', () => {
      it('should load template successfully with proper file operations and directory creation', async () => {
        // Arrange
        const templatePath = '/test/templates/template1.md';
        const templateContent = '# Test Template\nThis is test content';
        const workspacePath = '/test/workspace';
        const steeringDir = '/test/workspace/.kiro/steering';
        const targetPath = '/test/workspace/.kiro/steering/template1.md';

        // Set up file system
        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath],
          files: {
            [templatePath]: templateContent
          }
        });

        // Set up workspace
        const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.mkdirSync).toHaveBeenCalledWith(steeringDir, { recursive: true });
        expect(mockFs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(targetPath, templateContent);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith('Template "template1.md" loaded successfully');
      });

      it('should create .kiro/steering directory when it does not exist', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Mock existsSync to return false for steering directory
        mockFs.existsSync.mockImplementation((path: string) => {
          const normalized = path.replace(/\\/g, '/');
          return !normalized.includes('.kiro/steering');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.kiro/steering', { recursive: true });
      });

      it('should not create directory when .kiro/steering already exists', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro', '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Mock existsSync to return true for steering directory
        mockFs.existsSync.mockImplementation((path: string) => {
          return fileSystemMockUtils.exists(path);
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      });

      it('should handle templates with different file extensions', async () => {
        // Arrange
        const templatePath = '/test/templates/complex-template.md';
        const templateContent = '# Complex Template\n\n## Section 1\nContent with **markdown**';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/complex-template.md',
          templateContent
        );
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "complex-template.md" loaded successfully'
        );
      });

      it('should handle templates with Unicode content', async () => {
        // Arrange
        const templatePath = '/test/templates/unicode-template.md';
        const templateContent = '# Unicode Template 🚀\n\nContent with émojis and spëcial characters: 中文';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/unicode-template.md',
          templateContent
        );
      });

      it('should handle empty template files', async () => {
        // Arrange
        const templatePath = '/test/templates/empty-template.md';
        const templateContent = '';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/empty-template.md',
          ''
        );
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "empty-template.md" loaded successfully'
        );
      });

      it('should overwrite existing template files in steering directory', async () => {
        // Arrange
        const templatePath = '/test/templates/existing-template.md';
        const newTemplateContent = '# Updated Template Content';
        const workspacePath = '/test/workspace';
        const targetPath = '/test/workspace/.kiro/steering/existing-template.md';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: newTemplateContent,
            [targetPath]: '# Old Template Content'
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(targetPath, newTemplateContent);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "existing-template.md" loaded successfully'
        );
      });
    });

    describe('error handling for missing template paths', () => {
      it('should show error message when template path is empty string', async () => {
        // Act
        await provider.loadTemplate('');

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is undefined', async () => {
        // Act
        await provider.loadTemplate(undefined as any);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is null', async () => {
        // Act
        await provider.loadTemplate(null as any);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is whitespace only', async () => {
        // Act
        await provider.loadTemplate('   ');

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('error handling for missing workspace folders', () => {
      it('should show error message when no workspace folders are open', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        mockVSCode.workspace.workspaceFolders = undefined;

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when workspace folders array is empty', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        mockVSCode.workspace.workspaceFolders = [];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when workspace folders is null', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        mockVSCode.workspace.workspaceFolders = null as any;

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(mockFs.readFileSync).not.toHaveBeenCalled();
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('error handling for file system errors', () => {
      it('should handle template file not found error', async () => {
        // Arrange
        const templatePath = '/test/templates/nonexistent.md';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering']
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation((path: string) => {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          `Failed to load template: Error: ENOENT: no such file or directory, open '${templatePath}'`
        );
        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should handle permission denied error when reading template', async () => {
        // Arrange
        const templatePath = '/test/templates/restricted.md';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering']
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('EACCES: permission denied, open \'/test/templates/restricted.md\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: EACCES: permission denied, open \'/test/templates/restricted.md\''
        );
      });

      it('should handle permission denied error when creating directory', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {
          throw new Error('EACCES: permission denied, mkdir \'/test/workspace/.kiro\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: EACCES: permission denied, mkdir \'/test/workspace/.kiro\''
        );
      });

      it('should handle permission denied error when writing template file', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('EACCES: permission denied, open \'/test/workspace/.kiro/steering/template.md\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: EACCES: permission denied, open \'/test/workspace/.kiro/steering/template.md\''
        );
      });

      it('should handle disk full error when writing template file', async () => {
        // Arrange
        const templatePath = '/test/templates/large-template.md';
        const templateContent = '# Large Template\n' + 'Content '.repeat(1000);
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('ENOSPC: no space left on device, write');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: ENOSPC: no space left on device, write'
        );
      });

      it('should handle generic file system errors', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('Unknown file system error');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: Unknown file system error'
        );
      });
    });

    describe('edge cases and invalid paths', () => {
      it('should handle template path with invalid characters', async () => {
        // Arrange
        const templatePath = '/test/templates/invalid<>|:*?"template.md';
        const workspacePath = '/test/workspace';

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('EINVAL: invalid name, open \'/test/templates/invalid<>|:*?"template.md\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: EINVAL: invalid name, open \'/test/templates/invalid<>|:*?"template.md\''
        );
      });

      it('should handle extremely long template paths', async () => {
        // Arrange
        const longPath = '/test/templates/' + 'very-long-template-name-'.repeat(20) + 'template.md';
        const workspacePath = '/test/workspace';

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('ENAMETOOLONG: name too long');
        });

        // Act
        await provider.loadTemplate(longPath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: ENAMETOOLONG: name too long'
        );
      });

      it('should handle template path that is a directory instead of file', async () => {
        // Arrange
        const templatePath = '/test/templates/directory-not-file';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', templatePath, workspacePath, '/test/workspace/.kiro/steering']
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('EISDIR: illegal operation on a directory, read');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: EISDIR: illegal operation on a directory, read'
        );
      });

      it('should handle workspace folder with invalid fsPath', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        const templateContent = '# Template Content';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates'],
          files: {
            [templatePath]: templateContent
          }
        });

        // Create workspace folder with invalid fsPath
        const invalidWorkspaceFolder = {
          uri: { fsPath: '' } as vscode.Uri,
          name: 'invalid-workspace',
          index: 0
        };
        mockVSCode.workspace.workspaceFolders = [invalidWorkspaceFolder];

        mockFs.mkdirSync.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory, mkdir');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: ENOENT: no such file or directory, mkdir'
        );
      });

      it('should handle template with very large content', async () => {
        // Arrange
        const templatePath = '/test/templates/huge-template.md';
        const largeContent = '# Huge Template\n' + 'Large content block\n'.repeat(10000);
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: largeContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/huge-template.md',
          largeContent
        );
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "huge-template.md" loaded successfully'
        );
      });
    });

    describe('user feedback verification', () => {
      it('should show success message with correct template name', async () => {
        // Arrange
        const templatePath = '/test/templates/my-awesome-template.md';
        const templateContent = '# Awesome Template';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "my-awesome-template.md" loaded successfully'
        );
        expect(mockVSCode.window.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should show error message with full error details', async () => {
        // Arrange
        const templatePath = '/test/templates/error-template.md';
        const workspacePath = '/test/workspace';
        const specificError = new Error('Specific file system error with details');

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering']
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        mockFs.readFileSync.mockImplementation(() => {
          throw specificError;
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: Specific file system error with details'
        );
        expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should not show any messages when both template path and workspace are invalid', async () => {
        // Act
        await provider.loadTemplate('');

        // Assert - should show error for missing template path first
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should handle multiple consecutive loadTemplate calls', async () => {
        // Arrange
        const templatePath1 = '/test/templates/template1.md';
        const templatePath2 = '/test/templates/template2.md';
        const templateContent1 = '# Template 1';
        const templateContent2 = '# Template 2';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [templatePath1]: templateContent1,
            [templatePath2]: templateContent2
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Act
        await provider.loadTemplate(templatePath1);
        await provider.loadTemplate(templatePath2);

        // Assert
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(2);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenNthCalledWith(1,
          'Template "template1.md" loaded successfully'
        );
        expect(mockVSCode.window.showInformationMessage).toHaveBeenNthCalledWith(2,
          'Template "template2.md" loaded successfully'
        );
        expect(mockVSCode.window.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should handle mixed success and error scenarios', async () => {
        // Arrange
        const successTemplatePath = '/test/templates/success.md';
        const errorTemplatePath = '/test/templates/error.md';
        const templateContent = '# Success Template';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering'],
          files: {
            [successTemplatePath]: templateContent
          }
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        mockVSCode.workspace.workspaceFolders = [workspaceFolder];

        // Mock readFileSync to succeed for first call, fail for second
        let callCount = 0;
        mockFs.readFileSync.mockImplementation((path: string) => {
          callCount++;
          if (callCount === 1) {
            return templateContent;
          } else {
            throw new Error('File not found');
          }
        });

        // Act
        await provider.loadTemplate(successTemplatePath);
        await provider.loadTemplate(errorTemplatePath);

        // Assert
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "success.md" loaded successfully'
        );
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to load template: Error: File not found'
        );
      });
    });
  });
});
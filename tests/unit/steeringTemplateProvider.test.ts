/**
 * Unit tests for SteeringTemplateProvider class
 * Tests constructor initialization, refresh method, getTreeItem, getChildren, and private getTemplateItems method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import { vscode, fsMock, pathMock, MockEventEmitter, TreeItemCollapsibleState, fileSystemMockUtils } from '../mocks/setup';
import { testHelpers } from '../utils/testHelpers';
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

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
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
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

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
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

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
      it('should return setup item when templatesPath is undefined', async () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue(undefined) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('Click to configure GitHub repository');
        expect(result[1].itemType).toBe('github-setup');
      });

      it('should return setup item when templatesPath is empty string', async () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('') };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('Click to configure GitHub repository');
        expect(result[1].itemType).toBe('github-setup');
      });

      it('should return setup item when templatesPath is null', async () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue(null) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('Click to configure GitHub repository');
        expect(result[1].itemType).toBe('github-setup');
      });
    });

    describe('when templates path does not exist', () => {
      it('should return error and setup items when path does not exist', async () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('/nonexistent/path') };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(false);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('Templates path not found');
        expect(result[1].itemType).toBe('error');
        expect(result[2].label).toBe('Click to set new path');
        expect(result[2].itemType).toBe('setup');
      });

      it('should handle different non-existent paths', async () => {
        // Arrange
        const paths = ['/does/not/exist', 'C:\\invalid\\path', '/tmp/missing'];
        
        for (const path of paths) {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(path) };
          vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
          fsMock.existsSync.mockReturnValue(false);

          // Act
          const result = await (provider as any).getTemplateItems();

          // Assert
          expect(result).toHaveLength(3);
          expect(result[0].itemType).toBe('info'); // Source indicator
          expect(result[1].itemType).toBe('error');
          expect(result[2].itemType).toBe('setup');
        }
      });
    });

    describe('when templates directory exists but is empty', () => {
      it('should return info items when no .md files found', async () => {
        // Arrange
        const templatesPath = '/test/empty';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue([]);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('No .md template files found');
        expect(result[1].itemType).toBe('info');
        expect(result[2].label).toBe('Path: /test/empty');
        expect(result[2].itemType).toBe('info');
      });

      it('should return info items when directory has non-markdown files', async () => {
        // Arrange
        const templatesPath = '/test/non-markdown';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['readme.txt', 'config.json', 'script.js']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('No .md template files found');
        expect(result[1].itemType).toBe('info');
        expect(result[2].label).toBe(`Path: ${templatesPath}`);
        expect(result[2].itemType).toBe('info');
      });
    });

    describe('when templates directory has valid templates', () => {
      it('should return template items for .md files', async () => {
        // Arrange
        const templatesPath = '/test/templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template1.md', 'template2.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result[1].label).toBe('template1');
        expect(result[1].itemType).toBe('template');
        expect(result[1].templatePath).toBe('/test/templates/template1.md');
        expect(result[2].label).toBe('template2');
        expect(result[2].itemType).toBe('template');
        expect(result[2].templatePath).toBe('/test/templates/template2.md');
      });

      it('should filter out non-markdown files', async () => {
        // Arrange
        const templatesPath = '/test/mixed';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template1.md', 'template2.md', 'readme.txt', 'config.json', 'template3.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(4);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result.slice(1).every(item => item.itemType === 'template')).toBe(true);
        expect(result.slice(1).map(item => item.label)).toEqual(['template1', 'template2', 'template3']);
      });

      it('should handle templates with different naming patterns', async () => {
        // Arrange
        const templatesPath = '/test/naming';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['simple.md', 'with-dashes.md', 'with_underscores.md', 'CamelCase.md', '123-numeric.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(6);
        expect(result[0].itemType).toBe('info'); // Source indicator
        expect(result.slice(1).map(item => item.label)).toEqual([
          'simple',
          'with-dashes',
          'with_underscores',
          'CamelCase',
          '123-numeric'
        ]);
      });

      it('should create correct template paths', async () => {
        // Arrange
        const templatesPath = '/custom/templates/path';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template1.md', 'template2.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3); // Source indicator + 2 templates
        expect(result[1].templatePath).toBe(`${templatesPath}/template1.md`);
        expect(result[2].templatePath).toBe(`${templatesPath}/template2.md`);
      });
    });

    describe('error handling', () => {
      it('should return error items when readdir throws exception', async () => {
        // Arrange
        const templatesPath = '/test/error';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3); // Source indicator + error + setup
        expect(result[1].label).toBe('Error reading templates directory');
        expect(result[1].itemType).toBe('error');
        expect(result[2].label).toBe('Click to set new path');
        expect(result[2].itemType).toBe('setup');
      });

      it('should handle different types of file system errors', async () => {
        // Arrange
        const templatesPath = '/test/error';
        const errors = [
          new Error('EACCES: permission denied'),
          new Error('ENOENT: no such file or directory'),
          new Error('EMFILE: too many open files'),
          new Error('Unknown error')
        ];

        for (const error of errors) {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
          vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
          fsMock.existsSync.mockReturnValue(true);
          fsMock.readdirSync.mockImplementation(() => {
            throw error;
          });

          // Act
          const result = await (provider as any).getTemplateItems();

          // Assert
          expect(result).toHaveLength(3); // Source indicator + error + setup
          expect(result[1].itemType).toBe('error');
          expect(result[2].itemType).toBe('setup');
        }
      });

      it('should handle null or undefined from readdirSync', async () => {
        // Arrange
        const templatesPath = '/test/null';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(null as any);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(3); // Source indicator + error + setup
        expect(result[1].itemType).toBe('error');
        expect(result[2].itemType).toBe('setup');
      });
    });

    describe('configuration integration', () => {
      it('should read configuration from correct section', async () => {
        // Arrange
        const mockConfig = { get: vi.fn().mockReturnValue('/test/path') };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(false);

        // Act
        await (provider as any).getTemplateItems();

        // Assert
        expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
        expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      });

      it('should handle configuration get method returning different types', async () => {
        // Arrange
        const testValues = [undefined, null, '', 'valid/path', 123, {}, []];
        
        for (const value of testValues) {
          vi.clearAllMocks();
          const mockConfig = { get: vi.fn().mockReturnValue(value) };
          vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
          fsMock.existsSync.mockReturnValue(false);

          // Act & Assert - should not throw
          await expect((provider as any).getTemplateItems()).resolves.toBeDefined();
        }
      });
    });

    describe('path handling', () => {
      it('should handle Windows-style paths', async () => {
        // Arrange
        const templatesPath = 'C:\\Users\\Test\\Templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2); // Source indicator + template
        expect(result[1].itemType).toBe('template');
      });

      it('should handle Unix-style paths', async () => {
        // Arrange
        const templatesPath = '/home/user/templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2); // Source indicator + template
        expect(result[1].itemType).toBe('template');
      });

      it('should handle relative paths', async () => {
        // Arrange
        const templatesPath = './templates';
        const mockConfig = { get: vi.fn().mockReturnValue(templatesPath) };
        vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readdirSync.mockReturnValue(['template.md']);

        // Act
        const result = await (provider as any).getTemplateItems();

        // Assert
        expect(result).toHaveLength(2); // Source indicator + template
        expect(result[1].itemType).toBe('template');
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.existsSync.mockReturnValue(false); // Directory doesn't exist initially
        fsMock.readFileSync.mockReturnValue(templateContent);
        fsMock.mkdirSync.mockReturnValue(undefined);
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.mkdirSync).toHaveBeenCalledWith(steeringDir, { recursive: true });
        expect(fsMock.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(targetPath, templateContent);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Template "template1.md" loaded successfully');
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock existsSync to return false for steering directory
        fsMock.existsSync.mockImplementation((path: string) => {
          const normalized = path.replace(/\\/g, '/');
          return !normalized.includes('.kiro/steering');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.mkdirSync).toHaveBeenCalledWith('/test/workspace/.kiro/steering', { recursive: true });
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.readFileSync.mockReturnValue(templateContent);
        
        // Mock FileSystemService.loadTemplate to return success
        const mockFileSystemService = (provider as any).fileSystemService;
        vi.spyOn(mockFileSystemService, 'loadTemplate').mockResolvedValue({
          success: true,
          filepath: '/test/workspace/.kiro/steering/template.md'
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
          templateContent,
          'template.md',
          workspacePath
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "template.md" loaded successfully'
        );
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return templateContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/complex-template.md',
          templateContent
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return templateContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/unicode-template.md',
          templateContent
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "unicode-template.md" loaded successfully'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return templateContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/empty-template.md',
          ''
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return newTemplateContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(targetPath, newTemplateContent);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "existing-template.md" loaded successfully'
        );
      });
    });

    describe('error handling for missing template paths', () => {
      it('should show error message when template path is empty string', async () => {
        // Act
        await provider.loadTemplate('');

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is undefined', async () => {
        // Act
        await provider.loadTemplate(undefined as any);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is null', async () => {
        // Act
        await provider.loadTemplate(null as any);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when template path is whitespace only', async () => {
        // Act
        await provider.loadTemplate('   ');

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('error handling for missing workspace folders', () => {
      it('should show error message when no workspace folders are open', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        vscode.workspace.workspaceFolders = undefined;

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when workspace folders array is empty', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        vscode.workspace.workspaceFolders = [];

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should show error message when workspace folders is null', async () => {
        // Arrange
        const templatePath = '/test/templates/template.md';
        vscode.workspace.workspaceFolders = null as any;

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
        expect(fsMock.readFileSync).not.toHaveBeenCalled();
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        fsMock.readFileSync.mockImplementation((path: string) => {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          `ENOENT: no such file or directory, open '${templatePath}'`,
          'Retry',
          'View Output'
        );
        expect(fsMock.writeFileSync).not.toHaveBeenCalled();
      });

      it('should handle permission denied error when reading template', async () => {
        // Arrange
        const templatePath = '/test/templates/restricted.md';
        const workspacePath = '/test/workspace';

        fileSystemMockUtils.setupFileSystem({
          directories: ['/test/templates', workspacePath, '/test/workspace/.kiro/steering']
        });

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        vscode.workspace.workspaceFolders = [workspaceFolder];

        fsMock.readFileSync.mockImplementation(() => {
          throw new Error('EACCES: permission denied, open \'/test/templates/restricted.md\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'EACCES: permission denied, open \'/test/templates/restricted.md\'',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.readFileSync.mockReturnValue(templateContent);
        
        // Mock FileSystemService.loadTemplate to return failure
        const mockFileSystemService = (provider as any).fileSystemService;
        vi.spyOn(mockFileSystemService, 'loadTemplate').mockResolvedValue({
          success: false,
          error: 'EACCES: permission denied, mkdir \'/test/workspace/.kiro\''
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
          templateContent,
          'template.md',
          workspacePath
        );
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'EACCES: permission denied, mkdir \'/test/workspace/.kiro\'',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.readFileSync.mockReturnValue(templateContent);
        
        // Mock FileSystemService.loadTemplate to return failure
        const mockFileSystemService = (provider as any).fileSystemService;
        vi.spyOn(mockFileSystemService, 'loadTemplate').mockResolvedValue({
          success: false,
          error: 'Permission denied writing template file'
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
          templateContent,
          'template.md',
          workspacePath
        );
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Permission denied writing template file',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.readFileSync.mockReturnValue(templateContent);
        
        // Mock FileSystemService.loadTemplate to return failure
        const mockFileSystemService = (provider as any).fileSystemService;
        vi.spyOn(mockFileSystemService, 'loadTemplate').mockResolvedValue({
          success: false,
          error: 'Disk full'
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
          templateContent,
          'large-template.md',
          workspacePath
        );
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Disk full',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations - directory exists, read fails
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation(() => {
          throw new Error('Unknown file system error');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Unknown file system error',
          'Retry',
          'View Output'
        );
      });
    });

    describe('edge cases and invalid paths', () => {
      it('should handle template path with invalid characters', async () => {
        // Arrange
        const templatePath = '/test/templates/invalid<>|:*?"template.md';
        const workspacePath = '/test/workspace';

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations - directory exists, read fails with invalid name
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation(() => {
          throw new Error('EINVAL: invalid name, open \'/test/templates/invalid<>|:*?"template.md\'');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'EINVAL: invalid name, open \'/test/templates/invalid<>|:*?"template.md\'',
          'Retry',
          'View Output'
        );
      });

      it('should handle extremely long template paths', async () => {
        // Arrange
        const longPath = '/test/templates/' + 'very-long-template-name-'.repeat(20) + 'template.md';
        const workspacePath = '/test/workspace';

        const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', workspacePath);
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations - directory exists, read fails with name too long
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation(() => {
          throw new Error('ENAMETOOLONG: name too long');
        });

        // Act
        await provider.loadTemplate(longPath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'ENAMETOOLONG: name too long',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations - directory exists, read fails because it's a directory
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation(() => {
          throw new Error('EISDIR: illegal operation on a directory, read');
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'EISDIR: illegal operation on a directory, read',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [invalidWorkspaceFolder];

        // Mock file system operations
        fsMock.readFileSync.mockReturnValue(templateContent);
        
        // Mock FileSystemService.loadTemplate to return failure
        const mockFileSystemService = (provider as any).fileSystemService;
        vi.spyOn(mockFileSystemService, 'loadTemplate').mockResolvedValue({
          success: false,
          error: 'ENOENT: no such file or directory, mkdir'
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
          templateContent,
          'template.md',
          ''
        );
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'ENOENT: no such file or directory, mkdir',
          'Retry',
          'View Output'
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return largeContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(
          '/test/workspace/.kiro/steering/huge-template.md',
          largeContent
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath) return templateContent;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "my-awesome-template.md" loaded successfully'
        );
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations - directory exists, read fails
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation(() => {
          throw specificError;
        });

        // Act
        await provider.loadTemplate(templatePath);

        // Assert
        expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Specific file system error with details',
          'Retry',
          'View Output'
        );
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should not show any messages when both template path and workspace are invalid', async () => {
        // Act
        await provider.loadTemplate('');

        // Assert - should show error for missing template path first
        expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations with specific content
        fsMock.existsSync.mockReturnValue(true);
        fsMock.readFileSync.mockImplementation((path: string) => {
          if (path === templatePath1) return templateContent1;
          if (path === templatePath2) return templateContent2;
          return '';
        });
        fsMock.writeFileSync.mockReturnValue(undefined);

        // Act
        await provider.loadTemplate(templatePath1);
        await provider.loadTemplate(templatePath2);

        // Assert
        expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2);
        expect(vscode.window.showInformationMessage).toHaveBeenNthCalledWith(1,
          'Template "template1.md" loaded successfully'
        );
        expect(vscode.window.showInformationMessage).toHaveBeenNthCalledWith(2,
          'Template "template2.md" loaded successfully'
        );
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
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
        vscode.workspace.workspaceFolders = [workspaceFolder];

        // Mock file system operations
        fsMock.existsSync.mockReturnValue(true);
        fsMock.writeFileSync.mockReturnValue(undefined);
        
        // Mock readFileSync to succeed for first call, fail for second
        let callCount = 0;
        fsMock.readFileSync.mockImplementation((path: string) => {
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
        expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Template "success.md" loaded successfully'
        );
        expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'File not found',
          'Retry',
          'View Output'
        );
      });
    });
  });
});
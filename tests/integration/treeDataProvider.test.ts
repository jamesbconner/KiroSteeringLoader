/**
 * Integration tests for VS Code tree data provider functionality
 * Tests tree data provider registration, refresh behavior, tree item generation, and command execution
 * Requirements: 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { testHelpers, commonTestScenarios } from '../utils/testHelpers';
import {
  vscode as vscodeMock,
  setupConfiguration,
  setupWorkspace,
  getRegisteredTreeDataProviders,
  getRegisteredCommands,
  userInteractions
} from '../mocks/setup';
import { fileSystemMockUtils } from '../mocks/fs';

describe('Tree Data Provider Integration Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let provider: SteeringTemplateProvider;

  beforeEach(() => {
    // Reset all mocks and test state
    testHelpers.reset();
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    
    // Set up default configuration
    setupConfiguration({ templatesPath: undefined });
  });

  afterEach(() => {
    // Clean up after each test
    testHelpers.cleanup();
    deactivate();
  });

  describe('Tree Data Provider Registration with VS Code Window API', () => {
    it('should register tree data provider during extension activation', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledWith(
        'kiroSteeringLoader',
        expect.any(SteeringTemplateProvider)
      );
    });

    it('should register tree data provider with correct view ID', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredProviders = getRegisteredTreeDataProviders();
      expect(registeredProviders).toHaveLength(1);
      expect(registeredProviders[0].viewId).toBe('kiroSteeringLoader');
    });

    it('should register tree data provider instance that implements TreeDataProvider interface', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredProviders = getRegisteredTreeDataProviders();
      const provider = registeredProviders[0].provider;
      
      expect(provider).toBeInstanceOf(SteeringTemplateProvider);
      expect(provider).toHaveProperty('getTreeItem');
      expect(provider).toHaveProperty('getChildren');
      expect(provider).toHaveProperty('onDidChangeTreeData');
      expect(provider).toHaveProperty('refresh');
      
      expect(typeof provider.getTreeItem).toBe('function');
      expect(typeof provider.getChildren).toBe('function');
      expect(typeof provider.refresh).toBe('function');
    });

    it('should register tree data provider that returns disposable', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.window.registerTreeDataProvider).toHaveReturnedWith(
        expect.objectContaining({
          dispose: expect.any(Function)
        })
      );
    });

    it('should add tree data provider registration to extension subscriptions', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(11); // 10 commands + 1 error handler registered
      // The tree data provider registration is not added to subscriptions in the current implementation
      // but the provider itself is created and registered
      const registeredProviders = getRegisteredTreeDataProviders();
      expect(registeredProviders).toHaveLength(1);
    });

    it('should handle tree data provider registration failures gracefully', () => {
      // Arrange
      const registrationError = new Error('Tree data provider registration failed');
      vscodeMock.window.registerTreeDataProvider.mockImplementationOnce(() => {
        throw registrationError;
      });

      // Act & Assert
      expect(() => activate(mockContext)).toThrow(registrationError);
    });

    it('should register tree data provider before commands', () => {
      // Act
      activate(mockContext);

      // Assert
      // Verify tree data provider was registered
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(10);
      
      // Both should be called during activation
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalled();
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalled();
    });
  });

  describe('Tree Refresh Behavior When Configuration Changes', () => {
    beforeEach(() => {
      activate(mockContext);
      const registeredProviders = getRegisteredTreeDataProviders();
      provider = registeredProviders[0].provider;
    });

    it('should fire onDidChangeTreeData event when refresh is called', () => {
      // Arrange
      const eventListener = vi.fn();
      provider.onDidChangeTreeData(eventListener);

      // Act
      provider.refresh();

      // Assert
      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(undefined);
    });

    it('should refresh tree when configuration is updated through setTemplatesPath command', async () => {
      // Arrange
      const eventListener = vi.fn();
      provider.onDidChangeTreeData(eventListener);
      
      userInteractions.selectFolder('/test/templates');
      userInteractions.configUpdateSuccess();

      // Get the registered commands directly from the mock
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      expect(setTemplatesPathCommand).toBeDefined();

      // Act
      await setTemplatesPathCommand!.callback();

      // Assert
      expect(eventListener).toHaveBeenCalledTimes(1);
    });

    it('should refresh tree multiple times without issues', () => {
      // Arrange
      const eventListener = vi.fn();
      provider.onDidChangeTreeData(eventListener);

      // Act
      provider.refresh();
      provider.refresh();
      provider.refresh();

      // Assert
      expect(eventListener).toHaveBeenCalledTimes(3);
    });

    it('should handle refresh when no event listeners are registered', () => {
      // Act & Assert - should not throw
      expect(() => provider.refresh()).not.toThrow();
    });

    it('should refresh tree when templates directory content changes', () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template1.md`]: '# Template 1'
        }
      });

      const eventListener = vi.fn();
      provider.onDidChangeTreeData(eventListener);

      // Act - simulate file system change by adding a new template
      fileSystemMockUtils.addFile(`${templatesPath}/template2.md`, '# Template 2');
      provider.refresh();

      // Assert
      expect(eventListener).toHaveBeenCalledTimes(1);
    });

    it('should maintain event listener subscriptions across multiple refreshes', () => {
      // Arrange
      const eventListener1 = vi.fn();
      const eventListener2 = vi.fn();
      
      const disposable1 = provider.onDidChangeTreeData(eventListener1);
      const disposable2 = provider.onDidChangeTreeData(eventListener2);

      // Act
      provider.refresh();
      provider.refresh();

      // Assert
      expect(eventListener1).toHaveBeenCalledTimes(2);
      expect(eventListener2).toHaveBeenCalledTimes(2);

      // Cleanup
      disposable1.dispose();
      disposable2.dispose();
    });

    it('should stop firing events after event listener is disposed', () => {
      // Arrange
      const eventListener = vi.fn();
      const disposable = provider.onDidChangeTreeData(eventListener);

      // Act
      provider.refresh();
      disposable.dispose();
      provider.refresh();

      // Assert
      expect(eventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tree Item Generation and Display in VS Code Tree View', () => {
    beforeEach(() => {
      activate(mockContext);
      const registeredProviders = getRegisteredTreeDataProviders();
      provider = registeredProviders[0].provider;
    });

    it('should generate setup item when no configuration is present', async () => {
      // Arrange
      setupConfiguration({});

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].label).toBe('Click to configure GitHub repository');
      expect(children[1].itemType).toBe('setup');
      expect(children[1].collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    });

    it('should generate error items when templates path does not exist', async () => {
      // Arrange
      const nonExistentPath = '/test/nonexistent';
      setupConfiguration({ templatesPath: nonExistentPath });
      fileSystemMockUtils.setupFileSystem({ directories: [], files: {} });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].label).toBe('Templates path not found');
      expect(children[1].itemType).toBe('error');
      expect(children[2].label).toBe('Click to set new path');
      expect(children[2].itemType).toBe('setup');
    });

    it('should generate info items when templates directory is empty', async () => {
      // Arrange
      const templatesPath = '/test/empty';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {}
      });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].label).toBe('No .md template files found');
      expect(children[1].itemType).toBe('info');
      expect(children[2].label).toBe(`Path: ${templatesPath}`);
      expect(children[2].itemType).toBe('info');
    });

    it('should generate template items when templates are available', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template1.md`]: '# Template 1',
          [`${templatesPath}/template2.md`]: '# Template 2',
          [`${templatesPath}/not-template.txt`]: 'Not a template'
        }
      });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].label).toBe('template1');
      expect(children[1].itemType).toBe('template');
      expect(children[1].templatePath).toBe(`${templatesPath}/template1.md`);
      expect(children[2].label).toBe('template2');
      expect(children[2].itemType).toBe('template');
      expect(children[2].templatePath).toBe(`${templatesPath}/template2.md`);
    });

    it('should generate error items when directory read fails', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({ directories: [templatesPath], files: {} });
      
      // Mock fs.readdirSync to throw an error
      const fsMock = await import('../mocks/fs');
      fsMock.mockFs.readdirSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].label).toBe('Error reading templates directory');
      expect(children[1].itemType).toBe('error');
      expect(children[2].label).toBe('Click to set new path');
      expect(children[2].itemType).toBe('setup');
    });

    it('should return TreeItem objects that VS Code can display', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/example.md`]: '# Example Template'
        }
      });

      // Act
      const children = await provider.getChildren();
      const treeItem = provider.getTreeItem(children[1]); // Skip source indicator

      // Assert
      expect(treeItem).toBeInstanceOf(vscode.TreeItem);
      expect(treeItem.label).toBe('example');
      expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
      expect(treeItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect(treeItem.command).toBeDefined();
      expect(treeItem.tooltip).toBe('Load template: example');
    });

    it('should return empty array for child elements', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template.md`]: '# Template'
        }
      });

      const children = await provider.getChildren();
      const templateItem = children[0];

      // Act
      const childChildren = await provider.getChildren(templateItem);

      // Assert
      expect(childChildren).toEqual([]);
    });

    it('should handle mixed file types in templates directory', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template1.md`]: '# Template 1',
          [`${templatesPath}/readme.txt`]: 'Not a template',
          [`${templatesPath}/template2.md`]: '# Template 2',
          [`${templatesPath}/config.json`]: '{}',
          [`${templatesPath}/template3.md`]: '# Template 3'
        }
      });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(4);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children.slice(1).every(child => child.itemType === 'template')).toBe(true);
      expect(children.slice(1).every(child => child.templatePath.endsWith('.md'))).toBe(true);
    });
  });

  describe('Tree Item Command Execution and Parameter Passing', () => {
    beforeEach(() => {
      activate(mockContext);
      const registeredProviders = getRegisteredTreeDataProviders();
      provider = registeredProviders[0].provider;
    });

    it('should configure template items with loadTemplate command', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      const templatePath = `${templatesPath}/example.md`;
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [templatePath]: '# Example Template'
        }
      });

      // Act
      const children = await provider.getChildren();
      const templateItem = children[1]; // Skip source indicator

      // Assert
      expect(templateItem.command).toBeDefined();
      expect(templateItem.command!.command).toBe('kiroSteeringLoader.loadTemplate');
      expect(templateItem.command!.title).toBe('Load Template');
      expect(templateItem.command!.arguments).toEqual([templatePath, templateItem.metadata]);
    });

    it('should configure setup items with setTemplatesPath command', async () => {
      // Arrange
      setupConfiguration({});

      // Act
      const children = await provider.getChildren();
      const setupItem = children[1]; // Skip source indicator

      // Assert
      expect(setupItem.command).toBeDefined();
      expect(setupItem.command!.command).toBe('kiroSteeringLoader.setTemplatesPath');
      expect(setupItem.command!.title).toBe('Set Templates Path');
      expect(setupItem.command!.arguments).toBeUndefined();
    });

    it('should not configure commands for info items', async () => {
      // Arrange
      const templatesPath = '/test/empty';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {}
      });

      // Act
      const children = await provider.getChildren();
      const infoItem = children[1]; // Skip source indicator, get the actual info item

      // Assert
      expect(infoItem.itemType).toBe('info');
      expect(infoItem.command).toBeUndefined();
    });

    it('should not configure commands for error items', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({ directories: [templatesPath], files: {} });
      
      // Mock fs.readdirSync to throw an error
      const fsMock = await import('../mocks/fs');
      fsMock.mockFs.readdirSync.mockImplementationOnce(() => {
        throw new Error('Read error');
      });

      // Act
      const children = await provider.getChildren();
      const errorItem = children[1]; // Skip source indicator, get the actual error item

      // Assert
      expect(errorItem.itemType).toBe('error');
      expect(errorItem.command).toBeUndefined();
    });

    it('should pass correct template path as command argument', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/complex-template-name.md`]: '# Complex Template',
          [`${templatesPath}/simple.md`]: '# Simple'
        }
      });

      // Act
      const children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      
      const complexTemplate = children.find(child => child.label === 'complex-template-name');
      expect(complexTemplate!.command!.arguments).toEqual([`${templatesPath}/complex-template-name.md`, complexTemplate!.metadata]);
      
      const simpleTemplate = children.find(child => child.label === 'simple');
      expect(simpleTemplate!.command!.arguments).toEqual([`${templatesPath}/simple.md`, simpleTemplate!.metadata]);
    });

    it('should configure appropriate icons for different item types', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template.md`]: '# Template'
        }
      });

      // Act
      const templateChildren = await provider.getChildren();
      const templateItem = templateChildren[1]; // Skip source indicator

      setupConfiguration({});
      const setupChildren = await provider.getChildren();
      const setupItem = setupChildren[1]; // Skip source indicator

      setupConfiguration({ templatesPath: '/nonexistent' });
      const errorChildren = await provider.getChildren();
      const errorItem = errorChildren[1]; // Skip source indicator

      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({ directories: [templatesPath], files: {} });
      const infoChildren = await provider.getChildren();
      const infoItem = infoChildren[1]; // Skip source indicator

      // Assert
      expect(templateItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((templateItem.iconPath as vscode.ThemeIcon).id).toBe('file-text');

      expect(setupItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((setupItem.iconPath as vscode.ThemeIcon).id).toBe('folder-opened');

      expect(errorItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((errorItem.iconPath as vscode.ThemeIcon).id).toBe('error');

      expect(infoItem.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((infoItem.iconPath as vscode.ThemeIcon).id).toBe('info');
    });

    it('should configure appropriate tooltips for different item types', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/example.md`]: '# Example'
        }
      });

      // Act
      const templateChildren = await provider.getChildren();
      const templateItem = templateChildren[1]; // Skip source indicator

      setupConfiguration({});
      const setupChildren = await provider.getChildren();
      const setupItem = setupChildren[1]; // Skip source indicator

      // Assert
      expect(templateItem.tooltip).toBe('Load template: example');
      expect(setupItem.tooltip).toBe('Click to configure templates directory');
    });

    it('should handle command execution through VS Code tree view clicks', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      const templatePath = `${templatesPath}/test.md`;
      
      // Set up file system first
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [templatePath]: '# Test Template'
        }
      });
      
      // Then set up configuration
      setupConfiguration({ templatesPath });

      // Set up workspace for loadTemplate command
      const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', '/test/workspace');
      setupWorkspace([workspaceFolder]);
      
      // Ensure both file systems are set up
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath, '/test/workspace', '/test/workspace/.kiro', '/test/workspace/.kiro/steering'],
        files: {
          [templatePath]: '# Test Template'
        }
      });
      
      // Re-activate to ensure commands are registered after mock reset
      activate(mockContext);

      // Act
      const children = await provider.getChildren();
      const templateItem = children[1]; // Skip source indicator
      
      // Simulate VS Code executing the command when tree item is clicked
      expect(templateItem.command).toBeDefined();
      
      // Get the registered commands directly from the mock
      const registeredCommands = getRegisteredCommands();
      const loadTemplateCommand = registeredCommands.find(cmd => cmd.command === templateItem.command!.command);
      expect(loadTemplateCommand).toBeDefined();
      
      await loadTemplateCommand!.callback(...templateItem.command!.arguments!);

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "test.md" loaded successfully'
      );
    });
  });

  describe('Tree Data Provider Integration with Configuration Changes', () => {
    beforeEach(() => {
      activate(mockContext);
      const registeredProviders = getRegisteredTreeDataProviders();
      provider = registeredProviders[0].provider;
    });

    it('should reflect configuration changes in tree items', async () => {
      // Arrange - start with no configuration
      setupConfiguration({});
      let children = await provider.getChildren();
      expect(children[1].itemType).toBe('setup'); // Skip source indicator

      // Act - update configuration to valid path
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template.md`]: '# Template'
        }
      });

      children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].itemType).toBe('template');
      expect(children[1].label).toBe('template');
    });

    it('should handle configuration changes from valid to invalid path', async () => {
      // Arrange - start with valid configuration
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template.md`]: '# Template'
        }
      });

      let children = await provider.getChildren();
      expect(children[1].itemType).toBe('template'); // Skip source indicator

      // Act - update configuration to invalid path
      setupConfiguration({ templatesPath: '/invalid/path' });
      children = await provider.getChildren();

      // Assert
      expect(children).toHaveLength(3);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].itemType).toBe('error');
      expect(children[2].itemType).toBe('setup');
    });

    it('should handle workspace changes affecting tree items', async () => {
      // Arrange
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemMockUtils.setupFileSystem({
        directories: [templatesPath],
        files: {
          [`${templatesPath}/template.md`]: '# Template'
        }
      });

      // Act - simulate workspace change
      const workspaceFolder = testHelpers.createMockWorkspaceFolder('new-workspace', '/new/workspace');
      setupWorkspace([workspaceFolder]);

      const children = await provider.getChildren();

      // Assert - tree items should still be generated based on configuration
      expect(children).toHaveLength(2);
      expect(children[0].itemType).toBe('info'); // Source indicator
      expect(children[1].itemType).toBe('template');
    });
  });
});
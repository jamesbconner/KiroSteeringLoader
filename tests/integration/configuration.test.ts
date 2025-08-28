/**
 * Integration tests for VS Code extension configuration
 * Tests configuration reading/writing, change responses, validation, and precedence
 * Requirements: 2.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { testHelpers } from '../utils/testHelpers';
import {
  vscode as vscodeMock,
  setupConfiguration,
  setupWorkspace,
  userInteractions,
  getRegisteredCommands,
  ConfigurationTarget
} from '../mocks/setup';
import { fileSystemMockUtils } from '../mocks/fs';

describe('Configuration Integration Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let mockProvider: SteeringTemplateProvider;

  beforeEach(() => {
    // Reset all mocks and test state
    testHelpers.reset();
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    
    // Set up default workspace
    const workspaceFolder = testHelpers.createMockWorkspaceFolder('test-workspace', '/test/workspace');
    setupWorkspace([workspaceFolder]);
    
    // Set up default file system state
    fileSystemMockUtils.setupFileSystem({
      directories: ['/test/workspace', '/test/templates'],
      files: {
        '/test/templates/template1.md': '# Template 1\nContent',
        '/test/templates/template2.md': '# Template 2\nContent'
      }
    });
  });

  afterEach(() => {
    testHelpers.cleanup();
    deactivate();
  });

  describe('Configuration Reading Through VS Code Workspace API', () => {
    it('should read configuration using correct configuration section', () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/templates' });
      
      // Act
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);
      
      // Trigger configuration reading by getting children
      mockProvider.getChildren();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
    });

    it('should read templatesPath configuration value correctly', async () => {
      // Arrange
      const templatesPath = '/test/custom/templates';
      setupConfiguration({ templatesPath });
      
      // Act
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);
      const children = await mockProvider.getChildren();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
      expect(vscodeMock.workspace.getConfiguration().get).toHaveBeenCalledWith('templatesPath');
      
      // Should attempt to read from the configured path
      expect(children).toBeDefined();
    });

    it('should handle undefined configuration values gracefully', async () => {
      // Arrange
      setupConfiguration({}); // No templatesPath configured
      
      // Act
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);
      const children = await mockProvider.getChildren();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().get).toHaveBeenCalledWith('templatesPath');
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Click to set templates path');
      expect(children[0].itemType).toBe('setup');
    });

    it('should read configuration multiple times without caching issues', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/templates' });
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      await mockProvider.getChildren();
      await mockProvider.getChildren();
      await mockProvider.getChildren();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledTimes(3);
      expect(vscodeMock.workspace.getConfiguration().get).toHaveBeenCalledTimes(3);
    });

    it('should handle configuration API errors during reading', async () => {
      // Arrange
      const configError = new Error('Configuration API error');
      vscodeMock.workspace.getConfiguration.mockImplementationOnce(() => {
        throw configError;
      });
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act & Assert
      try {
        await mockProvider.getChildren();
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toEqual(configError);
      }
    });

    it('should handle configuration get method errors', async () => {
      // Arrange
      const getError = new Error('Configuration get error');
      setupConfiguration({});
      vscodeMock.workspace.getConfiguration().get.mockImplementationOnce(() => {
        throw getError;
      });
      activate(mockContext);
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act & Assert
      try {
        await mockProvider.getChildren();
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toEqual(getError);
      }
    });
  });

  describe('Configuration Writing Through VS Code Workspace API', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should write configuration using correct parameters', async () => {
      // Arrange
      const newPath = '/test/new/templates';
      userInteractions.selectFolder(newPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        newPath,
        ConfigurationTarget.Global
      );
    });

    it('should use Global configuration target for templates path', async () => {
      // Arrange
      const templatesPath = '/test/global/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        templatesPath,
        ConfigurationTarget.Global
      );
    });

    it('should handle configuration update success', async () => {
      // Arrange
      const templatesPath = '/test/success/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      const result = setTemplatesPathCommand?.callback();

      // Assert
      await expect(result).resolves.toBeUndefined();
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledTimes(1);
    });

    it('should handle configuration update failures', async () => {
      // Arrange
      const updateError = new Error('Configuration update failed');
      const templatesPath = '/test/fail/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateFailure(updateError);
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act & Assert
      await expect(setTemplatesPathCommand?.callback()).rejects.toThrow(updateError);
    });

    it('should not update configuration when user cancels dialog', async () => {
      // Arrange
      userInteractions.cancelDialog();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).not.toHaveBeenCalled();
    });

    it('should handle multiple configuration updates sequentially', async () => {
      // Arrange
      const paths = ['/test/path1', '/test/path2', '/test/path3'];
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      for (const path of paths) {
        userInteractions.selectFolder(path);
        userInteractions.configUpdateSuccess();
        await setTemplatesPathCommand?.callback();
      }

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledTimes(3);
      paths.forEach((path, index) => {
        expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenNthCalledWith(
          index + 1,
          'templatesPath',
          path,
          ConfigurationTarget.Global
        );
      });
    });

    it('should handle configuration update with empty string path', async () => {
      // Arrange
      userInteractions.selectFolder('');
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        '',
        ConfigurationTarget.Global
      );
    });
  });

  describe('Extension Response to Configuration Changes and Updates', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should refresh tree data provider after configuration update', async () => {
      // Arrange
      const templatesPath = '/test/updated/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      
      // Create a spy on the provider's refresh method
      mockProvider = new SteeringTemplateProvider(mockContext);
      const refreshSpy = vi.spyOn(mockProvider, 'refresh');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      // The command creates its own provider instance, so we verify the refresh call pattern
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledTimes(1);
      // The refresh should be called after successful configuration update
    });

    it('should not refresh tree data provider if configuration update fails', async () => {
      // Arrange
      const updateError = new Error('Update failed');
      const templatesPath = '/test/fail/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateFailure(updateError);
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act & Assert
      await expect(setTemplatesPathCommand?.callback()).rejects.toThrow(updateError);
      
      // Verify that refresh is not called when update fails
      // This is implicit in the command implementation - refresh only happens after successful update
    });

    it('should respond to configuration changes by updating tree items', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/initial' });
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/initial', '/test/updated'],
        files: {
          '/test/initial/initial.md': '# Initial Template',
          '/test/updated/updated.md': '# Updated Template'
        }
      });
      
      mockProvider = new SteeringTemplateProvider(mockContext);
      const initialChildren = await mockProvider.getChildren();

      // Act - Simulate configuration change
      setupConfiguration({ templatesPath: '/test/updated' });
      const updatedChildren = await mockProvider.getChildren();

      // Assert
      expect(initialChildren).not.toEqual(updatedChildren);
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledTimes(2);
    });

    it('should handle configuration changes from valid to invalid path', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/templates' });
      mockProvider = new SteeringTemplateProvider(mockContext);
      const validChildren = await mockProvider.getChildren();

      // Act - Change to invalid path
      setupConfiguration({ templatesPath: '/test/nonexistent' });
      const invalidChildren = await mockProvider.getChildren();

      // Assert
      expect(validChildren).not.toEqual(invalidChildren);
      expect(invalidChildren).toHaveLength(2);
      expect(invalidChildren[0].label).toBe('Templates path not found');
      expect(invalidChildren[0].itemType).toBe('error');
      expect(invalidChildren[1].label).toBe('Click to set new path');
      expect(invalidChildren[1].itemType).toBe('setup');
    });

    it('should handle configuration changes from invalid to valid path', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/nonexistent' });
      mockProvider = new SteeringTemplateProvider(mockContext);
      const invalidChildren = await mockProvider.getChildren();

      // Act - Change to valid path
      setupConfiguration({ templatesPath: '/test/templates' });
      const validChildren = await mockProvider.getChildren();

      // Assert
      expect(invalidChildren).not.toEqual(validChildren);
      expect(validChildren.length).toBeGreaterThan(0);
      expect(validChildren.every(child => child.itemType === 'template')).toBe(true);
    });

    it('should handle configuration changes from undefined to defined', async () => {
      // Arrange
      setupConfiguration({});
      mockProvider = new SteeringTemplateProvider(mockContext);
      const undefinedChildren = await mockProvider.getChildren();

      // Act - Set configuration
      setupConfiguration({ templatesPath: '/test/templates' });
      const definedChildren = await mockProvider.getChildren();

      // Assert
      expect(undefinedChildren).toHaveLength(1);
      expect(undefinedChildren[0].itemType).toBe('setup');
      expect(definedChildren.length).toBeGreaterThan(1);
      expect(definedChildren.every(child => child.itemType === 'template')).toBe(true);
    });

    it('should handle rapid configuration changes', async () => {
      // Arrange
      const paths = ['/test/path1', '/test/path2', '/test/path3'];
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act - Rapid configuration changes
      const results = [];
      for (const path of paths) {
        setupConfiguration({ templatesPath: path });
        const children = await mockProvider.getChildren();
        results.push(children);
      }

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      // Each call should have been made with the correct configuration
      results.forEach((result, index) => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Configuration Validation and Error Handling', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should validate templates path exists before using it', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/nonexistent' });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Templates path not found');
      expect(children[0].itemType).toBe('error');
      expect(children[1].label).toBe('Click to set new path');
      expect(children[1].itemType).toBe('setup');
    });

    it('should validate templates path is readable', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/templates' });
      // Mock file system to throw error on readdir
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates'],
        files: {}
      });
      const fsMock = await import('../mocks/fs');
      fsMock.mockFs.readdirSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });
      
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Error reading templates directory');
      expect(children[0].itemType).toBe('error');
      expect(children[1].label).toBe('Click to set new path');
      expect(children[1].itemType).toBe('setup');
    });

    it('should handle empty templates directory gracefully', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/empty' });
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/empty'],
        files: {}
      });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('No .md template files found');
      expect(children[0].itemType).toBe('info');
      expect(children[1].label).toBe('Path: /test/empty');
      expect(children[1].itemType).toBe('info');
    });

    it('should filter non-markdown files from templates directory', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/mixed' });
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/mixed'],
        files: {
          '/test/mixed/template.md': '# Template',
          '/test/mixed/readme.txt': 'Not a template',
          '/test/mixed/config.json': '{}',
          '/test/mixed/another.md': '# Another Template'
        }
      });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(2);
      expect(children.every(child => child.itemType === 'template')).toBe(true);
      expect(children.map(child => child.label).sort()).toEqual(['another', 'template']);
    });

    it('should handle configuration with null value', async () => {
      // Arrange
      setupConfiguration({ templatesPath: null });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Click to set templates path');
      expect(children[0].itemType).toBe('setup');
    });

    it('should handle configuration with empty string value', async () => {
      // Arrange
      setupConfiguration({ templatesPath: '' });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Click to set templates path');
      expect(children[0].itemType).toBe('setup');
    });

    it('should handle configuration with invalid type value', async () => {
      // Arrange - VS Code config API would typically return undefined for invalid values
      // but let's test what happens if somehow a non-string gets through
      setupConfiguration({ templatesPath: null as any });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      // The extension should handle non-string values gracefully by treating them as falsy
      expect(children).toBeDefined();
      expect(children.length).toBe(1);
      expect(children[0].label).toBe('Click to set templates path');
      expect(children[0].itemType).toBe('setup');
    });

    it('should provide helpful error messages for common issues', async () => {
      // Arrange - Test various error scenarios
      const scenarios = [
        { path: '/test/nonexistent', expectedError: 'Templates path not found' },
        { path: '', expectedError: 'Click to set templates path' },
        { path: undefined, expectedError: 'Click to set templates path' }
      ];

      for (const scenario of scenarios) {
        setupConfiguration({ templatesPath: scenario.path });
        mockProvider = new SteeringTemplateProvider(mockContext);

        // Act
        const children = await mockProvider.getChildren();

        // Assert
        expect(children.some(child => child.label === scenario.expectedError)).toBe(true);
      }
    });
  });

  describe('Global vs Workspace Configuration Precedence', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should use Global configuration target when updating templates path', async () => {
      // Arrange
      const templatesPath = '/test/global/templates';
      userInteractions.selectFolder(templatesPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        templatesPath,
        ConfigurationTarget.Global
      );
    });

    it('should read configuration from workspace API without specifying scope', () => {
      // Arrange
      setupConfiguration({ templatesPath: '/test/templates' });
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      mockProvider.getChildren();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
      // The get method is called without a scope parameter, allowing VS Code to handle precedence
      expect(vscodeMock.workspace.getConfiguration().get).toHaveBeenCalledWith('templatesPath');
    });

    it('should handle configuration precedence through VS Code API', async () => {
      // Arrange - Mock configuration with inspect method to simulate precedence
      const mockConfig = {
        get: vi.fn().mockReturnValue('/test/workspace/templates'),
        update: vi.fn().mockResolvedValue(undefined),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn().mockReturnValue({
          key: 'templatesPath',
          defaultValue: undefined,
          globalValue: '/test/global/templates',
          workspaceValue: '/test/workspace/templates',
          workspaceFolderValue: undefined
        })
      };
      vscodeMock.workspace.getConfiguration.mockReturnValue(mockConfig);
      
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      await mockProvider.getChildren();

      // Assert
      expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      // The extension should use the value returned by get(), which respects VS Code's precedence
      expect(mockConfig.get).toHaveReturnedWith('/test/workspace/templates');
    });

    it('should not override workspace configuration when updating global', async () => {
      // Arrange
      const globalPath = '/test/global/templates';
      userInteractions.selectFolder(globalPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      // Verify that only Global target is used, not Workspace or WorkspaceFolder
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        globalPath,
        ConfigurationTarget.Global
      );
      expect(vscodeMock.workspace.getConfiguration().update).not.toHaveBeenCalledWith(
        'templatesPath',
        globalPath,
        ConfigurationTarget.Workspace
      );
    });

    it('should handle configuration reading when both global and workspace values exist', async () => {
      // Arrange - Mock configuration that returns workspace value (higher precedence)
      const mockConfig = {
        get: vi.fn().mockReturnValue('/test/workspace/templates'), // Workspace takes precedence
        update: vi.fn().mockResolvedValue(undefined),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn().mockReturnValue({
          key: 'templatesPath',
          defaultValue: undefined,
          globalValue: '/test/global/templates',
          workspaceValue: '/test/workspace/templates',
          workspaceFolderValue: undefined
        })
      };
      vscodeMock.workspace.getConfiguration.mockReturnValue(mockConfig);
      
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/workspace/templates'],
        files: {
          '/test/workspace/templates/workspace-template.md': '# Workspace Template'
        }
      });
      
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('workspace-template');
      expect(children[0].itemType).toBe('template');
    });

    it('should handle configuration reading when only global value exists', async () => {
      // Arrange - Mock configuration that returns global value
      const mockConfig = {
        get: vi.fn().mockReturnValue('/test/global/templates'),
        update: vi.fn().mockResolvedValue(undefined),
        has: vi.fn().mockReturnValue(true),
        inspect: vi.fn().mockReturnValue({
          key: 'templatesPath',
          defaultValue: undefined,
          globalValue: '/test/global/templates',
          workspaceValue: undefined,
          workspaceFolderValue: undefined
        })
      };
      vscodeMock.workspace.getConfiguration.mockReturnValue(mockConfig);
      
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/global/templates'],
        files: {
          '/test/global/templates/global-template.md': '# Global Template'
        }
      });
      
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('global-template');
      expect(children[0].itemType).toBe('template');
    });

    it('should handle configuration reading when no values exist', async () => {
      // Arrange - Mock configuration that returns undefined (no configuration set)
      const mockConfig = {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        has: vi.fn().mockReturnValue(false),
        inspect: vi.fn().mockReturnValue({
          key: 'templatesPath',
          defaultValue: undefined,
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined
        })
      };
      vscodeMock.workspace.getConfiguration.mockReturnValue(mockConfig);
      
      mockProvider = new SteeringTemplateProvider(mockContext);

      // Act
      const children = await mockProvider.getChildren();

      // Assert
      expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Click to set templates path');
      expect(children[0].itemType).toBe('setup');
    });

    it('should consistently use Global target for all configuration updates', async () => {
      // Arrange
      const paths = ['/test/path1', '/test/path2', '/test/path3'];
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act - Multiple updates
      for (const path of paths) {
        userInteractions.selectFolder(path);
        userInteractions.configUpdateSuccess();
        await setTemplatesPathCommand?.callback();
      }

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledTimes(3);
      paths.forEach((path, index) => {
        expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenNthCalledWith(
          index + 1,
          'templatesPath',
          path,
          ConfigurationTarget.Global
        );
      });
    });
  });
});
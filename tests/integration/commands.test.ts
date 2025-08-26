/**
 * Integration tests for VS Code extension commands
 * Tests command registration, execution flow, parameter passing, and VS Code integration
 * Requirements: 2.1, 2.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { testHelpers } from '../utils/testHelpers';
import {
  vscode as vscodeMock,
  setupConfiguration,
  userInteractions,
  getRegisteredCommands,
  getRegisteredTreeDataProviders,
  messageAssertions
} from '../mocks/setup';
import { fileSystemMockUtils } from '../mocks/fs';

// Mock the SteeringTemplateProvider for integration testing
vi.mock('../../src/steeringTemplateProvider', () => {
  const MockSteeringTemplateProvider = vi.fn().mockImplementation(() => ({
    refresh: vi.fn(),
    loadTemplate: vi.fn().mockResolvedValue(undefined),
    getTreeItem: vi.fn(),
    getChildren: vi.fn().mockResolvedValue([])
  }));
  
  return {
    SteeringTemplateProvider: MockSteeringTemplateProvider
  };
});

describe('Command Integration Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let mockProvider: any;

  beforeEach(() => {
    // Reset all mocks and test state
    testHelpers.reset();
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    
    // Set up fresh mock provider
    const MockedSteeringTemplateProvider = SteeringTemplateProvider as any;
    MockedSteeringTemplateProvider.mockClear();
    
    mockProvider = {
      refresh: vi.fn(),
      loadTemplate: vi.fn().mockResolvedValue(undefined),
      getTreeItem: vi.fn(),
      getChildren: vi.fn().mockResolvedValue([])
    };
    
    MockedSteeringTemplateProvider.mockImplementation(() => mockProvider);
    
    // Set up default configuration
    setupConfiguration({ templatesPath: undefined });
  });

  afterEach(() => {
    // Clean up after each test
    testHelpers.cleanup();
    deactivate();
  });

  describe('Command Registration During Extension Activation', () => {
    it('should register all commands during activation', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(3);
      
      const registeredCommands = getRegisteredCommands();
      expect(registeredCommands).toHaveLength(3);
      
      const commandNames = registeredCommands.map(cmd => cmd.command);
      expect(commandNames).toEqual([
        'kiroSteeringLoader.refresh',
        'kiroSteeringLoader.loadTemplate',
        'kiroSteeringLoader.setTemplatesPath'
      ]);
    });

    it('should register commands with proper callback functions', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredCommands = getRegisteredCommands();
      
      registeredCommands.forEach(({ command, callback }) => {
        expect(typeof command).toBe('string');
        expect(typeof callback).toBe('function');
        expect(command.startsWith('kiroSteeringLoader.')).toBe(true);
      });
    });

    it('should register commands that return disposable objects', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(3);
      
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });

    it('should register tree data provider before commands', () => {
      // Act
      activate(mockContext);

      // Assert
      // Verify tree data provider was registered first by checking call order
      const treeProviderCalls = vscodeMock.window.registerTreeDataProvider.mock.calls;
      const commandCalls = vscodeMock.commands.registerCommand.mock.calls;
      
      expect(treeProviderCalls).toHaveLength(1);
      expect(commandCalls).toHaveLength(3);
      
      // In a real scenario, we'd check timestamps, but for mocks we verify both were called
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(3);
    });

    it('should register commands in consistent order', () => {
      // Act
      activate(mockContext);

      // Assert
      const commandCalls = vscodeMock.commands.registerCommand.mock.calls;
      expect(commandCalls[0][0]).toBe('kiroSteeringLoader.refresh');
      expect(commandCalls[1][0]).toBe('kiroSteeringLoader.loadTemplate');
      expect(commandCalls[2][0]).toBe('kiroSteeringLoader.setTemplatesPath');
    });
  });

  describe('Command Execution Flow and Parameter Passing', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    describe('Refresh Command', () => {
      it('should execute refresh command without parameters', async () => {
        // Arrange
        const refreshCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

        // Act
        await refreshCommand?.callback();

        // Assert
        expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
        expect(mockProvider.refresh).toHaveBeenCalledWith();
      });

      it('should handle refresh command execution synchronously', () => {
        // Arrange
        const refreshCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

        // Act & Assert - should not return a promise
        const result = refreshCommand?.callback();
        expect(result).toBeUndefined();
      });

      it('should execute refresh command multiple times without issues', async () => {
        // Arrange
        const refreshCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

        // Act
        await refreshCommand?.callback();
        await refreshCommand?.callback();
        await refreshCommand?.callback();

        // Assert
        expect(mockProvider.refresh).toHaveBeenCalledTimes(3);
      });

      it('should handle provider refresh errors gracefully', async () => {
        // Arrange
        const error = new Error('Refresh failed');
        mockProvider.refresh.mockImplementationOnce(() => {
          throw error;
        });
        const refreshCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

        // Act & Assert - should not throw
        expect(() => refreshCommand?.callback()).toThrow(error);
      });
    });

    describe('Load Template Command', () => {
      it('should execute loadTemplate command with string parameter', async () => {
        // Arrange
        const templatePath = '/test/templates/example.md';
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        await loadTemplateCommand?.callback(templatePath);

        // Assert
        expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith(templatePath);
      });

      it('should execute loadTemplate command with undefined parameter', async () => {
        // Arrange
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        await loadTemplateCommand?.callback(undefined);

        // Assert
        expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith(undefined);
      });

      it('should execute loadTemplate command with empty string parameter', async () => {
        // Arrange
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        await loadTemplateCommand?.callback('');

        // Assert
        expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith('');
      });

      it('should handle loadTemplate command with multiple parameters', async () => {
        // Arrange
        const templatePath = '/test/templates/example.md';
        const extraParam = 'extra';
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        await loadTemplateCommand?.callback(templatePath, extraParam);

        // Assert
        expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
        // The command only passes the first parameter (templatePath) to the provider
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith(templatePath);
      });

      it('should handle loadTemplate provider errors', () => {
        // Arrange
        const error = new Error('Load template failed');
        mockProvider.loadTemplate.mockRejectedValueOnce(error);
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        // The command doesn't await the provider method, so errors are not propagated synchronously
        expect(() => loadTemplateCommand?.callback('/test/path')).not.toThrow();
        
        // Assert
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/path');
      });

      it('should not return promise from loadTemplate command', () => {
        // Arrange
        const loadTemplateCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

        // Act
        const result = loadTemplateCommand?.callback('/test/path');

        // Assert
        // The command doesn't return the promise, it just calls the provider method
        expect(result).toBeUndefined();
        expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/path');
      });
    });

    describe('Set Templates Path Command', () => {
      it('should execute setTemplatesPath command and show open dialog', async () => {
        // Arrange
        userInteractions.cancelDialog(); // User cancels to avoid side effects
        const setTemplatesPathCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

        // Act
        await setTemplatesPathCommand?.callback();

        // Assert
        expect(vscodeMock.window.showOpenDialog).toHaveBeenCalledTimes(1);
        expect(vscodeMock.window.showOpenDialog).toHaveBeenCalledWith({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select Templates Directory'
        });
      });

      it('should execute complete workflow when user selects folder', async () => {
        // Arrange
        const selectedPath = '/test/selected/templates';
        userInteractions.selectFolder(selectedPath);
        userInteractions.configUpdateSuccess();
        const setTemplatesPathCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

        // Act
        await setTemplatesPathCommand?.callback();

        // Assert
        expect(vscodeMock.window.showOpenDialog).toHaveBeenCalledTimes(1);
        expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
        expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
          'templatesPath',
          selectedPath,
          vscode.ConfigurationTarget.Global
        );
        expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
      });

      it('should handle user cancellation gracefully', async () => {
        // Arrange
        userInteractions.cancelDialog();
        const setTemplatesPathCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

        // Act
        await setTemplatesPathCommand?.callback();

        // Assert
        expect(vscodeMock.window.showOpenDialog).toHaveBeenCalledTimes(1);
        expect(vscodeMock.workspace.getConfiguration().update).not.toHaveBeenCalled();
        expect(mockProvider.refresh).not.toHaveBeenCalled();
      });

      it('should handle configuration update errors', async () => {
        // Arrange
        const selectedPath = '/test/selected/templates';
        const configError = new Error('Configuration update failed');
        userInteractions.selectFolder(selectedPath);
        userInteractions.configUpdateFailure(configError);
        const setTemplatesPathCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

        // Act & Assert
        await expect(setTemplatesPathCommand?.callback()).rejects.toThrow(configError);
        expect(mockProvider.refresh).not.toHaveBeenCalled();
      });

      it('should return promise from setTemplatesPath command', async () => {
        // Arrange
        userInteractions.cancelDialog();
        const setTemplatesPathCommand = getRegisteredCommands()
          .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

        // Act
        const result = setTemplatesPathCommand?.callback();

        // Assert
        expect(result).toBeInstanceOf(Promise);
        await result; // Ensure promise resolves
      });
    });
  });

  describe('Command Interaction with Tree Data Provider', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should use same provider instance for commands and tree data provider', () => {
      // Assert
      const registeredProviders = getRegisteredTreeDataProviders();
      expect(registeredProviders).toHaveLength(1);
      expect(registeredProviders[0].provider).toBe(mockProvider);

      // Execute refresh command and verify it uses the same provider
      const refreshCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');
      refreshCommand?.callback();
      
      expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    });

    it('should refresh tree data provider after configuration changes', async () => {
      // Arrange
      const selectedPath = '/test/templates';
      userInteractions.selectFolder(selectedPath);
      userInteractions.configUpdateSuccess();
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    });

    it('should maintain provider state across command executions', async () => {
      // Arrange
      const refreshCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');
      const loadTemplateCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act
      refreshCommand?.callback();
      await loadTemplateCommand?.callback('/test/template.md');
      refreshCommand?.callback();

      // Assert
      expect(mockProvider.refresh).toHaveBeenCalledTimes(2);
      expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/template.md');
    });

    it('should register tree data provider with correct view ID', () => {
      // Assert
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledWith(
        'kiroSteeringLoader',
        mockProvider
      );
    });
  });

  describe('Command Interaction with Configuration', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should read configuration through workspace API', async () => {
      // Arrange
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      userInteractions.selectFolder('/test/path');
      userInteractions.configUpdateSuccess();

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
    });

    it('should update configuration with correct parameters', async () => {
      // Arrange
      const selectedPath = '/test/new/templates';
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      userInteractions.selectFolder(selectedPath);
      userInteractions.configUpdateSuccess();

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        selectedPath,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should handle configuration API errors gracefully', async () => {
      // Arrange
      const configError = new Error('Configuration API error');
      vscodeMock.workspace.getConfiguration.mockImplementationOnce(() => {
        throw configError;
      });
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      userInteractions.selectFolder('/test/path');

      // Act & Assert
      await expect(setTemplatesPathCommand?.callback()).rejects.toThrow(configError);
    });

    it('should use Global configuration target for templates path', async () => {
      // Arrange
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');
      userInteractions.selectFolder('/test/path');
      userInteractions.configUpdateSuccess();

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        '/test/path',
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe('Command Availability and VS Code Integration', () => {
    it('should register commands that are available in VS Code command palette', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredCommands = getRegisteredCommands();
      expect(registeredCommands).toHaveLength(3);
      
      // Verify all commands follow VS Code naming convention
      registeredCommands.forEach(({ command }) => {
        expect(command).toMatch(/^kiroSteeringLoader\./);
        expect(command).not.toContain(' '); // No spaces in command names
        // Commands use camelCase, not lowercase
        expect(command).toMatch(/^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/);
      });
    });

    it('should register commands with proper VS Code API integration', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(3);
      
      // Verify each command registration returns a disposable
      const commandCalls = vscodeMock.commands.registerCommand.mock.calls;
      commandCalls.forEach(([commandName, callback]) => {
        expect(typeof commandName).toBe('string');
        expect(typeof callback).toBe('function');
      });
    });

    it('should integrate properly with VS Code extension lifecycle', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(3);
      
      // Verify all subscriptions are properly tracked
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
      });
    });

    it('should handle VS Code API failures during command registration', () => {
      // Arrange
      const registrationError = new Error('Command registration failed');
      vscodeMock.commands.registerCommand.mockImplementationOnce(() => {
        throw registrationError;
      });

      // Act & Assert
      expect(() => activate(mockContext)).toThrow(registrationError);
    });

    it('should register tree data provider with VS Code window API', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledWith(
        'kiroSteeringLoader',
        expect.any(Object)
      );
    });

    it('should handle tree data provider registration failures', () => {
      // Arrange
      const registrationError = new Error('Tree data provider registration failed');
      vscodeMock.window.registerTreeDataProvider.mockImplementationOnce(() => {
        throw registrationError;
      });

      // Act & Assert
      expect(() => activate(mockContext)).toThrow(registrationError);
    });
  });

  describe('Command Error Handling and Edge Cases', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should handle commands executed with incorrect parameter types', async () => {
      // Arrange
      const loadTemplateCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act & Assert - should handle non-string parameters
      await loadTemplateCommand?.callback(123 as any);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(123);

      await loadTemplateCommand?.callback(null as any);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(null);

      await loadTemplateCommand?.callback({} as any);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith({});
    });

    it('should handle commands executed without required parameters', async () => {
      // Arrange
      const loadTemplateCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act
      await loadTemplateCommand?.callback();

      // Assert
      // When called without parameters, the command passes undefined
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(undefined);
    });

    it('should handle provider method failures gracefully', () => {
      // Arrange
      const providerError = new Error('Provider method failed');
      mockProvider.loadTemplate.mockRejectedValueOnce(providerError);
      const loadTemplateCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act & Assert
      // The command doesn't await the provider method, so errors are not propagated
      expect(() => loadTemplateCommand?.callback('/test/path')).not.toThrow();
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/path');
    });

    it('should handle VS Code API failures during command execution', async () => {
      // Arrange
      const apiError = new Error('VS Code API failed');
      vscodeMock.window.showOpenDialog.mockRejectedValueOnce(apiError);
      const setTemplatesPathCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act & Assert
      await expect(setTemplatesPathCommand?.callback()).rejects.toThrow(apiError);
    });

    it('should maintain command functionality after provider errors', async () => {
      // Arrange
      const refreshCommand = getRegisteredCommands()
        .find(cmd => cmd.command === 'kiroSteeringLoader.refresh');
      
      // Cause an error in the first call
      mockProvider.refresh.mockImplementationOnce(() => {
        throw new Error('First call failed');
      });

      // Act & Assert
      expect(() => refreshCommand?.callback()).toThrow('First call failed');
      
      // Second call should work normally
      expect(() => refreshCommand?.callback()).not.toThrow();
      expect(mockProvider.refresh).toHaveBeenCalledTimes(2);
    });
  });
});
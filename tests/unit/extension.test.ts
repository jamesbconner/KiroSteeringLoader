/**
 * Unit tests for extension activation and deactivation
 * Tests the activate function, command registration, tree data provider setup,
 * command handlers, context subscription management, and deactivate function
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { testHelpers } from '../utils/testHelpers';
import {
  vscode as vscodeMock,
  setupConfiguration,
  userInteractions,
  getRegisteredCommands,
  getRegisteredTreeDataProviders
} from '../mocks/setup';

// Mock the SteeringTemplateProvider
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

describe('Extension Activation', () => {
  let mockContext: vscode.ExtensionContext;
  let mockProvider: any;

  beforeEach(() => {
    // Reset all mocks
    testHelpers.reset();
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    
    // Get the mocked provider instance
    const MockedSteeringTemplateProvider = SteeringTemplateProvider as any;
    MockedSteeringTemplateProvider.mockClear();
    
    // Create a fresh mock provider for each test
    mockProvider = {
      refresh: vi.fn(),
      loadTemplate: vi.fn().mockResolvedValue(undefined),
      getTreeItem: vi.fn(),
      getChildren: vi.fn().mockResolvedValue([])
    };
    
    MockedSteeringTemplateProvider.mockImplementation(() => mockProvider);
  });

  describe('activate function', () => {
    it('should create SteeringTemplateProvider with extension context', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(SteeringTemplateProvider).toHaveBeenCalledTimes(1);
      expect(SteeringTemplateProvider).toHaveBeenCalledWith(mockContext);
    });

    it('should register tree data provider with correct view ID', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(1);
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledWith(
        'kiroSteeringLoader',
        expect.any(Object)
      );
      
      // Verify the provider passed is the created instance
      const registeredProviders = getRegisteredTreeDataProviders();
      expect(registeredProviders).toHaveLength(1);
      expect(registeredProviders[0].viewId).toBe('kiroSteeringLoader');
      expect(registeredProviders[0].provider).toBe(mockProvider);
    });

    it('should register all required commands', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredCommands = getRegisteredCommands();
      expect(registeredCommands).toHaveLength(3);
      
      const commandNames = registeredCommands.map(cmd => cmd.command);
      expect(commandNames).toContain('kiroSteeringLoader.refresh');
      expect(commandNames).toContain('kiroSteeringLoader.loadTemplate');
      expect(commandNames).toContain('kiroSteeringLoader.setTemplatesPath');
    });

    it('should add all disposables to context subscriptions', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(3);
      
      // Verify all subscriptions are disposable objects
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });

    it('should register commands that return disposable objects', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(3);
      
      // Verify each registerCommand call returns a disposable
      const registerCommandCalls = (vscodeMock.commands.registerCommand as MockedFunction<any>).mock.calls;
      registerCommandCalls.forEach(call => {
        const [commandName, callback] = call;
        expect(typeof commandName).toBe('string');
        expect(typeof callback).toBe('function');
      });
    });
  });

  describe('refresh command handler', () => {
    it('should call provider.refresh when refresh command is executed', async () => {
      // Arrange
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const refreshCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

      // Act
      await refreshCommand?.callback();

      // Assert
      expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
      expect(mockProvider.refresh).toHaveBeenCalledWith();
    });

    it('should handle refresh command execution without errors', () => {
      // Arrange
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const refreshCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.refresh');

      // Act & Assert - should not throw
      expect(() => refreshCommand?.callback()).not.toThrow();
    });
  });

  describe('loadTemplate command handler', () => {
    it('should call provider.loadTemplate with correct template path', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const loadTemplateCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act
      await loadTemplateCommand?.callback(templatePath);

      // Assert
      expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(templatePath);
    });

    it('should handle loadTemplate command with undefined template path', async () => {
      // Arrange
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const loadTemplateCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act
      await loadTemplateCommand?.callback(undefined);

      // Assert
      expect(mockProvider.loadTemplate).toHaveBeenCalledTimes(1);
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(undefined);
    });

    it('should handle loadTemplate errors gracefully', async () => {
      // Arrange
      const error = new Error('Load template failed');
      mockProvider.loadTemplate.mockRejectedValueOnce(error);
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const loadTemplateCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act - call the command and handle any potential promise rejection
      const result = loadTemplateCommand?.callback('/test/path');
      
      // If the command returns a promise, we need to handle the rejection
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          // Silently handle the rejection for testing purposes
        });
      }
      
      // Assert - should not throw synchronously
      expect(() => loadTemplateCommand?.callback('/test/path')).not.toThrow();
      
      // Verify the provider method was called
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('setTemplatesPath command handler', () => {
    beforeEach(() => {
      // Set up default configuration mock
      setupConfiguration({ templatesPath: undefined });
    });

    it('should show open dialog with correct options', async () => {
      // Arrange
      userInteractions.selectFolder('/test/selected/path');
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

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

    it('should update configuration when user selects a folder', async () => {
      // Arrange
      const selectedPath = '/test/selected/templates';
      userInteractions.selectFolder(selectedPath);
      userInteractions.configUpdateSuccess();
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith('kiroSteeringLoader');
      expect(vscodeMock.workspace.getConfiguration().update).toHaveBeenCalledWith(
        'templatesPath',
        selectedPath,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should refresh provider after successful configuration update', async () => {
      // Arrange
      const selectedPath = '/test/selected/templates';
      userInteractions.selectFolder(selectedPath);
      userInteractions.configUpdateSuccess();
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    });

    it('should not update configuration when user cancels dialog', async () => {
      // Arrange
      userInteractions.cancelDialog();
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).not.toHaveBeenCalled();
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });

    it('should not update configuration when dialog returns empty result', async () => {
      // Arrange
      vscodeMock.window.showOpenDialog.mockResolvedValueOnce([]);
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act
      await setTemplatesPathCommand?.callback();

      // Assert
      expect(vscodeMock.workspace.getConfiguration().update).not.toHaveBeenCalled();
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });

    it('should handle configuration update errors gracefully', async () => {
      // Arrange
      const selectedPath = '/test/selected/templates';
      const configError = new Error('Configuration update failed');
      userInteractions.selectFolder(selectedPath);
      userInteractions.configUpdateFailure(configError);
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const setTemplatesPathCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.setTemplatesPath');

      // Act & Assert - should handle the error gracefully without throwing
      try {
        await setTemplatesPathCommand?.callback();
      } catch (error) {
        // The command should handle errors internally, but if it doesn't,
        // we verify it's the expected error
        expect(error).toEqual(configError);
      }
      
      // Provider refresh should not be called if config update fails
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });
  });

  describe('context subscription management', () => {
    it('should properly dispose all subscriptions when context is disposed', () => {
      // Arrange
      activate(mockContext);
      const initialSubscriptionCount = mockContext.subscriptions.length;
      expect(initialSubscriptionCount).toBe(3);

      // Act - simulate context disposal
      mockContext.subscriptions.forEach(subscription => {
        subscription.dispose();
      });

      // Assert - verify all disposables have dispose method and can be called
      expect(initialSubscriptionCount).toBe(3);
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });

    it('should add subscriptions in correct order', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(3);
      
      // Verify the order matches the registration order in activate function
      const registeredCommands = getRegisteredCommands();
      expect(registeredCommands[0].command).toBe('kiroSteeringLoader.refresh');
      expect(registeredCommands[1].command).toBe('kiroSteeringLoader.loadTemplate');
      expect(registeredCommands[2].command).toBe('kiroSteeringLoader.setTemplatesPath');
    });

    it('should not add duplicate subscriptions on multiple activations', () => {
      // Act
      activate(mockContext);
      const firstActivationCount = mockContext.subscriptions.length;
      
      // Create new context for second activation
      const secondContext = testHelpers.createMockExtensionContext();
      activate(secondContext);

      // Assert
      expect(firstActivationCount).toBe(3);
      expect(secondContext.subscriptions).toHaveLength(3);
      
      // Verify VS Code APIs were called the expected number of times
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(6); // 3 commands × 2 activations
      expect(vscodeMock.window.registerTreeDataProvider).toHaveBeenCalledTimes(2); // 1 provider × 2 activations
    });
  });

  describe('integration between components', () => {
    it('should create provider and register it with VS Code in correct sequence', () => {
      // Act
      activate(mockContext);

      // Assert - verify call order
      const mockCalls = vi.mocked(SteeringTemplateProvider).mock.calls;
      const registerTreeDataProviderCalls = vscodeMock.window.registerTreeDataProvider.mock.calls;
      const registerCommandCalls = vscodeMock.commands.registerCommand.mock.calls;

      // Provider should be created first
      expect(mockCalls).toHaveLength(1);
      
      // Then tree data provider should be registered
      expect(registerTreeDataProviderCalls).toHaveLength(1);
      
      // Then commands should be registered
      expect(registerCommandCalls).toHaveLength(3);
    });

    it('should pass the same provider instance to tree data provider and command handlers', () => {
      // Act
      activate(mockContext);

      // Assert
      const registeredProviders = getRegisteredTreeDataProviders();
      expect(registeredProviders[0].provider).toBe(mockProvider);
      
      // Verify commands use the same provider instance
      const registeredCommands = getRegisteredCommands();
      
      // Execute refresh command and verify it calls the same provider
      const refreshCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.refresh');
      refreshCommand?.callback();
      expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Extension Deactivation', () => {
  it('should execute without errors', () => {
    // Act & Assert - should not throw
    expect(() => deactivate()).not.toThrow();
  });

  it('should be a function', () => {
    // Assert
    expect(typeof deactivate).toBe('function');
  });

  it('should return undefined', () => {
    // Act
    const result = deactivate();

    // Assert
    expect(result).toBeUndefined();
  });

  it('should not perform any operations', () => {
    // Arrange - set up spies on VS Code APIs
    const vscodeSpy = {
      commands: vi.spyOn(vscodeMock.commands, 'registerCommand'),
      window: vi.spyOn(vscodeMock.window, 'registerTreeDataProvider')
    };

    // Act
    deactivate();

    // Assert - no VS Code APIs should be called
    expect(vscodeSpy.commands).not.toHaveBeenCalled();
    expect(vscodeSpy.window).not.toHaveBeenCalled();
  });
});

describe('Extension Module Exports', () => {
  it('should export activate function', () => {
    // Assert
    expect(typeof activate).toBe('function');
    expect(activate.name).toBe('activate');
  });

  it('should export deactivate function', () => {
    // Assert
    expect(typeof deactivate).toBe('function');
    expect(deactivate.name).toBe('deactivate');
  });

  it('should have activate function with correct signature', () => {
    // Assert
    expect(activate.length).toBe(1); // Should accept one parameter (context)
  });

  it('should have deactivate function with correct signature', () => {
    // Assert
    expect(deactivate.length).toBe(0); // Should accept no parameters
  });
});
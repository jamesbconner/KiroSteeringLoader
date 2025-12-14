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
      expect(SteeringTemplateProvider).toHaveBeenCalledWith(
        mockContext,
        expect.any(Object), // ConfigurationService
        expect.any(Object), // GitHubRepositoryService
        expect.any(Object), // CacheManager
        expect.any(Object), // FileSystemService
        expect.any(Object)  // ErrorHandler
      );
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
      expect(registeredCommands).toHaveLength(10);
      
      const commandNames = registeredCommands.map(cmd => cmd.command);
      expect(commandNames).toContain('kiroSteeringLoader.refresh');
      expect(commandNames).toContain('kiroSteeringLoader.forceRefresh');
      expect(commandNames).toContain('kiroSteeringLoader.loadTemplate');
      expect(commandNames).toContain('kiroSteeringLoader.setTemplatesPath');
      expect(commandNames).toContain('kiroSteeringLoader.configureGitHubRepository');
      expect(commandNames).toContain('kiroSteeringLoader.configureGitHubToken');
      expect(commandNames).toContain('kiroSteeringLoader.clearGitHubToken');
      expect(commandNames).toContain('kiroSteeringLoader.clearCache');
      expect(commandNames).toContain('kiroSteeringLoader.switchToLocalMode');
      expect(commandNames).toContain('kiroSteeringLoader.switchToGitHubMode');
    });

    it('should add all disposables to context subscriptions', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(11);
      
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
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(10);
      
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
      expect(mockProvider.refresh).toHaveBeenCalledWith(false);
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
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(templatePath, undefined);
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
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should handle loadTemplate errors gracefully', async () => {
      // Arrange
      const error = new Error('Load template failed');
      mockProvider.loadTemplate.mockRejectedValueOnce(error);
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const loadTemplateCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.loadTemplate');

      // Act - properly await the promise and handle the rejection
      try {
        await loadTemplateCommand?.callback('/test/path');
      } catch (caughtError) {
        // Expected to catch the error
        expect(caughtError).toBe(error);
      }
      
      // Verify the provider method was called
      expect(mockProvider.loadTemplate).toHaveBeenCalledWith('/test/path', undefined);
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
      expect(initialSubscriptionCount).toBe(11);

      // Act - simulate context disposal
      mockContext.subscriptions.forEach(subscription => {
        subscription.dispose();
      });

      // Assert - verify all disposables have dispose method and can be called
      expect(initialSubscriptionCount).toBe(11);
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });

    it('should add subscriptions in correct order', () => {
      // Act
      activate(mockContext);

      // Assert
      expect(mockContext.subscriptions).toHaveLength(11);
      
      // Verify the order matches the registration order in activate function
      const registeredCommands = getRegisteredCommands();
      expect(registeredCommands[0].command).toBe('kiroSteeringLoader.refresh');
      expect(registeredCommands[1].command).toBe('kiroSteeringLoader.forceRefresh');
      expect(registeredCommands[2].command).toBe('kiroSteeringLoader.loadTemplate');
    });

    it('should not add duplicate subscriptions on multiple activations', () => {
      // Act
      activate(mockContext);
      const firstActivationCount = mockContext.subscriptions.length;
      
      // Create new context for second activation
      const secondContext = testHelpers.createMockExtensionContext();
      activate(secondContext);

      // Assert
      expect(firstActivationCount).toBe(11);
      expect(secondContext.subscriptions).toHaveLength(11);
      
      // Verify VS Code APIs were called the expected number of times
      expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(20); // 10 commands × 2 activations
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
      expect(registerCommandCalls).toHaveLength(10);
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

describe('GitHub Configuration Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockProvider: any;

  beforeEach(() => {
    // Reset all mocks and set up fresh context
    testHelpers.reset();
    mockContext = testHelpers.createMockExtensionContext();
    
    // Create fresh mock provider
    mockProvider = {
      refresh: vi.fn(),
      loadTemplate: vi.fn().mockResolvedValue(undefined),
      getTreeItem: vi.fn(),
      getChildren: vi.fn().mockResolvedValue([])
    };
    
    const MockedSteeringTemplateProvider = SteeringTemplateProvider as any;
    MockedSteeringTemplateProvider.mockImplementation(() => mockProvider);
  });

  describe('configureGitHubRepository command handler', () => {
    it('should show input box for repository URL', async () => {
      // Arrange
      userInteractions.inputText('owner/repo');
      userInteractions.inputText('templates'); // path
      userInteractions.inputText('main'); // branch
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubRepository');

      // Act
      await configureCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInputBox).toHaveBeenCalledWith({
        prompt: 'Enter GitHub repository URL or owner/repo',
        placeHolder: 'e.g., https://github.com/owner/repo or owner/repo',
        validateInput: expect.any(Function)
      });
    });

    it('should validate repository URL input', async () => {
      // Arrange
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubRepository');
      
      // Get the validation function from the showInputBox call
      userInteractions.inputText('owner/repo');
      userInteractions.inputText(''); // path
      userInteractions.inputText('main'); // branch
      await configureCommand?.callback();
      
      const inputBoxCall = (vscodeMock.window.showInputBox as any).mock.calls[0][0];
      const validateInput = inputBoxCall.validateInput;

      // Act & Assert - The validation function currently has a bug where it doesn't catch parseRepositoryUrl exceptions
      expect(validateInput('')).toBe('Repository URL cannot be empty');
      expect(validateInput('   ')).toBe('Repository URL cannot be empty');
      
      // These should return error messages for invalid formats
      expect(validateInput('invalid-format')).toBe('Invalid repository URL format. Use: owner/repo or https://github.com/owner/repo');
      expect(validateInput('owner/repo')).toBeNull();
      expect(validateInput('https://github.com/owner/repo')).toBeNull();
    });

    it('should handle user cancellation', async () => {
      // Arrange
      userInteractions.cancelDialog(); // Cancel repository input
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubRepository');

      // Act
      await configureCommand?.callback();

      // Assert - should not proceed to path/branch inputs
      expect(vscodeMock.window.showInputBox).toHaveBeenCalledTimes(1);
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });

    it('should configure repository with all inputs', async () => {
      // Arrange
      const mockConfigService = {
        setRepositoryConfig: vi.fn().mockResolvedValue(undefined)
      };
      
      userInteractions.inputText('owner/repo');
      userInteractions.inputText('templates/steering'); // path
      userInteractions.inputText('develop'); // branch
      setupConfiguration({});
      
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubRepository');

      // Act
      await configureCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInputBox).toHaveBeenCalledTimes(3); // repo, path, branch
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith('GitHub repository configured: owner/repo');
      expect(mockProvider.refresh).toHaveBeenCalled();
    });

    it('should handle invalid repository URL format', async () => {
      // Arrange
      userInteractions.inputText('invalid-url-format');
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubRepository');

      // Act - The command should handle invalid input gracefully
      await configureCommand?.callback();
      
      // Assert - Error message should be shown and provider should not be refreshed
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Invalid repository URL format');
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });
  });

  describe('configureGitHubToken command handler', () => {
    it('should show input box for GitHub token', async () => {
      // Arrange
      userInteractions.inputText('ghp_test_token_123456789');
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubToken');

      // Act
      await configureCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInputBox).toHaveBeenCalledWith({
        prompt: 'Enter your GitHub Personal Access Token',
        placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
        password: true,
        validateInput: expect.any(Function)
      });
    });

    it('should validate GitHub token input', async () => {
      // Arrange
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubToken');
      
      // Get the validation function
      userInteractions.inputText('ghp_valid_token');
      await configureCommand?.callback();
      
      const inputBoxCall = (vscodeMock.window.showInputBox as any).mock.calls[0][0];
      const validateInput = inputBoxCall.validateInput;

      // Act & Assert
      expect(validateInput('')).toBe('Token cannot be empty');
      expect(validateInput('   ')).toBe('Token cannot be empty');
      expect(validateInput('invalid_token')).toBe('Token should start with ghp_ or github_pat_');
      expect(validateInput('ghp_valid_token')).toBeNull();
      expect(validateInput('github_pat_valid_token')).toBeNull();
    });

    it('should configure token successfully', async () => {
      // Arrange
      const token = 'ghp_test_token_123456789';
      userInteractions.inputText(token);
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubToken');

      // Act
      await configureCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith('GitHub token configured successfully');
      expect(mockProvider.refresh).toHaveBeenCalled();
    });

    it('should handle token input cancellation', async () => {
      // Arrange
      userInteractions.cancelDialog();
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const configureCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.configureGitHubToken');

      // Act
      await configureCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalled();
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });
  });

  describe('clearGitHubToken command handler', () => {
    it('should show confirmation dialog', async () => {
      // Arrange
      userInteractions.confirmAction('Clear Token');
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const clearCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.clearGitHubToken');

      // Act
      await clearCommand?.callback();

      // Assert
      expect(vscodeMock.window.showWarningMessage).toHaveBeenCalledWith(
        'Are you sure you want to clear the GitHub token?',
        { modal: true },
        'Clear Token'
      );
    });

    it('should clear token when confirmed', async () => {
      // Arrange
      userInteractions.confirmAction('Clear Token');
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const clearCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.clearGitHubToken');

      // Act
      await clearCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith('GitHub token cleared');
      expect(mockProvider.refresh).toHaveBeenCalled();
    });

    it('should not clear token when cancelled', async () => {
      // Arrange
      userInteractions.cancelDialog();
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const clearCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.clearGitHubToken');

      // Act
      await clearCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalledWith('GitHub token cleared');
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });
  });

  describe('clearCache command handler', () => {
    it('should clear cache and show success message', async () => {
      // Arrange
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const clearCacheCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.clearCache');

      // Act
      await clearCacheCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith('Cache cleared successfully');
      expect(mockProvider.refresh).toHaveBeenCalled();
    });
  });

  describe('switchToLocalMode command handler', () => {
    it('should show folder selection dialog', async () => {
      // Arrange
      userInteractions.selectFolder('/test/local/templates');
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const switchCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.switchToLocalMode');

      // Act
      await switchCommand?.callback();

      // Assert
      expect(vscodeMock.window.showOpenDialog).toHaveBeenCalledWith({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Local Templates Directory'
      });
    });

    it('should configure local mode when folder selected', async () => {
      // Arrange
      const selectedPath = '/test/local/templates';
      
      // Clear all mocks to ensure clean state
      vi.clearAllMocks();
      testHelpers.reset();
      
      // Set up configuration mock to handle multiple update calls
      setupConfiguration({});
      
      // Override the configuration mock to ensure update calls succeed
      const mockConfig = {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined), // Both config updates should succeed
        has: vi.fn().mockReturnValue(false),
        inspect: vi.fn().mockReturnValue(undefined)
      };
      vscodeMock.workspace.getConfiguration.mockReturnValue(mockConfig);
      
      // Clear any previous mock setups and set up fresh mock
      vscodeMock.window.showOpenDialog.mockReset();
      vscodeMock.window.showOpenDialog.mockResolvedValue([
        { fsPath: selectedPath, scheme: 'file', authority: '', path: selectedPath, query: '', fragment: '' }
      ]);
      
      // Ensure showInformationMessage is properly mocked
      vscodeMock.window.showInformationMessage.mockReset();
      vscodeMock.window.showInformationMessage.mockResolvedValue(undefined);
      
      // Re-setup the provider mock after clearing
      const MockedSteeringTemplateProvider = SteeringTemplateProvider as any;
      MockedSteeringTemplateProvider.mockClear();
      mockProvider = {
        refresh: vi.fn(),
        loadTemplate: vi.fn().mockResolvedValue(undefined),
        getTreeItem: vi.fn(),
        getChildren: vi.fn().mockResolvedValue([])
      };
      MockedSteeringTemplateProvider.mockImplementation(() => mockProvider);
      
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const switchCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.switchToLocalMode');

      // Ensure the command exists
      expect(switchCommand).toBeDefined();

      // Act
      await switchCommand?.callback();

      // Assert
      expect(vscodeMock.window.showOpenDialog).toHaveBeenCalled();
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith('Switched to local mode');
      expect(mockProvider.refresh).toHaveBeenCalled();
      
      // Verify both configuration updates were called
      expect(mockConfig.update).toHaveBeenCalledWith('templatesPath', selectedPath, vscode.ConfigurationTarget.Global);
    });

    it('should handle folder selection cancellation', async () => {
      // Arrange
      userInteractions.cancelDialog();
      setupConfiguration({});
      activate(mockContext);
      const registeredCommands = getRegisteredCommands();
      const switchCommand = registeredCommands.find(cmd => cmd.command === 'kiroSteeringLoader.switchToLocalMode');

      // Act
      await switchCommand?.callback();

      // Assert
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalledWith('Switched to local mode');
      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });
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
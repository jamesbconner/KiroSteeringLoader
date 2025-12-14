/**
 * Integration tests for VS Code commands
 * Tests repository configuration, token management, cache clearing, and mode switching
 * Requirements: 1.1, 3.1, 3.5, 8.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { CacheManager } from '../../src/services/CacheManager';

describe('Commands Integration Tests', () => {
  let mockContext: any;
  let mockConfigService: ConfigurationService;
  let mockCacheManager: CacheManager;

  beforeEach(() => {
    // Create mock context
    mockContext = {
      subscriptions: [],
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => []),
        setKeysForSync: vi.fn()
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => []),
        setKeysForSync: vi.fn()
      },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn()
      },
      extensionUri: { fsPath: '/test' },
      extensionPath: '/test',
      asAbsolutePath: vi.fn((p: string) => p),
      storagePath: '/test/storage',
      globalStoragePath: '/test/global',
      logPath: '/test/log',
      extensionMode: 3,
      extension: {} as any,
      environmentVariableCollection: {} as any,
      storageUri: undefined,
      globalStorageUri: undefined,
      logUri: undefined
    };

    // Mock VS Code APIs
    vi.spyOn(vscode.window, 'registerTreeDataProvider').mockReturnValue({ dispose: vi.fn() });
    vi.spyOn(vscode.commands, 'registerCommand').mockImplementation((command, callback) => {
      return { dispose: vi.fn() };
    });
  });

  /**
   * Test repository configuration command
   * Validates: Requirements 1.1
   */
  it('should register configure GitHub repository command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.configureGitHubRepository',
      expect.any(Function)
    );
  });

  /**
   * Test token management commands
   * Validates: Requirements 3.1, 3.5
   */
  it('should register configure GitHub token command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.configureGitHubToken',
      expect.any(Function)
    );
  });

  it('should register clear GitHub token command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.clearGitHubToken',
      expect.any(Function)
    );
  });

  /**
   * Test cache clearing command
   * Validates: Requirements 4.4
   */
  it('should register clear cache command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.clearCache',
      expect.any(Function)
    );
  });

  /**
   * Test mode switching commands
   * Validates: Requirements 8.3
   */
  it('should register switch to local mode command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.switchToLocalMode',
      expect.any(Function)
    );
  });

  it('should register switch to GitHub mode command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.switchToGitHubMode',
      expect.any(Function)
    );
  });

  /**
   * Test force refresh command
   * Validates: Requirements 4.4
   */
  it('should register force refresh command', () => {
    // Act
    activate(mockContext);

    // Assert
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'kiroSteeringLoader.forceRefresh',
      expect.any(Function)
    );
  });

  /**
   * Test all commands are registered
   */
  it('should register all required commands', () => {
    // Act
    activate(mockContext);

    // Assert - verify all commands are registered
    const expectedCommands = [
      'kiroSteeringLoader.refresh',
      'kiroSteeringLoader.forceRefresh',
      'kiroSteeringLoader.loadTemplate',
      'kiroSteeringLoader.setTemplatesPath',
      'kiroSteeringLoader.configureGitHubRepository',
      'kiroSteeringLoader.configureGitHubToken',
      'kiroSteeringLoader.clearGitHubToken',
      'kiroSteeringLoader.clearCache',
      'kiroSteeringLoader.switchToLocalMode',
      'kiroSteeringLoader.switchToGitHubMode'
    ];

    for (const command of expectedCommands) {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        command,
        expect.any(Function)
      );
    }
  });

  /**
   * Test commands are added to subscriptions
   */
  it('should add all commands to context subscriptions', () => {
    // Act
    activate(mockContext);

    // Assert - verify subscriptions were added
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });

  /**
   * Test command callbacks are functions
   * Validates: Requirements 1.1, 3.1, 3.5, 8.3
   */
  it('should register command callbacks as functions', () => {
    // Act
    activate(mockContext);

    // Assert - verify all command callbacks are functions
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    
    for (const call of calls) {
      const [commandName, callback] = call;
      expect(typeof callback).toBe('function');
      expect(commandName).toMatch(/^kiroSteeringLoader\./);
    }
  });

  /**
   * Test command naming convention
   */
  it('should follow command naming convention', () => {
    // Act
    activate(mockContext);

    // Assert - all commands should start with kiroSteeringLoader.
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    
    for (const call of calls) {
      const commandName = call[0];
      expect(commandName).toMatch(/^kiroSteeringLoader\./);
    }
  });
});

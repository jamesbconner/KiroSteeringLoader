/**
 * Unit tests for ConfigurationService
 * Tests configuration management, repository settings, authentication tokens,
 * and configuration source priority logic
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import { ConfigurationService } from '../../../src/services/ConfigurationService';
import { RepositoryConfig, ConfigSource } from '../../../src/types';
import { testHelpers } from '../../utils/testHelpers';

// Import VS Code mocks
import * as vscode from 'vscode';

// Mock VS Code manually for this test
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: undefined
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  }
}));

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: any;
  let mockSecrets: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock secrets manager
    mockSecrets = {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn()
    };
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    mockContext.secrets = mockSecrets;
    
    // Create mock configuration
    mockConfig = {
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn()
    };
    
    (vscode.workspace.getConfiguration as MockedFunction<any>).mockReturnValue(mockConfig);
    
    // Create service instance
    configService = new ConfigurationService(mockContext);
  });

  describe('Repository Configuration', () => {
    describe('getRepositoryConfig', () => {
      it('should return null when no repository is configured', () => {
        // Arrange
        mockConfig.get.mockReturnValue(undefined);

        // Act
        const result = configService.getRepositoryConfig();

        // Assert
        expect(result).toBeNull();
        expect(mockConfig.get).toHaveBeenCalledWith('repository');
      });

      it('should return null when repository config is incomplete', () => {
        // Arrange - missing required fields
        mockConfig.get.mockReturnValue({ owner: 'test-owner' }); // missing repo

        // Act
        const result = configService.getRepositoryConfig();

        // Assert
        expect(result).toBeNull();
      });

      it('should return repository config with default branch', () => {
        // Arrange
        const repoConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'templates'
        };
        mockConfig.get.mockReturnValue(repoConfig);

        // Act
        const result = configService.getRepositoryConfig();

        // Assert
        expect(result).toEqual({
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'templates',
          branch: 'main'
        });
      });

      it('should return repository config with custom branch', () => {
        // Arrange
        const repoConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'steering',
          branch: 'develop'
        };
        mockConfig.get.mockReturnValue(repoConfig);

        // Act
        const result = configService.getRepositoryConfig();

        // Assert
        expect(result).toEqual(repoConfig);
      });

      it('should handle minimal valid configuration', () => {
        // Arrange
        const repoConfig = {
          owner: 'owner',
          repo: 'repo'
        };
        mockConfig.get.mockReturnValue(repoConfig);

        // Act
        const result = configService.getRepositoryConfig();

        // Assert
        expect(result).toEqual({
          owner: 'owner',
          repo: 'repo',
          path: undefined,
          branch: 'main'
        });
      });
    });

    describe('setRepositoryConfig', () => {
      it('should set repository config with workspace target when workspace exists', async () => {
        // Arrange
        const config: RepositoryConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'templates',
          branch: 'main'
        };
        
        // Mock workspace folders exist
        (vscode.workspace as any).workspaceFolders = [{ name: 'test' }];
        mockConfig.update.mockResolvedValue(undefined);

        // Act
        await configService.setRepositoryConfig(config);

        // Assert
        expect(mockConfig.update).toHaveBeenCalledWith(
          'repository',
          {
            owner: 'test-owner',
            repo: 'test-repo',
            path: 'templates',
            branch: 'main'
          },
          vscode.ConfigurationTarget.Workspace
        );
      });

      it('should set repository config with global target when no workspace', async () => {
        // Arrange
        const config: RepositoryConfig = {
          owner: 'test-owner',
          repo: 'test-repo'
        };
        
        // Mock no workspace folders
        (vscode.workspace as any).workspaceFolders = undefined;
        mockConfig.update.mockResolvedValue(undefined);

        // Act
        await configService.setRepositoryConfig(config);

        // Assert
        expect(mockConfig.update).toHaveBeenCalledWith(
          'repository',
          {
            owner: 'test-owner',
            repo: 'test-repo',
            path: undefined,
            branch: 'main'
          },
          vscode.ConfigurationTarget.Global
        );
      });

      it('should default branch to main when not specified', async () => {
        // Arrange
        const config: RepositoryConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          path: 'docs'
        };
        
        mockConfig.update.mockResolvedValue(undefined);

        // Act
        await configService.setRepositoryConfig(config);

        // Assert
        expect(mockConfig.update).toHaveBeenCalledWith(
          'repository',
          expect.objectContaining({
            branch: 'main'
          }),
          expect.any(Number)
        );
      });

      it('should handle configuration update errors', async () => {
        // Arrange
        const config: RepositoryConfig = {
          owner: 'test-owner',
          repo: 'test-repo'
        };
        
        const error = new Error('Configuration update failed');
        mockConfig.update.mockRejectedValue(error);

        // Act & Assert
        await expect(configService.setRepositoryConfig(config)).rejects.toThrow('Configuration update failed');
      });
    });
  });

  describe('Authentication Token Management', () => {
    describe('getAuthToken', () => {
      it('should return token from secure storage', async () => {
        // Arrange
        const expectedToken = 'ghp_test_token_123';
        mockSecrets.get.mockResolvedValue(expectedToken);

        // Act
        const result = await configService.getAuthToken();

        // Assert
        expect(result).toBe(expectedToken);
        expect(mockSecrets.get).toHaveBeenCalledWith('githubToken');
      });

      it('should return null when no token is stored', async () => {
        // Arrange
        mockSecrets.get.mockResolvedValue(undefined);

        // Act
        const result = await configService.getAuthToken();

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when empty token is stored', async () => {
        // Arrange
        mockSecrets.get.mockResolvedValue('');

        // Act
        const result = await configService.getAuthToken();

        // Assert
        expect(result).toBeNull();
      });

      it('should handle secrets storage errors', async () => {
        // Arrange
        const error = new Error('Secrets storage error');
        mockSecrets.get.mockRejectedValue(error);

        // Act & Assert
        await expect(configService.getAuthToken()).rejects.toThrow('Secrets storage error');
      });
    });

    describe('setAuthToken', () => {
      it('should store token in secure storage', async () => {
        // Arrange
        const token = 'ghp_new_token_456';
        mockSecrets.store.mockResolvedValue(undefined);

        // Act
        await configService.setAuthToken(token);

        // Assert
        expect(mockSecrets.store).toHaveBeenCalledWith('githubToken', token);
      });

      it('should handle token storage errors', async () => {
        // Arrange
        const token = 'ghp_test_token';
        const error = new Error('Token storage failed');
        mockSecrets.store.mockRejectedValue(error);

        // Act & Assert
        await expect(configService.setAuthToken(token)).rejects.toThrow('Token storage failed');
      });
    });

    describe('clearAuthToken', () => {
      it('should delete token from secure storage', async () => {
        // Arrange
        mockSecrets.delete.mockResolvedValue(undefined);

        // Act
        await configService.clearAuthToken();

        // Assert
        expect(mockSecrets.delete).toHaveBeenCalledWith('githubToken');
      });

      it('should handle token deletion errors', async () => {
        // Arrange
        const error = new Error('Token deletion failed');
        mockSecrets.delete.mockRejectedValue(error);

        // Act & Assert
        await expect(configService.clearAuthToken()).rejects.toThrow('Token deletion failed');
      });
    });
  });

  describe('Local Templates Path', () => {
    describe('getLocalTemplatesPath', () => {
      it('should return local templates path when configured', () => {
        // Arrange
        const templatesPath = '/home/user/templates';
        mockConfig.get.mockReturnValue(templatesPath);

        // Act
        const result = configService.getLocalTemplatesPath();

        // Assert
        expect(result).toBe(templatesPath);
        expect(mockConfig.get).toHaveBeenCalledWith('templatesPath');
      });

      it('should return null when no path is configured', () => {
        // Arrange
        mockConfig.get.mockReturnValue(undefined);

        // Act
        const result = configService.getLocalTemplatesPath();

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when path is empty string', () => {
        // Arrange
        mockConfig.get.mockReturnValue('');

        // Act
        const result = configService.getLocalTemplatesPath();

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when path is only whitespace', () => {
        // Arrange
        mockConfig.get.mockReturnValue('   \t\n   ');

        // Act
        const result = configService.getLocalTemplatesPath();

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when path is not a string', () => {
        // Arrange
        mockConfig.get.mockReturnValue(123); // Invalid type

        // Act
        const result = configService.getLocalTemplatesPath();

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('clearLocalTemplatesPath', () => {
      it('should clear local templates path with workspace target', async () => {
        // Arrange
        (vscode.workspace as any).workspaceFolders = [{ name: 'test' }];
        mockConfig.update.mockResolvedValue(undefined);

        // Act
        await configService.clearLocalTemplatesPath();

        // Assert
        expect(mockConfig.update).toHaveBeenCalledWith(
          'templatesPath',
          undefined,
          vscode.ConfigurationTarget.Workspace
        );
      });

      it('should clear local templates path with global target when no workspace', async () => {
        // Arrange
        (vscode.workspace as any).workspaceFolders = undefined;
        mockConfig.update.mockResolvedValue(undefined);

        // Act
        await configService.clearLocalTemplatesPath();

        // Assert
        expect(mockConfig.update).toHaveBeenCalledWith(
          'templatesPath',
          undefined,
          vscode.ConfigurationTarget.Global
        );
      });
    });
  });

  describe('Configuration Source Priority', () => {
    describe('getConfigurationSource', () => {
      it('should return github when repository is configured', () => {
        // Arrange
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'repository') {
            return { owner: 'test', repo: 'test' };
          }
          return undefined;
        });

        // Act
        const result = configService.getConfigurationSource();

        // Assert
        expect(result).toBe('github');
      });

      it('should return local when only local path is configured', () => {
        // Arrange
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'repository') {
            return undefined;
          }
          if (key === 'templatesPath') {
            return '/local/templates';
          }
          return undefined;
        });

        // Act
        const result = configService.getConfigurationSource();

        // Assert
        expect(result).toBe('local');
      });

      it('should return none when no configuration exists', () => {
        // Arrange
        mockConfig.get.mockReturnValue(undefined);

        // Act
        const result = configService.getConfigurationSource();

        // Assert
        expect(result).toBe('none');
      });

      it('should prioritize github over local when both are configured', () => {
        // Arrange
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'repository') {
            return { owner: 'test', repo: 'test' };
          }
          if (key === 'templatesPath') {
            return '/local/templates';
          }
          return undefined;
        });

        // Act
        const result = configService.getConfigurationSource();

        // Assert
        expect(result).toBe('github');
      });
    });
  });

  describe('Configuration Inspection', () => {
    describe('getConfigurationInspection', () => {
      it('should detect workspace configuration', () => {
        // Arrange
        mockConfig.inspect.mockReturnValue({
          workspaceValue: { owner: 'workspace', repo: 'test' },
          globalValue: undefined
        });

        // Act
        const result = configService.getConfigurationInspection();

        // Assert
        expect(result).toEqual({
          hasWorkspaceConfig: true,
          hasUserConfig: false,
          activeSource: 'workspace'
        });
      });

      it('should detect user configuration', () => {
        // Arrange
        mockConfig.inspect.mockReturnValue({
          workspaceValue: undefined,
          globalValue: { owner: 'user', repo: 'test' }
        });

        // Act
        const result = configService.getConfigurationInspection();

        // Assert
        expect(result).toEqual({
          hasWorkspaceConfig: false,
          hasUserConfig: true,
          activeSource: 'user'
        });
      });

      it('should prioritize workspace over user configuration', () => {
        // Arrange
        mockConfig.inspect.mockReturnValue({
          workspaceValue: { owner: 'workspace', repo: 'test' },
          globalValue: { owner: 'user', repo: 'test' }
        });

        // Act
        const result = configService.getConfigurationInspection();

        // Assert
        expect(result).toEqual({
          hasWorkspaceConfig: true,
          hasUserConfig: true,
          activeSource: 'workspace'
        });
      });

      it('should detect no configuration', () => {
        // Arrange
        mockConfig.inspect.mockReturnValue({
          workspaceValue: undefined,
          globalValue: undefined
        });

        // Act
        const result = configService.getConfigurationInspection();

        // Assert
        expect(result).toEqual({
          hasWorkspaceConfig: false,
          hasUserConfig: false,
          activeSource: 'none'
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle VS Code configuration API errors gracefully', () => {
      // Arrange
      const error = new Error('VS Code API error');
      (vscode.workspace.getConfiguration as MockedFunction<any>).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => configService.getRepositoryConfig()).toThrow('VS Code API error');
    });

    it('should handle malformed repository configuration', () => {
      // Arrange
      mockConfig.get.mockReturnValue({
        owner: null,
        repo: '',
        path: 123, // Invalid type
        branch: []  // Invalid type
      });

      // Act
      const result = configService.getRepositoryConfig();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle concurrent configuration updates', async () => {
      // Arrange
      const config1: RepositoryConfig = { owner: 'owner1', repo: 'repo1' };
      const config2: RepositoryConfig = { owner: 'owner2', repo: 'repo2' };
      
      mockConfig.update.mockResolvedValue(undefined);

      // Act
      const promises = [
        configService.setRepositoryConfig(config1),
        configService.setRepositoryConfig(config2)
      ];
      
      await Promise.all(promises);

      // Assert
      expect(mockConfig.update).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent token operations', async () => {
      // Arrange
      const token = 'test_token';
      mockSecrets.store.mockResolvedValue(undefined);
      mockSecrets.delete.mockResolvedValue(undefined);

      // Act
      const promises = [
        configService.setAuthToken(token),
        configService.clearAuthToken()
      ];
      
      await Promise.all(promises);

      // Assert
      expect(mockSecrets.store).toHaveBeenCalledWith('githubToken', token);
      expect(mockSecrets.delete).toHaveBeenCalledWith('githubToken');
    });
  });
});
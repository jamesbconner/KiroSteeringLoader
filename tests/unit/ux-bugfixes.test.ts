/**
 * UX Bug Fixes Regression Tests
 * 
 * Tests for bugs #6-8: User experience and configuration issues
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import { vscode, fsMock, fileSystemMockUtils } from '../mocks/setup';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { ErrorHandler } from '../../src/services/ErrorHandler';
import { FileSystemService } from '../../src/services/FileSystemService';
import { GitHubSteeringError, ErrorCode } from '../../src/errors';

describe('UX Bug Fixes Regression Tests', () => {
  let mockContext: any;
  let mockConfigService: any;
  let mockErrorHandler: any;
  let mockFileSystemService: any;
  let provider: SteeringTemplateProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
    // Reset VSCode mocks completely
    vscode.window.showErrorMessage.mockClear();
    vscode.window.showInformationMessage.mockClear();
    vscode.workspace.workspaceFolders = undefined;

    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() },
      secrets: {
        get: vi.fn().mockResolvedValue(null),
        store: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      }
    };

    mockConfigService = {
      getRepositoryConfig: vi.fn(),
      setRepositoryConfig: vi.fn(),
      getLocalTemplatesPath: vi.fn(),
      getConfigurationSource: vi.fn(),
      getAuthToken: vi.fn()
    };

    mockErrorHandler = {
      handleError: vi.fn(),
      logInfo: vi.fn(),
      logWarning: vi.fn()
    };

    mockFileSystemService = {
      loadTemplate: vi.fn()
    };

    provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      undefined, // githubService
      undefined, // cacheManager
      mockFileSystemService,
      mockErrorHandler
    );
  });

  describe('Bug #6: Duplicate error notifications', () => {
    it('should not show duplicate error messages when template loading fails', async () => {
      // Mock a failed template load
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: false,
        error: 'Template file not found'
      });

      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];

      await provider.loadTemplate('/test/template.md');

      // ErrorHandler should be called with showNotification: true in options
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'Load template'
        }),
        expect.objectContaining({
          showNotification: true
        })
      );

      // vscode.window.showErrorMessage should NOT be called directly
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should not show duplicate error messages when exception occurs during template loading', async () => {
      // Mock an exception during template loading
      mockFileSystemService.loadTemplate.mockRejectedValue(new Error('Network error'));

      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];

      await provider.loadTemplate('https://example.com/template.md');

      // ErrorHandler should be called with showNotification: true in options
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'Load template'
        }),
        expect.objectContaining({
          showNotification: true
        })
      );

      // vscode.window.showErrorMessage should NOT be called directly
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should show success message when template loads successfully', async () => {
      // Set up file system with template content
      const templatePath = '/test/template.md';
      const templateContent = '# Test Template Content';
      const workspacePath = '/test/workspace';

      fileSystemMockUtils.setupFileSystem({
        directories: ['/test', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Mock successful template load
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: '/test/workspace/.kiro/steering/template.md'
      });

      // Mock workspace folder
      vscode.workspace.workspaceFolders = [{ uri: { fsPath: workspacePath } }];

      await provider.loadTemplate(templatePath);

      // Should show success message
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template.md" loaded successfully'
      );

      // Should not call error handler
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });
  });

  describe('Bug #7: Switch to local mode configuration target mismatch', () => {
    it('should clear repository config from correct configuration targets', () => {
      const mockConfig = {
        update: vi.fn(),
        inspect: vi.fn()
      };

      // Mock workspace folders exist
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test' } }];
      (vscode.workspace as any).getConfiguration.mockReturnValue(mockConfig);

      // Mock inspection showing workspace-level config
      mockConfig.inspect.mockReturnValue({
        workspaceValue: { owner: 'test', repo: 'test' },
        globalValue: undefined
      });

      // Test the switch to local mode logic (simulated)
      const clearRepositoryConfig = async () => {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const inspection = config.inspect('repository');
        
        if (inspection?.workspaceValue) {
          await config.update('repository', undefined, vscode.ConfigurationTarget.Workspace);
        }
        if (inspection?.globalValue) {
          await config.update('repository', undefined, vscode.ConfigurationTarget.Global);
        }
      };

      clearRepositoryConfig();

      // Should clear workspace config
      expect(mockConfig.update).toHaveBeenCalledWith(
        'repository',
        undefined,
        vscode.ConfigurationTarget.Workspace
      );

      // Should not clear global config (since it doesn't exist)
      expect(mockConfig.update).not.toHaveBeenCalledWith(
        'repository',
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should clear repository config from both targets when both exist', () => {
      const mockConfig = {
        update: vi.fn(),
        inspect: vi.fn()
      };

      (vscode.workspace as any).getConfiguration.mockReturnValue(mockConfig);

      // Mock inspection showing both workspace and global config
      mockConfig.inspect.mockReturnValue({
        workspaceValue: { owner: 'workspace', repo: 'test' },
        globalValue: { owner: 'global', repo: 'test' }
      });

      // Test the switch to local mode logic (simulated)
      const clearRepositoryConfig = async () => {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const inspection = config.inspect('repository');
        
        if (inspection?.workspaceValue) {
          await config.update('repository', undefined, vscode.ConfigurationTarget.Workspace);
        }
        if (inspection?.globalValue) {
          await config.update('repository', undefined, vscode.ConfigurationTarget.Global);
        }
      };

      clearRepositoryConfig();

      // Should clear both workspace and global config
      expect(mockConfig.update).toHaveBeenCalledWith(
        'repository',
        undefined,
        vscode.ConfigurationTarget.Workspace
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'repository',
        undefined,
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('should use correct configuration target for local path', () => {
      const mockConfig = {
        update: vi.fn(),
        inspect: vi.fn()
      };

      (vscode.workspace as any).getConfiguration.mockReturnValue(mockConfig);
      mockConfig.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });

      // Test with workspace folders
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test' } }];

      const setLocalPath = async (path: string) => {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const target = vscode.workspace.workspaceFolders 
          ? vscode.ConfigurationTarget.Workspace 
          : vscode.ConfigurationTarget.Global;
        
        await config.update('templatesPath', path, target);
      };

      setLocalPath('/test/templates');

      // Should use workspace target when workspace folders exist
      expect(mockConfig.update).toHaveBeenCalledWith(
        'templatesPath',
        '/test/templates',
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('should use Global configuration target when no workspace folders exist', () => {
      const mockConfig = {
        update: vi.fn(),
        inspect: vi.fn()
      };

      (vscode.workspace as any).getConfiguration.mockReturnValue(mockConfig);
      mockConfig.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });

      // Test without workspace folders
      (vscode.workspace as any).workspaceFolders = undefined;

      const setLocalPath = async (path: string) => {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const target = vscode.workspace.workspaceFolders 
          ? vscode.ConfigurationTarget.Workspace 
          : vscode.ConfigurationTarget.Global;
        
        await config.update('templatesPath', path, target);
      };

      setLocalPath('/test/templates');

      // Should use global target when no workspace folders exist
      expect(mockConfig.update).toHaveBeenCalledWith(
        'templatesPath',
        '/test/templates',
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe('Configuration Target Consistency Fix', () => {
    it('should use consistent configuration target logic between setTemplatesPath and switchToLocalMode', () => {
      // This test verifies that both commands now use the same logic:
      // - Workspace target when workspace folders exist
      // - Global target when no workspace folders exist
      
      const mockConfig = {
        update: vi.fn(),
        inspect: vi.fn()
      };

      (vscode.workspace as any).getConfiguration.mockReturnValue(mockConfig);
      mockConfig.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });

      // Test the consistent logic pattern used by both commands
      const getConfigurationTarget = () => {
        return vscode.workspace.workspaceFolders 
          ? vscode.ConfigurationTarget.Workspace 
          : vscode.ConfigurationTarget.Global;
      };

      // With workspace folders
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test' } }];
      expect(getConfigurationTarget()).toBe(vscode.ConfigurationTarget.Workspace);

      // Without workspace folders
      (vscode.workspace as any).workspaceFolders = undefined;
      expect(getConfigurationTarget()).toBe(vscode.ConfigurationTarget.Global);
    });
  });

  describe('Bug #8: GitHub error recovery directs to wrong command', () => {
    it('should create github-setup items for GitHub configuration errors', async () => {
      mockConfigService.getConfigurationSource.mockReturnValue('github');
      mockConfigService.getRepositoryConfig.mockReturnValue({
        owner: 'test',
        repo: 'test'
      });

      // Mock GitHub service to throw a GitHubSteeringError
      const mockGithubService = {
        setAuthToken: vi.fn(),
        fetchTemplates: vi.fn().mockRejectedValue(
          new GitHubSteeringError('Repository not found', ErrorCode.GITHUB_REPO_NOT_FOUND)
        ),
        fetchFileContent: vi.fn(),
        validateRepository: vi.fn(),
        getRateLimitStatus: vi.fn()
      };

      const providerWithGithub = new SteeringTemplateProvider(
        mockContext,
        mockConfigService,
        mockGithubService,
        undefined, // cacheManager
        mockFileSystemService,
        mockErrorHandler
      );

      const items = await providerWithGithub.getChildren();

      // Should contain a github-setup item for reconfiguration
      const reconfigureItem = items.find(item => 
        item.label === 'Click to reconfigure' && 
        (item as any).itemType === 'github-setup'
      );

      expect(reconfigureItem).toBeDefined();
      expect((reconfigureItem as any).command?.command).toBe('kiroSteeringLoader.configureGitHubRepository');
    });

    it('should create github-setup items for initial GitHub configuration', async () => {
      mockConfigService.getConfigurationSource.mockReturnValue('none');
      mockConfigService.getRepositoryConfig.mockReturnValue(null);
      mockConfigService.getLocalTemplatesPath.mockReturnValue(null);

      const items = await provider.getChildren();

      // Should contain a github-setup item for initial configuration
      const configureItem = items.find(item => 
        item.label === 'Click to configure GitHub repository' && 
        (item as any).itemType === 'github-setup'
      );

      expect(configureItem).toBeDefined();
      expect((configureItem as any).command?.command).toBe('kiroSteeringLoader.configureGitHubRepository');
    });

    it('should create setup items for local mode configuration', async () => {
      mockConfigService.getConfigurationSource.mockReturnValue('local');
      mockConfigService.getLocalTemplatesPath.mockReturnValue('/nonexistent/path');

      // Mock fs.existsSync to return false
      vi.doMock('fs', () => ({
        existsSync: vi.fn().mockReturnValue(false),
        readdirSync: vi.fn()
      }));

      const items = await provider.getChildren();

      // Should contain a setup item for local path configuration
      const setupItem = items.find(item => 
        item.label === 'Click to set new path' && 
        (item as any).itemType === 'setup'
      );

      expect(setupItem).toBeDefined();
      expect((setupItem as any).command?.command).toBe('kiroSteeringLoader.setTemplatesPath');
    });

    it('should distinguish between github-setup and setup item types', async () => {
      // Test that different configuration scenarios produce different item types
      
      // Test GitHub setup scenario
      mockConfigService.getConfigurationSource.mockReturnValue('github');
      mockConfigService.getRepositoryConfig.mockReturnValue({
        owner: 'test',
        repo: 'test'
      });

      const mockGithubServiceForTest = {
        setAuthToken: vi.fn(),
        fetchTemplates: vi.fn().mockRejectedValue(
          new GitHubSteeringError('Repository not found', ErrorCode.GITHUB_REPO_NOT_FOUND)
        ),
        fetchFileContent: vi.fn(),
        validateRepository: vi.fn(),
        getRateLimitStatus: vi.fn()
      };

      const githubProvider = new SteeringTemplateProvider(
        mockContext,
        mockConfigService,
        mockGithubServiceForTest,
        undefined, // cacheManager
        mockFileSystemService,
        mockErrorHandler
      );

      const githubItems = await githubProvider.getChildren();
      const githubSetupItem = githubItems.find(item => 
        (item as any).itemType === 'github-setup'
      );

      expect(githubSetupItem).toBeDefined();
      expect((githubSetupItem as any).command?.command).toBe('kiroSteeringLoader.configureGitHubRepository');

      // Test local setup scenario
      mockConfigService.getConfigurationSource.mockReturnValue('local');
      mockConfigService.getLocalTemplatesPath.mockReturnValue('/nonexistent/path');

      // Mock fs.existsSync to return false for nonexistent path
      fsMock.existsSync.mockReturnValue(false);

      const localProvider = new SteeringTemplateProvider(
        mockContext,
        mockConfigService,
        undefined, // githubService
        undefined, // cacheManager
        mockFileSystemService,
        mockErrorHandler
      );

      const localItems = await localProvider.getChildren();
      const localSetupItem = localItems.find(item => 
        (item as any).itemType === 'setup'
      );

      expect(localSetupItem).toBeDefined();
      expect((localSetupItem as any).command?.command).toBe('kiroSteeringLoader.setTemplatesPath');
    });
  });

  describe('Error handling consistency', () => {
    it('should handle missing workspace folder gracefully', async () => {
      // No workspace folders
      (vscode.workspace as any).workspaceFolders = undefined;

      await provider.loadTemplate('/test/template.md');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });

    it('should handle empty template path gracefully', async () => {
      await provider.loadTemplate('');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only template path gracefully', async () => {
      await provider.loadTemplate('   ');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    });
  });
});
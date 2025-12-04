/**
 * Integration tests for GitHub-enabled SteeringTemplateProvider
 * Tests GitHub mode template fetching, local mode fallback, configuration source display, and error states
 * Requirements: 1.5, 8.1, 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { GitHubRepositoryService } from '../../src/services/GitHubRepositoryService';
import { CacheManager } from '../../src/services/CacheManager';
import { FileSystemService } from '../../src/services/FileSystemService';
import { TemplateMetadata } from '../../src/types';

describe('GitHub Tree Provider Integration Tests', () => {
  let mockContext: any;
  let mockConfigService: ConfigurationService;
  let mockGitHubService: GitHubRepositoryService;
  let mockCacheManager: CacheManager;
  let mockFileSystemService: FileSystemService;

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

    // Create mock services
    mockConfigService = {
      getRepositoryConfig: vi.fn(),
      getConfigurationSource: vi.fn(),
      getLocalTemplatesPath: vi.fn(),
      getAuthToken: vi.fn()
    } as any;

    mockGitHubService = {
      fetchTemplates: vi.fn(),
      fetchFileContent: vi.fn(),
      setAuthToken: vi.fn()
    } as any;

    mockCacheManager = {
      getCachedTemplates: vi.fn(),
      setCachedTemplates: vi.fn(),
      isCacheFresh: vi.fn(),
      invalidateCache: vi.fn()
    } as any;

    mockFileSystemService = {
      loadTemplate: vi.fn()
    } as any;
  });

  /**
   * Test GitHub mode template fetching
   * Validates: Requirements 1.5, 8.1
   */
  it('should fetch templates from GitHub when configured', async () => {
    // Arrange
    const mockTemplates: TemplateMetadata[] = [
      {
        name: 'template1',
        filename: 'template1.md',
        path: 'template1.md',
        sha: 'abc123',
        size: 1000,
        downloadUrl: 'https://example.com/template1.md',
        type: 'file'
      }
    ];

    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('github');
    vi.mocked(mockConfigService.getRepositoryConfig).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    });
    vi.mocked(mockConfigService.getAuthToken).mockResolvedValue(null);
    vi.mocked(mockCacheManager.getCachedTemplates).mockReturnValue(null);
    vi.mocked(mockCacheManager.isCacheFresh).mockReturnValue(false);
    vi.mocked(mockGitHubService.fetchTemplates).mockResolvedValue(mockTemplates);

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    const children = await provider.getChildren();

    // Assert
    expect(mockGitHubService.fetchTemplates).toHaveBeenCalledWith('test-owner', 'test-repo', undefined);
    expect(mockCacheManager.setCachedTemplates).toHaveBeenCalled();
    expect(children.length).toBeGreaterThan(0);
  });

  /**
   * Test local mode fallback
   * Validates: Requirements 8.1
   */
  it('should fall back to local filesystem when GitHub not configured', async () => {
    // Arrange
    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('local');
    vi.mocked(mockConfigService.getLocalTemplatesPath).mockReturnValue(null);

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    const children = await provider.getChildren();

    // Assert
    expect(mockGitHubService.fetchTemplates).not.toHaveBeenCalled();
    expect(children.length).toBeGreaterThan(0);
    // Should show error about local path not configured
    expect(children.some(c => c.itemType === 'error')).toBe(true);
  });

  /**
   * Test configuration source display
   * Validates: Requirements 8.4
   */
  it('should display configuration source indicator', async () => {
    // Arrange
    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('github');
    vi.mocked(mockConfigService.getRepositoryConfig).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo',
      path: 'templates'
    });
    vi.mocked(mockConfigService.getAuthToken).mockResolvedValue(null);
    vi.mocked(mockCacheManager.getCachedTemplates).mockReturnValue([]);
    vi.mocked(mockCacheManager.isCacheFresh).mockReturnValue(true);

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    const children = await provider.getChildren();

    // Assert
    expect(children.length).toBeGreaterThan(0);
    const sourceIndicator = children[0];
    expect(sourceIndicator.itemType).toBe('info');
    expect(sourceIndicator.label).toContain('GitHub');
    expect(sourceIndicator.label).toContain('test-owner/test-repo');
  });

  /**
   * Test error state rendering
   * Validates: Requirements 8.1
   */
  it('should display error state when GitHub fetch fails', async () => {
    // Arrange
    const { GitHubSteeringError, ErrorCode } = await import('../../src/errors');
    
    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('github');
    vi.mocked(mockConfigService.getRepositoryConfig).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    });
    vi.mocked(mockConfigService.getAuthToken).mockResolvedValue(null);
    vi.mocked(mockCacheManager.getCachedTemplates).mockReturnValue(null);
    vi.mocked(mockCacheManager.isCacheFresh).mockReturnValue(false);
    vi.mocked(mockGitHubService.fetchTemplates).mockRejectedValue(
      new GitHubSteeringError('Network error', ErrorCode.NETWORK_ERROR, undefined, 'Network error occurred')
    );

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    const children = await provider.getChildren();

    // Assert
    expect(children.some(c => c.itemType === 'error')).toBe(true);
  });

  /**
   * Test cache usage
   * Validates: Requirements 1.5
   */
  it('should use cached templates when available and fresh', async () => {
    // Arrange
    const cachedTemplates: TemplateMetadata[] = [
      {
        name: 'cached-template',
        filename: 'cached-template.md',
        path: 'cached-template.md',
        sha: 'xyz789',
        size: 500,
        downloadUrl: 'https://example.com/cached.md',
        type: 'file'
      }
    ];

    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('github');
    vi.mocked(mockConfigService.getRepositoryConfig).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    });
    vi.mocked(mockConfigService.getAuthToken).mockResolvedValue(null);
    vi.mocked(mockCacheManager.getCachedTemplates).mockReturnValue(cachedTemplates);
    vi.mocked(mockCacheManager.isCacheFresh).mockReturnValue(true);

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    const children = await provider.getChildren();

    // Assert
    expect(mockGitHubService.fetchTemplates).not.toHaveBeenCalled();
    expect(children.length).toBeGreaterThan(0);
  });

  /**
   * Test force refresh bypasses cache
   * Validates: Requirements 1.5
   */
  it('should bypass cache on force refresh', async () => {
    // Arrange
    vi.mocked(mockConfigService.getConfigurationSource).mockReturnValue('github');
    vi.mocked(mockConfigService.getRepositoryConfig).mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    });

    const provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService
    );

    // Act
    provider.refresh(true);

    // Assert
    expect(mockCacheManager.invalidateCache).toHaveBeenCalled();
  });
});

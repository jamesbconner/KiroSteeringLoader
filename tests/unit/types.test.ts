/**
 * Unit tests for type definitions and interface validation
 * Tests type safety, interface contracts, and type guards
 * Requirements: Type Safety, Interface Contracts
 */

import { describe, it, expect } from 'vitest';
import {
  RepositoryConfig,
  TemplateMetadata,
  CacheEntry,
  ValidationResult,
  RateLimitInfo,
  LoadResult,
  OverwriteChoice,
  ConfigSource,
  EnhancedTemplateItem,
  GitHubContent,
  GitHubRateLimit
} from '../../src/types';

describe('Type Definitions and Interface Validation', () => {
  describe('RepositoryConfig Interface', () => {
    it('should accept valid repository configuration with required fields', () => {
      const config: RepositoryConfig = {
        owner: 'test-owner',
        repo: 'test-repo'
      };

      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test-repo');
      expect(config.path).toBeUndefined();
      expect(config.branch).toBeUndefined();
    });

    it('should accept repository configuration with optional fields', () => {
      const config: RepositoryConfig = {
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'templates',
        branch: 'develop'
      };

      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test-repo');
      expect(config.path).toBe('templates');
      expect(config.branch).toBe('develop');
    });

    it('should handle empty string values for optional fields', () => {
      const config: RepositoryConfig = {
        owner: 'test-owner',
        repo: 'test-repo',
        path: '',
        branch: ''
      };

      expect(config.path).toBe('');
      expect(config.branch).toBe('');
    });
  });

  describe('TemplateMetadata Interface', () => {
    it('should accept valid template metadata', () => {
      const metadata: TemplateMetadata = {
        name: 'example-template',
        filename: 'example-template.md',
        path: 'templates/example-template.md',
        sha: 'abc123def456',
        size: 1024,
        downloadUrl: 'https://raw.githubusercontent.com/owner/repo/main/template.md',
        type: 'file'
      };

      expect(metadata.name).toBe('example-template');
      expect(metadata.filename).toBe('example-template.md');
      expect(metadata.path).toBe('templates/example-template.md');
      expect(metadata.sha).toBe('abc123def456');
      expect(metadata.size).toBe(1024);
      expect(metadata.downloadUrl).toContain('raw.githubusercontent.com');
      expect(metadata.type).toBe('file');
    });

    it('should accept directory type metadata', () => {
      const metadata: TemplateMetadata = {
        name: 'subdirectory',
        filename: 'subdirectory',
        path: 'templates/subdirectory',
        sha: 'dir123sha456',
        size: 0,
        downloadUrl: '',
        type: 'dir'
      };

      expect(metadata.type).toBe('dir');
      expect(metadata.size).toBe(0);
    });
  });

  describe('CacheEntry Interface', () => {
    it('should accept valid cache entry', () => {
      const templates: TemplateMetadata[] = [
        {
          name: 'template1',
          filename: 'template1.md',
          path: 'template1.md',
          sha: 'sha1',
          size: 100,
          downloadUrl: 'url1',
          type: 'file'
        }
      ];

      const cacheEntry: CacheEntry = {
        templates,
        timestamp: Date.now(),
        sha: 'tree-sha-123'
      };

      expect(cacheEntry.templates).toHaveLength(1);
      expect(cacheEntry.timestamp).toBeGreaterThan(0);
      expect(cacheEntry.sha).toBe('tree-sha-123');
    });

    it('should accept empty templates array', () => {
      const cacheEntry: CacheEntry = {
        templates: [],
        timestamp: Date.now(),
        sha: 'empty-tree-sha'
      };

      expect(cacheEntry.templates).toHaveLength(0);
      expect(Array.isArray(cacheEntry.templates)).toBe(true);
    });
  });

  describe('ValidationResult Interface', () => {
    it('should accept valid validation result', () => {
      const result: ValidationResult = {
        valid: true
      };

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.statusCode).toBeUndefined();
    });

    it('should accept invalid validation result with error', () => {
      const result: ValidationResult = {
        valid: false,
        error: 'Repository not found',
        statusCode: 404
      };

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Repository not found');
      expect(result.statusCode).toBe(404);
    });
  });

  describe('RateLimitInfo Interface', () => {
    it('should accept rate limit information', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 5000,
        remaining: 4999,
        reset: new Date('2024-01-01T12:00:00Z'),
        authenticated: true
      };

      expect(rateLimitInfo.limit).toBe(5000);
      expect(rateLimitInfo.remaining).toBe(4999);
      expect(rateLimitInfo.reset).toBeInstanceOf(Date);
      expect(rateLimitInfo.authenticated).toBe(true);
    });

    it('should accept unauthenticated rate limit info', () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 60,
        remaining: 59,
        reset: new Date(),
        authenticated: false
      };

      expect(rateLimitInfo.limit).toBe(60);
      expect(rateLimitInfo.authenticated).toBe(false);
    });
  });

  describe('LoadResult Interface', () => {
    it('should accept successful load result', () => {
      const result: LoadResult = {
        success: true,
        filepath: '/workspace/.kiro/steering/template.md'
      };

      expect(result.success).toBe(true);
      expect(result.filepath).toContain('.kiro/steering');
      expect(result.error).toBeUndefined();
    });

    it('should accept failed load result', () => {
      const result: LoadResult = {
        success: false,
        error: 'File not found'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(result.filepath).toBeUndefined();
    });
  });

  describe('OverwriteChoice Type', () => {
    it('should accept valid overwrite choices', () => {
      const overwrite: OverwriteChoice = 'overwrite';
      const cancel: OverwriteChoice = 'cancel';

      expect(overwrite).toBe('overwrite');
      expect(cancel).toBe('cancel');
    });

    it('should be usable in conditional logic', () => {
      // Test function that handles OverwriteChoice
      const handleChoice = (choice: OverwriteChoice): { shouldOverwrite: boolean; shouldCancel: boolean } => {
        return {
          shouldOverwrite: choice === 'overwrite',
          shouldCancel: choice === 'cancel'
        };
      };

      // Test with 'overwrite' choice
      const overwriteResult = handleChoice('overwrite');
      expect(overwriteResult.shouldOverwrite).toBe(true);
      expect(overwriteResult.shouldCancel).toBe(false);

      // Test with 'cancel' choice
      const cancelResult = handleChoice('cancel');
      expect(cancelResult.shouldCancel).toBe(true);
      expect(cancelResult.shouldOverwrite).toBe(false);
    });
  });

  describe('ConfigSource Type', () => {
    it('should accept valid configuration sources', () => {
      const github: ConfigSource = 'github';
      const local: ConfigSource = 'local';
      const none: ConfigSource = 'none';

      expect(github).toBe('github');
      expect(local).toBe('local');
      expect(none).toBe('none');
    });

    it('should be usable for configuration priority logic', () => {
      const sources: ConfigSource[] = ['github', 'local', 'none'];
      
      expect(sources).toHaveLength(3);
      expect(sources.includes('github')).toBe(true);
      expect(sources.includes('invalid' as ConfigSource)).toBe(false);
    });
  });

  describe('EnhancedTemplateItem Interface', () => {
    it('should accept template item without metadata', () => {
      const item: EnhancedTemplateItem = {
        label: 'Setup Required',
        type: 'setup',
        collapsibleState: 0
      };

      expect(item.label).toBe('Setup Required');
      expect(item.type).toBe('setup');
      expect(item.collapsibleState).toBe(0);
      expect(item.metadata).toBeUndefined();
      expect(item.children).toBeUndefined();
    });

    it('should accept template item with metadata', () => {
      const metadata: TemplateMetadata = {
        name: 'test',
        filename: 'test.md',
        path: 'test.md',
        sha: 'sha',
        size: 100,
        downloadUrl: 'url',
        type: 'file'
      };

      const item: EnhancedTemplateItem = {
        label: 'Test Template',
        type: 'template',
        metadata,
        collapsibleState: 0
      };

      expect(item.metadata).toBeDefined();
      expect(item.metadata?.name).toBe('test');
    });

    it('should accept directory item with children', () => {
      const child: EnhancedTemplateItem = {
        label: 'Child Template',
        type: 'template',
        collapsibleState: 0
      };

      const item: EnhancedTemplateItem = {
        label: 'Directory',
        type: 'directory',
        children: [child],
        collapsibleState: 1
      };

      expect(item.children).toHaveLength(1);
      expect(item.children?.[0].label).toBe('Child Template');
    });
  });

  describe('GitHubContent Interface', () => {
    it('should accept GitHub API file content response', () => {
      const content: GitHubContent = {
        name: 'template.md',
        path: 'templates/template.md',
        sha: 'file-sha-123',
        size: 1024,
        url: 'https://api.github.com/repos/owner/repo/contents/template.md',
        html_url: 'https://github.com/owner/repo/blob/main/template.md',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/file-sha-123',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/template.md',
        type: 'file',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/template.md',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/file-sha-123',
          html: 'https://github.com/owner/repo/blob/main/template.md'
        }
      };

      expect(content.name).toBe('template.md');
      expect(content.type).toBe('file');
      expect(content.download_url).toContain('raw.githubusercontent.com');
      expect(content._links.self).toContain('api.github.com');
    });

    it('should accept GitHub API directory content response', () => {
      const content: GitHubContent = {
        name: 'subdirectory',
        path: 'templates/subdirectory',
        sha: 'dir-sha-456',
        size: 0,
        url: 'https://api.github.com/repos/owner/repo/contents/subdirectory',
        html_url: 'https://github.com/owner/repo/tree/main/subdirectory',
        git_url: 'https://api.github.com/repos/owner/repo/git/trees/dir-sha-456',
        download_url: null,
        type: 'dir',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/subdirectory',
          git: 'https://api.github.com/repos/owner/repo/git/trees/dir-sha-456',
          html: 'https://github.com/owner/repo/tree/main/subdirectory'
        }
      };

      expect(content.type).toBe('dir');
      expect(content.download_url).toBeNull();
      expect(content.size).toBe(0);
    });
  });

  describe('GitHubRateLimit Interface', () => {
    it('should accept GitHub rate limit API response', () => {
      const rateLimit: GitHubRateLimit = {
        resources: {
          core: {
            limit: 5000,
            remaining: 4999,
            reset: 1640995200,
            used: 1
          }
        }
      };

      expect(rateLimit.resources.core.limit).toBe(5000);
      expect(rateLimit.resources.core.remaining).toBe(4999);
      expect(rateLimit.resources.core.reset).toBe(1640995200);
      expect(rateLimit.resources.core.used).toBe(1);
    });

    it('should handle exhausted rate limit', () => {
      const rateLimit: GitHubRateLimit = {
        resources: {
          core: {
            limit: 60,
            remaining: 0,
            reset: 1640995200,
            used: 60
          }
        }
      };

      expect(rateLimit.resources.core.remaining).toBe(0);
      expect(rateLimit.resources.core.used).toBe(60);
    });
  });

  describe('Type Compatibility and Interoperability', () => {
    it('should convert GitHubContent to TemplateMetadata', () => {
      const githubContent: GitHubContent = {
        name: 'example.md',
        path: 'templates/example.md',
        sha: 'content-sha',
        size: 512,
        url: 'api-url',
        html_url: 'html-url',
        git_url: 'git-url',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/example.md',
        type: 'file',
        _links: {
          self: 'self-url',
          git: 'git-url',
          html: 'html-url'
        }
      };

      // Simulate conversion logic
      const templateMetadata: TemplateMetadata = {
        name: githubContent.name.replace('.md', ''),
        filename: githubContent.name,
        path: githubContent.path,
        sha: githubContent.sha,
        size: githubContent.size,
        downloadUrl: githubContent.download_url || '',
        type: githubContent.type
      };

      expect(templateMetadata.name).toBe('example');
      expect(templateMetadata.filename).toBe('example.md');
      expect(templateMetadata.downloadUrl).toBe(githubContent.download_url);
    });

    it('should create EnhancedTemplateItem from TemplateMetadata', () => {
      const metadata: TemplateMetadata = {
        name: 'test-template',
        filename: 'test-template.md',
        path: 'test-template.md',
        sha: 'sha123',
        size: 256,
        downloadUrl: 'download-url',
        type: 'file'
      };

      const enhancedItem: EnhancedTemplateItem = {
        label: metadata.name,
        type: 'template',
        metadata,
        collapsibleState: 0
      };

      expect(enhancedItem.label).toBe(metadata.name);
      expect(enhancedItem.metadata?.filename).toBe('test-template.md');
    });

    it('should handle validation result in error scenarios', () => {
      const validationResult: ValidationResult = {
        valid: false,
        error: 'Authentication failed',
        statusCode: 401
      };

      const loadResult: LoadResult = {
        success: validationResult.valid, // success should match validation result
        error: validationResult.error
      };

      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toBe('Authentication failed');
    });
  });

  describe('Type Guards and Runtime Validation', () => {
    it('should validate RepositoryConfig at runtime', () => {
      const isValidRepositoryConfig = (obj: any): obj is RepositoryConfig => {
        return obj && 
               typeof obj.owner === 'string' && 
               typeof obj.repo === 'string' &&
               (obj.path === undefined || typeof obj.path === 'string') &&
               (obj.branch === undefined || typeof obj.branch === 'string');
      };

      const validConfig = { owner: 'test', repo: 'repo' };
      const invalidConfig = { owner: 'test' }; // missing repo

      expect(isValidRepositoryConfig(validConfig)).toBe(true);
      expect(isValidRepositoryConfig(invalidConfig)).toBe(false);
    });

    it('should validate TemplateMetadata structure', () => {
      const isValidTemplateMetadata = (obj: any): obj is TemplateMetadata => {
        return obj &&
               typeof obj.name === 'string' &&
               typeof obj.filename === 'string' &&
               typeof obj.path === 'string' &&
               typeof obj.sha === 'string' &&
               typeof obj.size === 'number' &&
               typeof obj.downloadUrl === 'string' &&
               (obj.type === 'file' || obj.type === 'dir');
      };

      const validMetadata = {
        name: 'test',
        filename: 'test.md',
        path: 'test.md',
        sha: 'sha',
        size: 100,
        downloadUrl: 'url',
        type: 'file'
      };

      const invalidMetadata = {
        name: 'test',
        // missing required fields
      };

      expect(isValidTemplateMetadata(validMetadata)).toBe(true);
      expect(isValidTemplateMetadata(invalidMetadata)).toBe(false);
    });

    it('should validate ConfigSource values', () => {
      const isValidConfigSource = (value: any): value is ConfigSource => {
        return value === 'github' || value === 'local' || value === 'none';
      };

      expect(isValidConfigSource('github')).toBe(true);
      expect(isValidConfigSource('local')).toBe(true);
      expect(isValidConfigSource('none')).toBe(true);
      expect(isValidConfigSource('invalid')).toBe(false);
      expect(isValidConfigSource(null)).toBe(false);
    });

    it('should validate OverwriteChoice values', () => {
      const isValidOverwriteChoice = (value: any): value is OverwriteChoice => {
        return value === 'overwrite' || value === 'cancel';
      };

      expect(isValidOverwriteChoice('overwrite')).toBe(true);
      expect(isValidOverwriteChoice('cancel')).toBe(true);
      expect(isValidOverwriteChoice('skip')).toBe(false);
      expect(isValidOverwriteChoice(undefined)).toBe(false);
    });
  });
});
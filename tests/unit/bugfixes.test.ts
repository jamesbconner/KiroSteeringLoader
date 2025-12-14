/**
 * Bug fix regression tests
 * 
 * Tests for critical bugs that were fixed to prevent regressions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRepositoryUrl, parseRepositoryUrlStrict } from '../../src/utils/urlValidator';
import { GitHubRepositoryService } from '../../src/services/GitHubRepositoryService';
import { CacheManager } from '../../src/services/CacheManager';
import { GitHubSteeringError } from '../../src/errors';
import type { TemplateMetadata } from '../../src/types';

describe('Bug Fix Regression Tests', () => {
  describe('Bug #1: URL validator throws but caller expects null return', () => {
    it('should return null for invalid URLs instead of throwing', () => {
      // These should all return null, not throw
      expect(parseRepositoryUrl('')).toBeNull();
      expect(parseRepositoryUrl('   ')).toBeNull();
      expect(parseRepositoryUrl('invalid')).toBeNull();
      expect(parseRepositoryUrl('owner')).toBeNull();
      expect(parseRepositoryUrl('owner/')).toBeNull();
      expect(parseRepositoryUrl('/repo')).toBeNull();
      expect(parseRepositoryUrl('owner/repo with spaces')).toBeNull();
      expect(parseRepositoryUrl('owner/-invalid-repo')).toBeNull();
      expect(parseRepositoryUrl('-invalid-owner/repo')).toBeNull();
    });

    it('should return valid config for correct URLs', () => {
      const result1 = parseRepositoryUrl('owner/repo');
      expect(result1).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main'
      });

      const result2 = parseRepositoryUrl('https://github.com/owner/repo');
      expect(result2).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main'
      });

      const result3 = parseRepositoryUrl('owner/repo/path/to/templates');
      expect(result3).toEqual({
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/templates',
        branch: 'main'
      });
    });

    it('should handle .git suffix correctly', () => {
      const result = parseRepositoryUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main'
      });
    });

    it('parseRepositoryUrlStrict should still throw detailed errors', () => {
      expect(() => parseRepositoryUrlStrict('')).toThrow(GitHubSteeringError);
      expect(() => parseRepositoryUrlStrict('invalid')).toThrow(GitHubSteeringError);
      expect(() => parseRepositoryUrlStrict('owner/-invalid')).toThrow(GitHubSteeringError);
      
      // But should work for valid URLs
      const result = parseRepositoryUrlStrict('owner/repo');
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main'
      });
    });
  });

  describe('Bug #2: GitHub API crashes when path points to file', () => {
    let githubService: GitHubRepositoryService;

    beforeEach(() => {
      githubService = new GitHubRepositoryService();
      
      // Mock fetch globally
      global.fetch = vi.fn();
    });

    it('should handle single file response when path points to markdown file', async () => {
      const mockFileResponse = {
        name: 'template.md',
        path: 'templates/template.md',
        type: 'file',
        sha: 'abc123',
        size: 1024,
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/templates/template.md'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileResponse)
      });

      const templates = await githubService.fetchTemplates('owner', 'repo', 'templates/template.md');
      
      expect(templates).toHaveLength(1);
      expect(templates[0]).toEqual({
        name: 'template',
        filename: 'template.md',
        path: 'templates/template.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://raw.githubusercontent.com/owner/repo/main/templates/template.md',
        type: 'file'
      });
    });

    it('should throw meaningful error when path points to non-markdown file', async () => {
      const mockFileResponse = {
        name: 'README.txt',
        path: 'README.txt',
        type: 'file',
        sha: 'abc123',
        size: 1024,
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.txt'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFileResponse)
      });

      await expect(githubService.fetchTemplates('owner', 'repo', 'README.txt'))
        .rejects.toThrow('Path points to non-markdown file');
    });

    it('should handle directory response (array) correctly', async () => {
      const mockDirectoryResponse = [
        {
          name: 'template1.md',
          path: 'templates/template1.md',
          type: 'file',
          sha: 'abc123',
          size: 1024,
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/templates/template1.md'
        },
        {
          name: 'template2.md',
          path: 'templates/template2.md',
          type: 'file',
          sha: 'def456',
          size: 2048,
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/templates/template2.md'
        },
        {
          name: 'README.txt',
          path: 'templates/README.txt',
          type: 'file',
          sha: 'ghi789',
          size: 512,
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/templates/README.txt'
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDirectoryResponse)
      });

      const templates = await githubService.fetchTemplates('owner', 'repo', 'templates');
      
      expect(templates).toHaveLength(2); // Only markdown files
      expect(templates[0].name).toBe('template1');
      expect(templates[1].name).toBe('template2');
    });

    it('should handle unexpected response format gracefully', async () => {
      const mockInvalidResponse = "unexpected string response";

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvalidResponse)
      });

      await expect(githubService.fetchTemplates('owner', 'repo', 'templates'))
        .rejects.toThrow('Unexpected GitHub API response format');
    });
  });

  describe('Bug #3: Cache evicts entries unnecessarily when updating existing keys', () => {
    let cacheManager: CacheManager;
    let mockContext: any;

    beforeEach(() => {
      const mockGlobalState = new Map();
      
      mockContext = {
        globalState: {
          get: vi.fn((key: string, defaultValue?: any) => {
            return mockGlobalState.get(key) ?? defaultValue;
          }),
          update: vi.fn((key: string, value: any) => {
            if (value === undefined) {
              mockGlobalState.delete(key);
            } else {
              mockGlobalState.set(key, value);
            }
            return Promise.resolve();
          }),
          keys: vi.fn(() => Array.from(mockGlobalState.keys()))
        }
      };

      cacheManager = new CacheManager(mockContext);
    });

    it('should not evict entries when updating existing cache key', () => {
      const templates: TemplateMetadata[] = [
        {
          name: 'template1',
          filename: 'template1.md',
          path: 'template1.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/template1.md',
          type: 'file'
        }
      ];

      // Fill cache to near limit (simulate 99 entries)
      for (let i = 0; i < 99; i++) {
        cacheManager.setCachedTemplates(`key${i}`, templates, `sha${i}`);
      }

      // Add one more to reach the limit (100 entries)
      cacheManager.setCachedTemplates('keyToUpdate', templates, 'originalSha');

      // Verify we have 100 entries
      const statsBefore = cacheManager.getCacheStats();
      expect(statsBefore.totalEntries).toBe(100);

      // Update the existing entry - this should NOT evict any entries
      const updatedTemplates: TemplateMetadata[] = [
        {
          name: 'updated-template',
          filename: 'updated-template.md',
          path: 'updated-template.md',
          sha: 'def456',
          size: 2048,
          downloadUrl: 'https://example.com/updated-template.md',
          type: 'file'
        }
      ];

      cacheManager.setCachedTemplates('keyToUpdate', updatedTemplates, 'updatedSha');

      // Verify we still have 100 entries (no eviction occurred)
      const statsAfter = cacheManager.getCacheStats();
      expect(statsAfter.totalEntries).toBe(100);

      // Verify the entry was actually updated
      const cachedEntry = cacheManager.getCachedTemplates('keyToUpdate');
      expect(cachedEntry).toEqual(updatedTemplates);
    });

    it('should evict LRU entry when adding new entry at cache limit', () => {
      const templates: TemplateMetadata[] = [
        {
          name: 'template',
          filename: 'template.md',
          path: 'template.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/template.md',
          type: 'file'
        }
      ];

      // Fill cache to limit (100 entries)
      for (let i = 0; i < 100; i++) {
        cacheManager.setCachedTemplates(`key${i}`, templates, `sha${i}`);
      }

      // Verify we have 100 entries
      const statsBefore = cacheManager.getCacheStats();
      expect(statsBefore.totalEntries).toBe(100);

      // Add a completely new entry - this SHOULD evict the LRU entry
      cacheManager.setCachedTemplates('newKey', templates, 'newSha');

      // Verify we still have 100 entries (one was evicted, one was added)
      const statsAfter = cacheManager.getCacheStats();
      expect(statsAfter.totalEntries).toBe(100);

      // Verify the new entry exists
      const newEntry = cacheManager.getCachedTemplates('newKey');
      expect(newEntry).toEqual(templates);
    });

    it('should correctly identify existing vs new cache entries', () => {
      const templates: TemplateMetadata[] = [
        {
          name: 'template',
          filename: 'template.md',
          path: 'template.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/template.md',
          type: 'file'
        }
      ];

      // Add initial entry
      cacheManager.setCachedTemplates('existingKey', templates, 'sha1');

      // Verify it exists
      expect(cacheManager.getCachedTemplates('existingKey')).toEqual(templates);

      // Update existing entry multiple times
      cacheManager.setCachedTemplates('existingKey', templates, 'sha2');
      cacheManager.setCachedTemplates('existingKey', templates, 'sha3');

      // Should still exist and be updated
      expect(cacheManager.getCachedTemplates('existingKey')).toEqual(templates);

      // Cache stats should show only 1 entry
      const stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(1);
    });
  });
});
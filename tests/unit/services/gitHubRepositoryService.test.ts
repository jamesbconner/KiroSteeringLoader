/**
 * GitHubRepositoryService Tests
 * 
 * Comprehensive tests for GitHub API integration including:
 * - Template fetching and content retrieval
 * - Authentication and authorization
 * - Rate limiting and retry logic
 * - Error handling for various HTTP status codes
 * - Repository validation
 * - Network timeout and failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubRepositoryService } from '../../../src/services/GitHubRepositoryService';
import { GitHubSteeringError, ErrorCode } from '../../../src/errors';
import type { GitHubContent, GitHubRateLimit, TemplateMetadata, ValidationResult, RateLimitInfo } from '../../../src/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout
const mockAbortSignal = { timeout: vi.fn() };
global.AbortSignal = mockAbortSignal as any;

describe('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;

  beforeEach(() => {
    service = new GitHubRepositoryService();
    vi.clearAllMocks();
    mockAbortSignal.timeout.mockReturnValue(new AbortController().signal);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTemplates', () => {
    const mockGitHubContents: GitHubContent[] = [
      {
        name: 'template1.md',
        path: 'templates/template1.md',
        sha: 'abc123',
        size: 1024,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/template1.md',
        url: 'https://api.github.com/repos/owner/repo/contents/template1.md',
        html_url: 'https://github.com/owner/repo/blob/main/template1.md',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/template1.md',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          html: 'https://github.com/owner/repo/blob/main/template1.md'
        }
      },
      {
        name: 'template2.md',
        path: 'templates/template2.md',
        sha: 'def456',
        size: 2048,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/template2.md',
        url: 'https://api.github.com/repos/owner/repo/contents/template2.md',
        html_url: 'https://github.com/owner/repo/blob/main/template2.md',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/template2.md',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
          html: 'https://github.com/owner/repo/blob/main/template2.md'
        }
      },
      {
        name: 'README.txt',
        path: 'templates/README.txt',
        sha: 'ghi789',
        size: 512,
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.txt',
        url: 'https://api.github.com/repos/owner/repo/contents/README.txt',
        html_url: 'https://github.com/owner/repo/blob/main/README.txt',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/ghi789',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/README.txt',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/ghi789',
          html: 'https://github.com/owner/repo/blob/main/README.txt'
        }
      },
      {
        name: 'subfolder',
        path: 'templates/subfolder',
        sha: 'jkl012',
        size: 0,
        type: 'dir',
        download_url: null,
        url: 'https://api.github.com/repos/owner/repo/contents/subfolder',
        html_url: 'https://github.com/owner/repo/tree/main/subfolder',
        git_url: 'https://api.github.com/repos/owner/repo/git/trees/jkl012',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/subfolder',
          git: 'https://api.github.com/repos/owner/repo/git/trees/jkl012',
          html: 'https://github.com/owner/repo/tree/main/subfolder'
        }
      }
    ];

    it('should fetch and filter markdown templates successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubContents
      });

      const result = await service.fetchTemplates('owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Kiro-Steering-Loader'
          })
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'template1',
        filename: 'template1.md',
        path: 'templates/template1.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://raw.githubusercontent.com/owner/repo/main/template1.md',
        type: 'file'
      });
      expect(result[1]).toEqual({
        name: 'template2',
        filename: 'template2.md',
        path: 'templates/template2.md',
        sha: 'def456',
        size: 2048,
        downloadUrl: 'https://raw.githubusercontent.com/owner/repo/main/template2.md',
        type: 'file'
      });
    });

    it('should filter out large files with null download_url', async () => {
      // GitHub API returns null download_url for files larger than 1MB
      const contentsWithLargeFile: GitHubContent[] = [
        {
          name: 'small-template.md',
          path: 'templates/small-template.md',
          sha: 'abc123',
          size: 1024,
          type: 'file',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/small-template.md',
          url: 'https://api.github.com/repos/owner/repo/contents/small-template.md',
          html_url: 'https://github.com/owner/repo/blob/main/small-template.md',
          git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          _links: {
            self: 'https://api.github.com/repos/owner/repo/contents/small-template.md',
            git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
            html: 'https://github.com/owner/repo/blob/main/small-template.md'
          }
        },
        {
          name: 'large-template.md',
          path: 'templates/large-template.md',
          sha: 'def456',
          size: 2097152, // 2MB - larger than GitHub's 1MB limit
          type: 'file',
          download_url: null, // GitHub returns null for large files
          url: 'https://api.github.com/repos/owner/repo/contents/large-template.md',
          html_url: 'https://github.com/owner/repo/blob/main/large-template.md',
          git_url: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
          _links: {
            self: 'https://api.github.com/repos/owner/repo/contents/large-template.md',
            git: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
            html: 'https://github.com/owner/repo/blob/main/large-template.md'
          }
        },
        {
          name: 'another-small.md',
          path: 'templates/another-small.md',
          sha: 'ghi789',
          size: 512,
          type: 'file',
          download_url: 'https://raw.githubusercontent.com/owner/repo/main/another-small.md',
          url: 'https://api.github.com/repos/owner/repo/contents/another-small.md',
          html_url: 'https://github.com/owner/repo/blob/main/another-small.md',
          git_url: 'https://api.github.com/repos/owner/repo/git/blobs/ghi789',
          _links: {
            self: 'https://api.github.com/repos/owner/repo/contents/another-small.md',
            git: 'https://api.github.com/repos/owner/repo/git/blobs/ghi789',
            html: 'https://github.com/owner/repo/blob/main/another-small.md'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => contentsWithLargeFile
      });

      const result = await service.fetchTemplates('owner', 'repo');

      // Should only return the two small files, filtering out the large file with null download_url
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('another-small');
      expect(result[0].downloadUrl).toBe('https://raw.githubusercontent.com/owner/repo/main/another-small.md');
      expect(result[1].name).toBe('small-template');
      expect(result[1].downloadUrl).toBe('https://raw.githubusercontent.com/owner/repo/main/small-template.md');
      
      // Verify the large file is not included
      expect(result.find(template => template.name === 'large-template')).toBeUndefined();
    });

    it('should fetch templates from specific path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubContents
      });

      await service.fetchTemplates('owner', 'repo', 'templates');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/templates',
        expect.any(Object)
      );
    });

    it('should sort templates alphabetically', async () => {
      const unsortedContents: GitHubContent[] = [
        {
          name: 'zebra.md',
          path: 'zebra.md',
          sha: 'abc',
          size: 100,
          type: 'file',
          download_url: 'https://example.com/zebra.md',
          url: 'https://api.github.com/repos/owner/repo/contents/zebra.md',
          html_url: 'https://github.com/owner/repo/blob/main/zebra.md',
          git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc',
          _links: {
            self: 'https://api.github.com/repos/owner/repo/contents/zebra.md',
            git: 'https://api.github.com/repos/owner/repo/git/blobs/abc',
            html: 'https://github.com/owner/repo/blob/main/zebra.md'
          }
        },
        {
          name: 'alpha.md',
          path: 'alpha.md',
          sha: 'def',
          size: 200,
          type: 'file',
          download_url: 'https://example.com/alpha.md',
          url: 'https://api.github.com/repos/owner/repo/contents/alpha.md',
          html_url: 'https://github.com/owner/repo/blob/main/alpha.md',
          git_url: 'https://api.github.com/repos/owner/repo/git/blobs/def',
          _links: {
            self: 'https://api.github.com/repos/owner/repo/contents/alpha.md',
            git: 'https://api.github.com/repos/owner/repo/git/blobs/def',
            html: 'https://github.com/owner/repo/blob/main/alpha.md'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unsortedContents
      });

      const result = await service.fetchTemplates('owner', 'repo');

      expect(result[0].name).toBe('alpha');
      expect(result[1].name).toBe('zebra');
    });

    it('should handle authentication with token', async () => {
      service.setAuthToken('ghp_test_token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await service.fetchTemplates('owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer ghp_test_token'
          })
        })
      );
    });

    it('should handle 404 repository not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      try {
        await service.fetchTemplates('owner', 'nonexistent');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.REPOSITORY_NOT_FOUND);
        expect((error as GitHubSteeringError).userMessage).toContain('Repository not found');
      }
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      try {
        await service.fetchTemplates('owner', 'repo');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.UNAUTHORIZED);
        expect((error as GitHubSteeringError).userMessage).toContain('Invalid GitHub token');
      }
    });

    it('should handle 403 rate limit exceeded', async () => {
      const mockHeaders = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'X-RateLimit-Remaining') return '0';
          if (key === 'X-RateLimit-Reset') return '1640995200';
          return null;
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: mockHeaders
      });

      try {
        await service.fetchTemplates('owner', 'repo');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
        expect((error as GitHubSteeringError).userMessage).toContain('Rate limit exceeded');
      }
    });

    it('should handle 403 forbidden access', async () => {
      const mockHeaders = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'X-RateLimit-Remaining') return '100';
          return null;
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: mockHeaders
      });

      try {
        await service.fetchTemplates('owner', 'repo');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as GitHubSteeringError).userMessage).toContain('Access forbidden');
      }
    });

    it('should retry on network errors with exponential backoff', async () => {
      // Mock sleep to avoid actual delays in tests
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      
      // First two calls fail with network error
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        });

      await service.fetchTemplates('owner', 'repo');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(sleepSpy).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000); // First retry: 1s
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000); // Second retry: 2s
    });

    it('should fail after max retries', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      
      // All calls fail
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      await expect(service.fetchTemplates('owner', 'repo')).rejects.toThrow('Persistent network error');

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(sleepSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors with AbortError', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'AbortError';
      
      // Mock all retry attempts to fail with the same timeout error
      mockFetch.mockRejectedValue(timeoutError);

      try {
        await service.fetchTemplates('owner', 'repo');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.TIMEOUT);
        expect((error as GitHubSteeringError).userMessage).toContain('Request timed out');
      }
      
      // AbortError should be retried like other network errors, then converted to TIMEOUT error
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(sleepSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors with timeout message', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      
      const timeoutError = new Error('Request timeout occurred');
      
      // Mock all retry attempts to fail with the same timeout error
      mockFetch.mockRejectedValue(timeoutError);

      try {
        await service.fetchTemplates('owner', 'repo');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
        expect((error as GitHubSteeringError).code).toBe(ErrorCode.TIMEOUT);
        expect((error as GitHubSteeringError).userMessage).toContain('Request timed out');
      }
      
      // Should retry on network errors, then fail after max retries
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(sleepSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content successfully', async () => {
      const mockContent = '# Template Content\n\nThis is a template.';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent
      });

      const result = await service.fetchFileContent('https://raw.githubusercontent.com/owner/repo/main/template.md');

      expect(result).toBe(mockContent);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/template.md',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Kiro-Steering-Loader'
          })
        })
      );
    });

    it('should handle file content fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      try {
        await service.fetchFileContent('https://invalid-url');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubSteeringError);
      }
    });

    it('should retry file content fetch on network errors', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'Content'
        });

      const result = await service.fetchFileContent('https://example.com/file.md');

      expect(result).toBe('Content');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalledWith(1000);
    });
  });

  describe('validateRepository', () => {
    it('should validate accessible repository', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await service.validateRepository('owner', 'repo');

      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.any(Object)
      );
    });

    it('should handle repository not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await service.validateRepository('owner', 'nonexistent');

      expect(result).toEqual({
        valid: false,
        error: 'Repository not found or is private. Check the repository URL or configure authentication.',
        statusCode: { status: 404 }
      });
    });

    it('should handle GitHubSteeringError in validation', async () => {
      const error = new GitHubSteeringError(
        'Auth failed',
        ErrorCode.UNAUTHORIZED,
        401,
        'Invalid token'
      );
      
      mockFetch.mockRejectedValueOnce(error);

      const result = await service.validateRepository('owner', 'repo');

      expect(result).toEqual({
        valid: false,
        error: 'Invalid token',
        statusCode: 401
      });
    });

    it('should handle generic errors in validation', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const result = await service.validateRepository('owner', 'repo');

      expect(result).toEqual({
        valid: false,
        error: 'Network failure'
      });
      
      // validateRepository should retry network errors through fetchWithRetry
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle unknown errors in validation', async () => {
      const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      mockFetch.mockRejectedValue('Unknown error string');

      const result = await service.validateRepository('owner', 'repo');

      expect(result).toEqual({
        valid: false,
        error: 'Unknown error'
      });
      
      // Should retry unknown errors through fetchWithRetry
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('getRateLimitStatus', () => {
    const mockRateLimitResponse: GitHubRateLimit = {
      resources: {
        core: {
          limit: 5000,
          remaining: 4999,
          reset: 1640995200, // 2022-01-01 00:00:00 UTC
          used: 1
        }
      }
    };

    it('should get rate limit status successfully', async () => {
      service.setAuthToken('test_token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateLimitResponse
      });

      const result = await service.getRateLimitStatus();

      expect(result).toEqual({
        limit: 5000,
        remaining: 4999,
        reset: new Date(1640995200 * 1000),
        authenticated: true
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/rate_limit',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      );
    });

    it('should handle unauthenticated rate limit check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resources: {
            core: {
              limit: 60,
              remaining: 59,
              reset: 1640995200,
              used: 1
            }
          }
        })
      });

      const result = await service.getRateLimitStatus();

      expect(result.authenticated).toBe(false);
      expect(result.limit).toBe(60);
    });

    it('should return default values on rate limit check failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Rate limit check failed'));

      const result = await service.getRateLimitStatus();

      expect(result).toEqual({
        limit: 60, // Unauthenticated default
        remaining: 0,
        reset: expect.any(Date),
        authenticated: false
      });
    });

    it('should return authenticated defaults on failure with token', async () => {
      service.setAuthToken('test_token');
      mockFetch.mockRejectedValueOnce(new Error('Rate limit check failed'));

      const result = await service.getRateLimitStatus();

      expect(result).toEqual({
        limit: 5000, // Authenticated default
        remaining: 0,
        reset: expect.any(Date),
        authenticated: true
      });
    });
  });

  describe('authentication management', () => {
    it('should set authentication token', () => {
      service.setAuthToken('ghp_test_token');
      
      // Verify token is used in requests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      service.fetchTemplates('owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer ghp_test_token'
          })
        })
      );
    });

    it('should clear authentication token', () => {
      service.setAuthToken('ghp_test_token');
      service.clearAuthToken();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      service.fetchTemplates('owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(service.fetchTemplates('owner', 'repo')).rejects.toThrow(GitHubSteeringError);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await service.fetchTemplates('owner', 'repo');
      expect(result).toEqual([]);
    });

    it('should filter out files with missing download_url (large files)', async () => {
      const contentWithoutUrl: GitHubContent[] = [{
        name: 'template.md',
        path: 'template.md',
        sha: 'abc123',
        size: 1024,
        type: 'file',
        download_url: null,
        url: 'https://api.github.com/repos/owner/repo/contents/template.md',
        html_url: 'https://github.com/owner/repo/blob/main/template.md',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/template.md',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          html: 'https://github.com/owner/repo/blob/main/template.md'
        }
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => contentWithoutUrl
      });

      const result = await service.fetchTemplates('owner', 'repo');
      // Files with null download_url should be filtered out completely
      expect(result).toHaveLength(0);
    });
  });
});
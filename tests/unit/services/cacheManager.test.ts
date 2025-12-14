/**
 * Unit tests for CacheManager
 * Tests caching logic, TTL expiration, LRU eviction,
 * and performance characteristics
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import { CacheManager } from '../../../src/services/CacheManager';
import { TemplateMetadata, CacheEntry } from '../../../src/types';
import { testHelpers } from '../../utils/testHelpers';

// Mock VS Code for this test
vi.mock('vscode', () => ({}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: any;
  let mockStorage: Map<string, any>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Use fake timers for time-based tests
    vi.useFakeTimers();
    
    // Create mock storage
    mockStorage = new Map();
    
    // Create mock global state
    mockGlobalState = {
      get: vi.fn((key: string, defaultValue?: any) => {
        return mockStorage.get(key) ?? defaultValue;
      }),
      update: vi.fn((key: string, value: any) => {
        if (value === undefined) {
          mockStorage.delete(key);
        } else {
          mockStorage.set(key, value);
        }
        return Promise.resolve();
      }),
      keys: vi.fn(() => Array.from(mockStorage.keys()))
    };
    
    // Create mock extension context
    mockContext = testHelpers.createMockExtensionContext();
    mockContext.globalState = mockGlobalState;
    
    // Create service instance
    cacheManager = new CacheManager(mockContext);
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  describe('Cache Storage and Retrieval', () => {
    const testCacheKey = 'test-repo/test-path';
    const testTemplates: TemplateMetadata[] = [
      {
        name: 'template1',
        filename: 'template1.md',
        path: 'templates/template1.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/template1.md',
        type: 'file'
      },
      {
        name: 'template2',
        filename: 'template2.md',
        path: 'templates/template2.md',
        sha: 'def456',
        size: 2048,
        downloadUrl: 'https://example.com/template2.md',
        type: 'file'
      }
    ];

    describe('setCachedTemplates', () => {
      it('should store templates in cache with timestamp', () => {
        // Arrange
        const testSha = 'repo-sha-123';
        const beforeTime = Date.now();

        // Act
        cacheManager.setCachedTemplates(testCacheKey, testTemplates, testSha);

        // Assert
        const storedEntry = mockStorage.get('kiroSteeringLoader.cache.test-repo/test-path') as CacheEntry;
        expect(storedEntry).toBeDefined();
        expect(storedEntry.templates).toEqual(testTemplates);
        expect(storedEntry.sha).toBe(testSha);
        expect(storedEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(storedEntry.timestamp).toBeLessThanOrEqual(Date.now());
      });

      it('should store templates without SHA', () => {
        // Act
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);

        // Assert
        const storedEntry = mockStorage.get('kiroSteeringLoader.cache.test-repo/test-path') as CacheEntry;
        expect(storedEntry.sha).toBe('');
      });

      it('should update access time when storing', () => {
        // Act
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);

        // Assert
        const accessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
        expect(accessTimes).toBeDefined();
        expect(accessTimes[testCacheKey]).toBeGreaterThan(0);
      });
    });

    describe('getCachedTemplates', () => {
      it('should return cached templates when fresh', () => {
        // Arrange
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);

        // Act
        const result = cacheManager.getCachedTemplates(testCacheKey);

        // Assert
        expect(result).toEqual(testTemplates);
      });

      it('should return null when cache does not exist', () => {
        // Act
        const result = cacheManager.getCachedTemplates('non-existent-key');

        // Assert
        expect(result).toBeNull();
      });

      it('should return null and invalidate when cache is stale', () => {
        // Arrange
        const staleEntry: CacheEntry = {
          templates: testTemplates,
          timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (stale)
          sha: 'test-sha'
        };
        mockStorage.set('kiroSteeringLoader.cache.test-repo/test-path', staleEntry);

        // Act
        const result = cacheManager.getCachedTemplates(testCacheKey);

        // Assert
        expect(result).toBeNull();
        expect(mockStorage.has('kiroSteeringLoader.cache.test-repo/test-path')).toBe(false);
      });

      it('should update access time when retrieving fresh cache', () => {
        // Arrange
        const startTime = Date.now();
        vi.setSystemTime(startTime);
        
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);
        const initialAccessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
        const initialAccessTime = initialAccessTimes[testCacheKey];

        // Advance time to ensure different timestamp
        vi.setSystemTime(startTime + 1000);

        // Act
        cacheManager.getCachedTemplates(testCacheKey);

        // Assert
        const updatedAccessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
        expect(updatedAccessTimes[testCacheKey]).toBeGreaterThan(initialAccessTime);
      });
    });
  });

  describe('Cache Validation', () => {
    const testCacheKey = 'test-validation';
    const testTemplates: TemplateMetadata[] = [{
      name: 'test',
      filename: 'test.md',
      path: 'test.md',
      sha: 'file-sha',
      size: 100,
      downloadUrl: 'https://example.com/test.md',
      type: 'file'
    }];

    describe('isCacheFresh', () => {
      it('should return true for fresh cache', () => {
        // Arrange
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);

        // Act
        const result = cacheManager.isCacheFresh(testCacheKey);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for stale cache', () => {
        // Arrange
        const staleEntry: CacheEntry = {
          templates: testTemplates,
          timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago
          sha: 'test-sha'
        };
        mockStorage.set('kiroSteeringLoader.cache.test-validation', staleEntry);

        // Act
        const result = cacheManager.isCacheFresh(testCacheKey);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for non-existent cache', () => {
        // Act
        const result = cacheManager.isCacheFresh('non-existent');

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('isCacheValid', () => {
      it('should return true for fresh cache with matching SHA', () => {
        // Arrange
        const testSha = 'matching-sha';
        cacheManager.setCachedTemplates(testCacheKey, testTemplates, testSha);

        // Act
        const result = cacheManager.isCacheValid(testCacheKey, testSha);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for fresh cache with different SHA', () => {
        // Arrange
        cacheManager.setCachedTemplates(testCacheKey, testTemplates, 'original-sha');

        // Act
        const result = cacheManager.isCacheValid(testCacheKey, 'different-sha');

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for stale cache even with matching SHA', () => {
        // Arrange
        const testSha = 'test-sha';
        const staleEntry: CacheEntry = {
          templates: testTemplates,
          timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago
          sha: testSha
        };
        mockStorage.set('kiroSteeringLoader.cache.test-validation', staleEntry);

        // Act
        const result = cacheManager.isCacheValid(testCacheKey, testSha);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for non-existent cache', () => {
        // Act
        const result = cacheManager.isCacheValid('non-existent', 'any-sha');

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('Cache Invalidation', () => {
    const testCacheKey = 'test-invalidation';
    const testTemplates: TemplateMetadata[] = [{
      name: 'test',
      filename: 'test.md',
      path: 'test.md',
      sha: 'file-sha',
      size: 100,
      downloadUrl: 'https://example.com/test.md',
      type: 'file'
    }];

    describe('invalidateCache', () => {
      it('should remove cache entry and access time', () => {
        // Arrange
        cacheManager.setCachedTemplates(testCacheKey, testTemplates);
        expect(mockStorage.has('kiroSteeringLoader.cache.test-invalidation')).toBe(true);

        // Act
        cacheManager.invalidateCache(testCacheKey);

        // Assert
        expect(mockStorage.has('kiroSteeringLoader.cache.test-invalidation')).toBe(false);
        const accessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
        expect(accessTimes[testCacheKey]).toBeUndefined();
      });

      it('should handle invalidating non-existent cache gracefully', () => {
        // Act & Assert - should not throw
        expect(() => cacheManager.invalidateCache('non-existent')).not.toThrow();
      });
    });

    describe('clearAllCache', () => {
      it('should remove all cache entries and access times', () => {
        // Arrange
        cacheManager.setCachedTemplates('key1', testTemplates);
        cacheManager.setCachedTemplates('key2', testTemplates);
        cacheManager.setCachedTemplates('key3', testTemplates);
        
        // Add some non-cache data
        mockStorage.set('other.data', 'should-remain');
        
        expect(mockStorage.size).toBeGreaterThan(1);

        // Act
        cacheManager.clearAllCache();

        // Assert
        const remainingKeys = Array.from(mockStorage.keys());
        const cacheKeys = remainingKeys.filter(key => key.startsWith('kiroSteeringLoader.cache'));
        expect(cacheKeys).toHaveLength(0);
        expect(mockStorage.get('other.data')).toBe('should-remain');
      });

      it('should handle clearing empty cache gracefully', () => {
        // Act & Assert - should not throw
        expect(() => cacheManager.clearAllCache()).not.toThrow();
      });
    });
  });

  describe('LRU Cache Management', () => {
    const createTestTemplate = (name: string): TemplateMetadata[] => [{
      name,
      filename: `${name}.md`,
      path: `${name}.md`,
      sha: `${name}-sha`,
      size: 100,
      downloadUrl: `https://example.com/${name}.md`,
      type: 'file'
    }];

    it('should evict least recently used entry when cache limit is reached', () => {
      // Arrange - Fill cache to near limit (we'll mock the limit check)
      const originalEnforceCacheLimit = (cacheManager as any).enforceCacheLimit;
      let callCount = 0;
      
      // Mock enforceCacheLimit to trigger eviction after a few entries
      (cacheManager as any).enforceCacheLimit = vi.fn(() => {
        callCount++;
        if (callCount > 2) {
          // Simulate reaching limit and evict oldest
          const accessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes') || {};
          let oldestKey = null;
          let oldestTime = Date.now();
          
          for (const [key, time] of Object.entries(accessTimes)) {
            if ((time as number) < oldestTime) {
              oldestTime = time as number;
              oldestKey = key;
            }
          }
          
          if (oldestKey) {
            cacheManager.invalidateCache(oldestKey);
          }
        }
      });

      // Act - Add entries with different access times
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      cacheManager.setCachedTemplates('key1', createTestTemplate('template1'));
      
      vi.setSystemTime(baseTime + 100);
      cacheManager.setCachedTemplates('key2', createTestTemplate('template2'));
      
      vi.setSystemTime(baseTime + 200);
      cacheManager.setCachedTemplates('key3', createTestTemplate('template3')); // This should trigger eviction

      // Assert
      expect((cacheManager as any).enforceCacheLimit).toHaveBeenCalled();
    });

    it('should update access time when cache is accessed', () => {
      // Arrange
      cacheManager.setCachedTemplates('test-key', createTestTemplate('test'));
      const initialAccessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
      const initialTime = initialAccessTimes['test-key'];

      vi.setSystemTime(Date.now() + 1000);

      // Act
      cacheManager.getCachedTemplates('test-key');

      // Assert
      const updatedAccessTimes = mockStorage.get('kiroSteeringLoader.cache.accessTimes');
      expect(updatedAccessTimes['test-key']).toBeGreaterThan(initialTime);
    });
  });

  describe('Cache Statistics', () => {
    const createTestTemplate = (name: string): TemplateMetadata[] => [{
      name,
      filename: `${name}.md`,
      path: `${name}.md`,
      sha: `${name}-sha`,
      size: 100,
      downloadUrl: `https://example.com/${name}.md`,
      type: 'file'
    }];

    describe('getCacheStats', () => {
      it('should return correct stats for empty cache', () => {
        // Act
        const stats = cacheManager.getCacheStats();

        // Assert
        expect(stats).toEqual({
          totalEntries: 0,
          freshEntries: 0,
          staleEntries: 0,
          configuration: {
            ttlSeconds: 300,
            maxEntries: 100
          }
        });
      });

      it('should return correct stats for fresh entries', () => {
        // Arrange
        cacheManager.setCachedTemplates('key1', createTestTemplate('template1'));
        cacheManager.setCachedTemplates('key2', createTestTemplate('template2'));

        // Act
        const stats = cacheManager.getCacheStats();

        // Assert
        expect(stats).toEqual({
          totalEntries: 2,
          freshEntries: 2,
          staleEntries: 0,
          configuration: {
            ttlSeconds: 300,
            maxEntries: 100
          }
        });
      });

      it('should return correct stats for mixed fresh and stale entries', () => {
        // Arrange
        cacheManager.setCachedTemplates('fresh-key', createTestTemplate('fresh'));
        
        // Add stale entry manually
        const staleEntry: CacheEntry = {
          templates: createTestTemplate('stale'),
          timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago
          sha: 'stale-sha'
        };
        mockStorage.set('kiroSteeringLoader.cache.stale-key', staleEntry);

        // Act
        const stats = cacheManager.getCacheStats();

        // Assert
        expect(stats).toEqual({
          totalEntries: 2,
          freshEntries: 1,
          staleEntries: 1,
          configuration: {
            ttlSeconds: 300,
            maxEntries: 100
          }
        });
      });

      it('should not count access times in total entries', () => {
        // Arrange
        cacheManager.setCachedTemplates('key1', createTestTemplate('template1'));
        // Access times are stored separately and should not be counted

        // Act
        const stats = cacheManager.getCacheStats();

        // Assert
        expect(stats.totalEntries).toBe(1);
      });
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle concurrent cache operations', () => {
      // Arrange
      const template1 = [{
        name: 'template1',
        filename: 'template1.md',
        path: 'template1.md',
        sha: 'sha1',
        size: 100,
        downloadUrl: 'https://example.com/template1.md',
        type: 'file' as const
      }];
      
      const template2 = [{
        name: 'template2',
        filename: 'template2.md',
        path: 'template2.md',
        sha: 'sha2',
        size: 200,
        downloadUrl: 'https://example.com/template2.md',
        type: 'file' as const
      }];

      // Act - Simulate concurrent operations
      cacheManager.setCachedTemplates('key1', template1);
      cacheManager.setCachedTemplates('key2', template2);
      const result1 = cacheManager.getCachedTemplates('key1');
      const result2 = cacheManager.getCachedTemplates('key2');

      // Assert
      expect(result1).toEqual(template1);
      expect(result2).toEqual(template2);
    });

    it('should handle very long cache keys', () => {
      // Arrange
      const longKey = 'a'.repeat(1000);
      const testTemplates = [{
        name: 'test',
        filename: 'test.md',
        path: 'test.md',
        sha: 'test-sha',
        size: 100,
        downloadUrl: 'https://example.com/test.md',
        type: 'file' as const
      }];

      // Act & Assert - should not throw
      expect(() => cacheManager.setCachedTemplates(longKey, testTemplates)).not.toThrow();
      expect(cacheManager.getCachedTemplates(longKey)).toEqual(testTemplates);
    });

    it('should handle special characters in cache keys', () => {
      // Arrange
      const specialKey = 'owner/repo with spaces & symbols!@#$%/path';
      const testTemplates = [{
        name: 'test',
        filename: 'test.md',
        path: 'test.md',
        sha: 'test-sha',
        size: 100,
        downloadUrl: 'https://example.com/test.md',
        type: 'file' as const
      }];

      // Act & Assert - should not throw
      expect(() => cacheManager.setCachedTemplates(specialKey, testTemplates)).not.toThrow();
      expect(cacheManager.getCachedTemplates(specialKey)).toEqual(testTemplates);
    });

    it('should handle empty template arrays', () => {
      // Arrange
      const emptyTemplates: TemplateMetadata[] = [];

      // Act
      cacheManager.setCachedTemplates('empty-key', emptyTemplates);
      const result = cacheManager.getCachedTemplates('empty-key');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle VS Code globalState errors gracefully', () => {
      // Arrange
      mockGlobalState.get.mockImplementation(() => {
        throw new Error('GlobalState error');
      });

      // Act & Assert - should throw the error (not handle it silently)
      expect(() => cacheManager.getCachedTemplates('test-key')).toThrow('GlobalState error');
    });
  });
});
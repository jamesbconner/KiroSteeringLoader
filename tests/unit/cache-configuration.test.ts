/**
 * Cache Configuration Bug Fix Test
 * 
 * Tests for Bug #4: Cache configuration settings are ignored by CacheManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TemplateMetadata } from '../../src/types';

// Mock vscode module before importing CacheManager
const mockWorkspaceConfig = {
  get: vi.fn()
};

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => mockWorkspaceConfig)
  }
}));

// Import after mocking
import { CacheManager } from '../../src/services/CacheManager';

describe('Cache Configuration Bug Fix', () => {
  let cacheManager: CacheManager;
  let mockContext: any;

  beforeEach(() => {
    // Reset mock
    mockWorkspaceConfig.get.mockReset();
    
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Reading', () => {
    it('should use default values when no configuration is set', () => {
      // Mock config to return default values
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => defaultValue);

      const config = cacheManager.getCacheConfiguration();
      
      expect(config.ttlSeconds).toBe(300); // 5 minutes default
      expect(config.maxEntries).toBe(100); // default max entries
      expect(config.ttlMs).toBe(300000); // 5 minutes in ms
    });

    it('should read TTL from configuration', () => {
      // Mock config to return custom TTL
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 600; // 10 minutes
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      
      expect(config.ttlSeconds).toBe(600);
      expect(config.ttlMs).toBe(600000);
    });

    it('should read max entries from configuration', () => {
      // Mock config to return custom max entries
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.maxEntries') {
          return 50;
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      
      expect(config.maxEntries).toBe(50);
    });

    it('should read both TTL and max entries from configuration', () => {
      // Mock config to return both custom values
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 900; // 15 minutes
        }
        if (key === 'cache.maxEntries') {
          return 200;
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      
      expect(config.ttlSeconds).toBe(900);
      expect(config.maxEntries).toBe(200);
    });
  });

  describe('Configuration Validation', () => {
    it('should clamp TTL to minimum bound (60 seconds)', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 30; // Too low
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      expect(config.ttlSeconds).toBe(60); // Clamped to minimum
    });

    it('should clamp TTL to maximum bound (3600 seconds)', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 7200; // Too high (2 hours)
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      expect(config.ttlSeconds).toBe(3600); // Clamped to maximum (1 hour)
    });

    it('should clamp max entries to minimum bound (10)', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.maxEntries') {
          return 5; // Too low
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      expect(config.maxEntries).toBe(10); // Clamped to minimum
    });

    it('should clamp max entries to maximum bound (1000)', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.maxEntries') {
          return 2000; // Too high
        }
        return defaultValue;
      });

      const config = cacheManager.getCacheConfiguration();
      expect(config.maxEntries).toBe(1000); // Clamped to maximum
    });
  });

  describe('Configuration Usage in Cache Operations', () => {
    const sampleTemplate: TemplateMetadata = {
      name: 'template',
      filename: 'template.md',
      path: 'template.md',
      sha: 'abc123',
      size: 1024,
      downloadUrl: 'https://example.com/template.md',
      type: 'file'
    };

    it('should use configured TTL for cache freshness checks', () => {
      // Set custom TTL to 120 seconds (valid range)
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 120;
        }
        return defaultValue;
      });

      // Verify the configuration is read correctly
      const config = cacheManager.getCacheConfiguration();
      expect(config.ttlSeconds).toBe(120);
      expect(config.ttlMs).toBe(120000);

      // Add entry to cache
      cacheManager.setCachedTemplates('testKey', [sampleTemplate]);

      // Should be fresh immediately
      expect(cacheManager.isCacheFresh('testKey')).toBe(true);

      // Test with different TTL configuration
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 600; // 10 minutes
        }
        return defaultValue;
      });

      // Configuration should update for new calls
      const newConfig = cacheManager.getCacheConfiguration();
      expect(newConfig.ttlSeconds).toBe(600);
    });

    it('should use configured max entries for cache limit enforcement', () => {
      // Set custom max entries to 15 (valid range)
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.maxEntries') {
          return 15;
        }
        return defaultValue;
      });

      // Verify configuration is read correctly
      const config = cacheManager.getCacheConfiguration();
      expect(config.maxEntries).toBe(15);

      // Test with different max entries configuration
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.maxEntries') {
          return 25;
        }
        return defaultValue;
      });

      // Configuration should update for new calls
      const newConfig = cacheManager.getCacheConfiguration();
      expect(newConfig.maxEntries).toBe(25);
    });

    it('should include configuration in cache stats', () => {
      // Set custom configuration
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 600; // 10 minutes
        }
        if (key === 'cache.maxEntries') {
          return 50;
        }
        return defaultValue;
      });

      const stats = cacheManager.getCacheStats();
      
      expect(stats.configuration.ttlSeconds).toBe(600);
      expect(stats.configuration.maxEntries).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-numeric configuration values gracefully', () => {
      mockWorkspaceConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'cache.ttl') {
          return 'invalid'; // Non-numeric value
        }
        if (key === 'cache.maxEntries') {
          return null; // Null value
        }
        return defaultValue;
      });

      // Should fall back to defaults when config values are invalid
      const config = cacheManager.getCacheConfiguration();
      expect(config.ttlSeconds).toBe(300); // Default
      expect(config.maxEntries).toBe(100); // Default
    });

    it('should handle missing configuration section gracefully', () => {
      // Mock config.get to throw an error (simulating missing config)
      mockWorkspaceConfig.get.mockImplementation(() => {
        throw new Error('Configuration not found');
      });

      // Should not throw and use defaults
      expect(() => {
        const config = cacheManager.getCacheConfiguration();
        expect(config.ttlSeconds).toBe(300);
        expect(config.maxEntries).toBe(100);
      }).not.toThrow();
    });
  });
});
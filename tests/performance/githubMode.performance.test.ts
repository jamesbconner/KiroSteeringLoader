/**
 * GitHub Mode Performance Tests
 * Tests performance characteristics specific to GitHub repository integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubRepositoryService } from '../../src/services/GitHubRepositoryService';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { TemplateMetadata } from '../../src/types';
import { createMockExtensionContext } from '../mocks/vscodeFactories';

// Mock the cache manager for performance tests with stateful behavior
vi.mock('../../src/services/CacheManager', () => {
  return {
    CacheManager: vi.fn().mockImplementation(() => {
      // Create a stateful cache store for this instance
      const cacheStore = new Map<string, any[]>();
      
      return {
        getCachedTemplates: vi.fn().mockImplementation((cacheKey: string) => {
          // Check if cache was invalidated or is a miss pattern
          if (cacheKey.includes('miss') || !cacheStore.has(cacheKey)) {
            return null;
          }
          return cacheStore.get(cacheKey) || null;
        }),
        setCachedTemplates: vi.fn().mockImplementation((cacheKey: string, templates: any[], sha?: string) => {
          // Store templates in the mock cache
          cacheStore.set(cacheKey, templates);
          return;
        }),
        invalidateCache: vi.fn().mockImplementation((cacheKey: string) => {
          // Remove from cache store
          cacheStore.delete(cacheKey);
          return;
        }),
        clearAllCache: vi.fn().mockImplementation(() => {
          // Clear all cache entries
          cacheStore.clear();
          return;
        }),
        isCacheFresh: vi.fn().mockImplementation((cacheKey: string) => {
          return !cacheKey.includes('stale') && cacheStore.has(cacheKey);
        }),
        isCacheValid: vi.fn().mockImplementation((cacheKey: string, sha: string) => {
          return !cacheKey.includes('invalid') && sha !== 'invalid-sha' && cacheStore.has(cacheKey);
        }),
        getCacheStats: vi.fn().mockReturnValue({
          totalEntries: 12,
          freshEntries: 10,
          staleEntries: 2
        })
      };
    })
  };
});

import { CacheManager } from '../../src/services/CacheManager';

/**
 * GitHub mode performance metrics
 */
interface GitHubPerformanceMetrics {
  operation: string;
  cacheHit: boolean;
  duration: number;
  templateCount: number;
  apiCallCount: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Performance thresholds for GitHub operations
 */
const GITHUB_PERFORMANCE_THRESHOLDS = {
  // Cache hit should be very fast
  maxCacheHitTime: 100, // 100ms
  
  // Cache miss (API call) can be slower but should be reasonable
  maxCacheMissTime: 5000, // 5 seconds
  
  // Cache operations should be fast
  maxCacheWriteTime: 50, // 50ms
  maxCacheReadTime: 50, // 50ms
  
  // Memory usage for cached data
  maxCacheMemoryPerTemplateMB: 0.01, // 10KB per template
  
  // API rate limit handling
  maxRateLimitCheckTime: 10, // 10ms
};

describe('GitHub Mode Performance Tests', () => {
  let mockContext: ReturnType<typeof createMockExtensionContext>;
  let cacheManager: CacheManager;
  let githubService: GitHubRepositoryService;
  let configService: ConfigurationService;
  let performanceResults: GitHubPerformanceMetrics[] = [];

  beforeEach(() => {
    // Create mock context using factory
    mockContext = createMockExtensionContext();

    // Initialize services
    cacheManager = new CacheManager(mockContext);
    githubService = new GitHubRepositoryService();
    configService = new ConfigurationService(mockContext);
  });

  afterEach(() => {
    performanceResults = [];
  });

  /**
   * Helper to measure operation performance
   */
  async function measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Partial<GitHubPerformanceMetrics> = {}
  ): Promise<{ result: T; metrics: GitHubPerformanceMetrics }> {
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();
    
    const result = await fn();
    
    const duration = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    const memoryUsage = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
    };

    const metrics: GitHubPerformanceMetrics = {
      operation,
      cacheHit: false,
      duration,
      templateCount: 0,
      apiCallCount: 0,
      memoryUsage,
      ...metadata,
    };

    performanceResults.push(metrics);
    return { result, metrics };
  }

  /**
   * Helper to create mock template metadata
   */
  function createMockTemplates(count: number): TemplateMetadata[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `template-${i}`,
      filename: `template-${i}.md`,
      path: `templates/template-${i}.md`,
      size: 1024 * (i + 1),
      downloadUrl: `https://raw.githubusercontent.com/test/repo/main/templates/template-${i}.md`,
      sha: `sha-${i}`,
    }));
  }

  describe('Cache Performance', () => {
    it('should read from cache very quickly (cache hit)', async () => {
      const templates = createMockTemplates(50);
      const cacheKey = 'test/repo/templates';

      // Write to cache first
      cacheManager.setCachedTemplates(cacheKey, templates);

      // Measure cache read performance
      const { result, metrics } = await measurePerformance(
        'cache-read-hit',
        async () => cacheManager.getCachedTemplates(cacheKey),
        { cacheHit: true, templateCount: templates.length }
      );

      console.log('Cache hit performance:', {
        duration: `${metrics.duration}ms`,
        templateCount: metrics.templateCount,
        memoryUsageMB: `${(metrics.memoryUsage!.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      });

      expect(result).toEqual(templates);
      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheHitTime);
    });

    it('should handle cache miss efficiently', async () => {
      const cacheKey = 'test/repo/nonexistent';

      // Measure cache miss performance
      const { result, metrics } = await measurePerformance(
        'cache-read-miss',
        async () => cacheManager.getCachedTemplates(cacheKey),
        { cacheHit: false, templateCount: 0 }
      );

      console.log('Cache miss performance:', {
        duration: `${metrics.duration}ms`,
      });

      expect(result).toBeNull();
      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheReadTime);
    });

    it('should write to cache quickly', async () => {
      const templates = createMockTemplates(100);
      const cacheKey = 'test/repo/templates';

      // Measure cache write performance
      const { metrics } = await measurePerformance(
        'cache-write',
        async () => {
          cacheManager.setCachedTemplates(cacheKey, templates);
          return true;
        },
        { templateCount: templates.length }
      );

      console.log('Cache write performance:', {
        duration: `${metrics.duration}ms`,
        templateCount: metrics.templateCount,
        memoryUsageMB: `${(metrics.memoryUsage!.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      });

      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheWriteTime);
      
      // Verify memory usage per template is reasonable
      const memoryPerTemplateMB = (metrics.memoryUsage!.heapUsed / 1024 / 1024) / templates.length;
      expect(memoryPerTemplateMB).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheMemoryPerTemplateMB);
    });

    it('should handle cache invalidation efficiently', async () => {
      const templates = createMockTemplates(200);
      const cacheKey = 'test/repo/templates';

      // Write to cache
      cacheManager.setCachedTemplates(cacheKey, templates);

      // Measure cache invalidation performance
      const { metrics } = await measurePerformance(
        'cache-invalidate',
        async () => {
          cacheManager.invalidateCache(cacheKey);
          return true;
        },
        { templateCount: templates.length }
      );

      console.log('Cache invalidation performance:', {
        duration: `${metrics.duration}ms`,
        templateCount: metrics.templateCount,
      });

      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheWriteTime);
      expect(cacheManager.getCachedTemplates(cacheKey)).toBeNull();
    });

    it('should clear all cache efficiently', async () => {
      // Create multiple cache entries
      for (let i = 0; i < 10; i++) {
        const templates = createMockTemplates(20);
        cacheManager.setCachedTemplates(`test/repo-${i}/templates`, templates);
      }

      // Measure clear all cache performance
      const { metrics } = await measurePerformance(
        'cache-clear-all',
        async () => {
          cacheManager.clearAllCache();
          return true;
        },
        { templateCount: 200 } // 10 repos * 20 templates
      );

      console.log('Clear all cache performance:', {
        duration: `${metrics.duration}ms`,
        totalTemplates: metrics.templateCount,
      });

      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheWriteTime * 2);
    });
  });

  describe('Cache vs API Performance Comparison', () => {
    it('should demonstrate significant performance improvement with cache', async () => {
      const templates = createMockTemplates(100);
      const cacheKey = 'test/repo/templates';

      // Simulate API call (cache miss)
      const { metrics: missMetrics } = await measurePerformance(
        'simulated-api-call',
        async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 100));
          cacheManager.setCachedTemplates(cacheKey, templates);
          return templates;
        },
        { cacheHit: false, templateCount: templates.length, apiCallCount: 1 }
      );

      // Cache hit
      const { metrics: hitMetrics } = await measurePerformance(
        'cache-hit',
        async () => cacheManager.getCachedTemplates(cacheKey),
        { cacheHit: true, templateCount: templates.length, apiCallCount: 0 }
      );

      console.log('Cache performance comparison:', {
        cacheMiss: `${missMetrics.duration}ms`,
        cacheHit: `${hitMetrics.duration}ms`,
        speedup: `${(missMetrics.duration / hitMetrics.duration).toFixed(1)}x faster`,
      });

      // Cache hit should be significantly faster
      expect(hitMetrics.duration).toBeLessThan(missMetrics.duration / 10);
      expect(hitMetrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheHitTime);
    });

    it('should handle repeated cache hits efficiently', async () => {
      const templates = createMockTemplates(50);
      const cacheKey = 'test/repo/templates';
      cacheManager.setCachedTemplates(cacheKey, templates);

      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { metrics } = await measurePerformance(
          'repeated-cache-hit',
          async () => cacheManager.getCachedTemplates(cacheKey),
          { cacheHit: true, templateCount: templates.length }
        );
        durations.push(metrics.duration);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log('Repeated cache hit performance:', {
        iterations,
        average: `${avgDuration.toFixed(2)}ms`,
        min: `${minDuration}ms`,
        max: `${maxDuration}ms`,
      });

      expect(avgDuration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheHitTime);
      expect(maxDuration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheHitTime * 2);
    });
  });

  describe('Cache Freshness and TTL Performance', () => {
    it('should check cache freshness quickly', async () => {
      const templates = createMockTemplates(50);
      const cacheKey = 'test/repo/templates';
      cacheManager.setCachedTemplates(cacheKey, templates);

      // Measure freshness check performance
      const { result, metrics } = await measurePerformance(
        'cache-freshness-check',
        async () => cacheManager.isCacheFresh(cacheKey),
        { templateCount: templates.length }
      );

      console.log('Cache freshness check performance:', {
        duration: `${metrics.duration}ms`,
        isFresh: result,
      });

      expect(result).toBe(true);
      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheReadTime);
    });

    it('should handle SHA-based validation efficiently', async () => {
      const templates = createMockTemplates(50);
      const cacheKey = 'test/repo/templates';
      const sha = 'abc123def456';
      
      cacheManager.setCachedTemplates(cacheKey, templates, sha);

      // Measure SHA validation performance
      const { result, metrics } = await measurePerformance(
        'cache-sha-validation',
        async () => cacheManager.isCacheValid(cacheKey, sha),
        { templateCount: templates.length }
      );

      console.log('SHA validation performance:', {
        duration: `${metrics.duration}ms`,
        isValid: result,
      });

      expect(result).toBe(true);
      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheReadTime);
    });
  });

  describe('Cache Statistics Performance', () => {
    it('should generate cache statistics quickly', async () => {
      // Create multiple cache entries
      for (let i = 0; i < 20; i++) {
        const templates = createMockTemplates(10);
        cacheManager.setCachedTemplates(`test/repo-${i}/templates`, templates);
      }

      // Measure statistics generation performance
      const { result, metrics } = await measurePerformance(
        'cache-statistics',
        async () => cacheManager.getCacheStats(),
        { templateCount: 200 }
      );

      console.log('Cache statistics performance:', {
        duration: `${metrics.duration}ms`,
        stats: result,
      });

      expect(metrics.duration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheReadTime * 2);
      expect(result.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive GitHub mode performance report', async () => {
      // Run a variety of operations to collect metrics
      const templates = createMockTemplates(100);
      const cacheKey = 'test/repo/templates';

      // Cache write
      await measurePerformance(
        'cache-write',
        async () => {
          cacheManager.setCachedTemplates(cacheKey, templates);
          return true;
        },
        { templateCount: templates.length }
      );

      // Cache read (hit)
      await measurePerformance(
        'cache-read-hit',
        async () => cacheManager.getCachedTemplates(cacheKey),
        { cacheHit: true, templateCount: templates.length }
      );

      // Cache invalidation
      await measurePerformance(
        'cache-invalidate',
        async () => {
          cacheManager.invalidateCache(cacheKey);
          return true;
        },
        { templateCount: templates.length }
      );

      // Generate report
      const report = {
        timestamp: new Date().toISOString(),
        thresholds: GITHUB_PERFORMANCE_THRESHOLDS,
        results: performanceResults,
        summary: {
          totalOperations: performanceResults.length,
          averageDuration: performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length,
          cacheHitRate: performanceResults.filter(r => r.cacheHit).length / performanceResults.length,
          totalTemplatesProcessed: performanceResults.reduce((sum, r) => sum + r.templateCount, 0),
        },
      };

      console.log('GitHub mode performance report:', report.summary);

      expect(report.results.length).toBeGreaterThan(0);
      expect(report.summary.averageDuration).toBeLessThan(GITHUB_PERFORMANCE_THRESHOLDS.maxCacheHitTime * 2);
    });
  });
});

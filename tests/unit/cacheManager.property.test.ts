/**
 * Property-based tests for CacheManager
 * Feature: github-steering-loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CacheManager } from '../../src/services/CacheManager';
import { TemplateMetadata } from '../../src/types';

// Helper to generate hex strings (SHA hashes)
const hexStringArb = (length: number) => 
  fc.array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: length, maxLength: length })
    .map(chars => chars.join(''));

// Mock VS Code GlobalState
const mockGlobalState = new Map<string, any>();

const mockContext = {
  globalState: {
    get: vi.fn((key: string, defaultValue?: any) => {
      return mockGlobalState.has(key) ? mockGlobalState.get(key) : defaultValue;
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
  },
  secrets: {} as any,
  subscriptions: [],
  workspaceState: {} as any,
  extensionUri: {} as any,
  extensionPath: '',
  environmentVariableCollection: {} as any,
  extensionMode: 1,
  storageUri: undefined,
  storagePath: undefined,
  globalStorageUri: {} as any,
  globalStoragePath: '',
  logUri: {} as any,
  logPath: '',
  extension: {} as any
};

describe('CacheManager - Property Tests', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalState.clear();
    cacheManager = new CacheManager(mockContext as any);
  });

  /**
   * Property 10: Cache storage with timestamp
   * Feature: github-steering-loader, Property 10: Cache storage with timestamp
   * Validates: Requirements 4.1
   */
  it('should store templates with timestamp within 1 second of current time', () => {
    const templateArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: hexStringArb(40),
      size: fc.integer({ min: 0, max: 1000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constantFrom('file' as const, 'dir' as const)
    });

    const templatesArb = fc.array(templateArb, { minLength: 1, maxLength: 10 });
    const cacheKeyArb = fc.string({ minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(cacheKeyArb, templatesArb, (cacheKey, templates) => {
        const beforeTime = Date.now();
        
        // Store templates in cache
        cacheManager.setCachedTemplates(cacheKey, templates);
        
        const afterTime = Date.now();
        
        // Retrieve the cache entry directly from storage
        const fullKey = `kiroSteeringLoader.cache.${cacheKey}`;
        const entry = mockGlobalState.get(fullKey);
        
        // Should have stored the entry
        expect(entry).toBeDefined();
        expect(entry.templates).toEqual(templates);
        
        // Timestamp should be within 1 second (actually much less, but we allow 1s for safety)
        expect(entry.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(entry.timestamp).toBeLessThanOrEqual(afterTime);
        expect(afterTime - entry.timestamp).toBeLessThan(1000);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Fresh cache usage
   * Feature: github-steering-loader, Property 11: Fresh cache usage
   * Validates: Requirements 4.3
   */
  it('should return cached data for fresh cache without API call', () => {
    const templateArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: hexStringArb(40),
      size: fc.integer({ min: 0, max: 1000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constantFrom('file' as const, 'dir' as const)
    });

    const templatesArb = fc.array(templateArb, { minLength: 1, maxLength: 10 });
    const cacheKeyArb = fc.string({ minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(cacheKeyArb, templatesArb, (cacheKey, templates) => {
        // Store templates in cache
        cacheManager.setCachedTemplates(cacheKey, templates);
        
        // Cache should be fresh (< 5 minutes old)
        expect(cacheManager.isCacheFresh(cacheKey)).toBe(true);
        
        // Should retrieve the same templates from cache
        const retrieved = cacheManager.getCachedTemplates(cacheKey);
        expect(retrieved).toEqual(templates);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: SHA-based cache invalidation
   * Feature: github-steering-loader, Property 12: SHA-based cache invalidation
   * Validates: Requirements 4.5
   */
  it('should invalidate cache when SHA differs', () => {
    const templateArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: hexStringArb(40),
      size: fc.integer({ min: 0, max: 1000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constantFrom('file' as const, 'dir' as const)
    });

    const templatesArb = fc.array(templateArb, { minLength: 1, maxLength: 10 });
    const cacheKeyArb = fc.string({ minLength: 1, maxLength: 50 });
    const shaArb = hexStringArb(40);

    fc.assert(
      fc.property(cacheKeyArb, templatesArb, shaArb, shaArb, (cacheKey, templates, sha1, sha2) => {
        // Ensure SHAs are different
        fc.pre(sha1 !== sha2);
        
        // Store templates with first SHA
        cacheManager.setCachedTemplates(cacheKey, templates, sha1);
        
        // Cache should be valid with matching SHA
        expect(cacheManager.isCacheValid(cacheKey, sha1)).toBe(true);
        
        // Cache should be invalid with different SHA
        expect(cacheManager.isCacheValid(cacheKey, sha2)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle cache expiration after TTL', () => {
    const templateArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: hexStringArb(40),
      size: fc.integer({ min: 0, max: 1000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constantFrom('file' as const, 'dir' as const)
    });

    const templatesArb = fc.array(templateArb, { minLength: 1, maxLength: 10 });
    const cacheKeyArb = fc.string({ minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(cacheKeyArb, templatesArb, (cacheKey, templates) => {
        // Store templates in cache
        cacheManager.setCachedTemplates(cacheKey, templates);
        
        // Manually set timestamp to 6 minutes ago (expired)
        const fullKey = `kiroSteeringLoader.cache.${cacheKey}`;
        const entry = mockGlobalState.get(fullKey);
        entry.timestamp = Date.now() - (6 * 60 * 1000);
        mockGlobalState.set(fullKey, entry);
        
        // Cache should not be fresh
        expect(cacheManager.isCacheFresh(cacheKey)).toBe(false);
        
        // Should return null for expired cache
        const retrieved = cacheManager.getCachedTemplates(cacheKey);
        expect(retrieved).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should clear all cache entries', () => {
    const templateArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: hexStringArb(40),
      size: fc.integer({ min: 0, max: 1000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constantFrom('file' as const, 'dir' as const)
    });

    const templatesArb = fc.array(templateArb, { minLength: 1, maxLength: 10 });
    const cacheKeysArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(cacheKeysArb, templatesArb, (cacheKeys, templates) => {
        // Store templates for multiple keys
        for (const key of cacheKeys) {
          cacheManager.setCachedTemplates(key, templates);
        }
        
        // Verify all are cached
        for (const key of cacheKeys) {
          expect(cacheManager.getCachedTemplates(key)).toEqual(templates);
        }
        
        // Clear all cache
        cacheManager.clearAllCache();
        
        // Verify all are cleared
        for (const key of cacheKeys) {
          expect(cacheManager.getCachedTemplates(key)).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});

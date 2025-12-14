/**
 * CacheManager - Manages local caching of repository contents
 * 
 * Implements LRU cache with TTL for GitHub repository contents
 */

import * as vscode from 'vscode';
import { TemplateMetadata, CacheEntry } from '../types';

const CACHE_KEY_PREFIX = 'kiroSteeringLoader.cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 100;

export class CacheManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Retrieves cached templates if available and fresh
   * @param cacheKey - Unique key for the repository/path combination
   * @returns Cached templates or null if cache miss/expired
   */
  getCachedTemplates(cacheKey: string): TemplateMetadata[] | null {
    const fullKey = this.getFullKey(cacheKey);
    const entry = this.context.globalState.get<CacheEntry>(fullKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache is still fresh
    if (!this.isCacheFresh(cacheKey)) {
      this.invalidateCache(cacheKey);
      return null;
    }
    
    // Update access time for LRU
    this.updateAccessTime(cacheKey);
    
    return entry.templates;
  }

  /**
   * Stores templates in cache with timestamp
   * @param cacheKey - Unique key for the repository/path combination
   * @param templates - Template metadata to cache
   * @param sha - Optional repository tree SHA for change detection
   */
  setCachedTemplates(cacheKey: string, templates: TemplateMetadata[], sha: string = ''): void {
    const fullKey = this.getFullKey(cacheKey);
    const isExistingEntry = this.context.globalState.get<CacheEntry>(fullKey) !== undefined;
    
    // Only enforce cache limit if we're adding a new entry
    if (!isExistingEntry) {
      this.enforceCacheLimit();
    }
    
    const entry: CacheEntry = {
      templates,
      timestamp: Date.now(),
      sha
    };
    
    this.context.globalState.update(fullKey, entry);
    this.updateAccessTime(cacheKey);
  }

  /**
   * Invalidates cache for a specific key
   * @param cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey: string): void {
    const fullKey = this.getFullKey(cacheKey);
    this.context.globalState.update(fullKey, undefined);
    this.removeAccessTime(cacheKey);
  }

  /**
   * Clears all cached data
   */
  clearAllCache(): void {
    const keys = this.context.globalState.keys();
    
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        this.context.globalState.update(key, undefined);
      }
    }
    
    // Clear access times
    this.context.globalState.update(this.getAccessTimesKey(), undefined);
  }

  /**
   * Checks if cached data is still fresh
   * @param cacheKey - Cache key to check
   * @returns True if cache is fresh (< 5 minutes old)
   */
  isCacheFresh(cacheKey: string): boolean {
    const fullKey = this.getFullKey(cacheKey);
    const entry = this.context.globalState.get<CacheEntry>(fullKey);
    
    if (!entry) {
      return false;
    }
    
    const age = Date.now() - entry.timestamp;
    return age < CACHE_TTL_MS;
  }

  /**
   * Checks if cache entry exists and matches the given SHA
   * @param cacheKey - Cache key to check
   * @param sha - SHA to compare against
   * @returns True if cache exists and SHA matches
   */
  isCacheValid(cacheKey: string, sha: string): boolean {
    const fullKey = this.getFullKey(cacheKey);
    const entry = this.context.globalState.get<CacheEntry>(fullKey);
    
    if (!entry) {
      return false;
    }
    
    return entry.sha === sha && this.isCacheFresh(cacheKey);
  }

  /**
   * Gets the full storage key for a cache key
   */
  private getFullKey(cacheKey: string): string {
    return `${CACHE_KEY_PREFIX}.${cacheKey}`;
  }

  /**
   * Gets the key for storing access times
   */
  private getAccessTimesKey(): string {
    return `${CACHE_KEY_PREFIX}.accessTimes`;
  }

  /**
   * Updates the access time for LRU tracking
   */
  private updateAccessTime(cacheKey: string): void {
    const accessTimes = this.context.globalState.get<Record<string, number>>(this.getAccessTimesKey(), {});
    accessTimes[cacheKey] = Date.now();
    this.context.globalState.update(this.getAccessTimesKey(), accessTimes);
  }

  /**
   * Removes the access time for a cache key
   */
  private removeAccessTime(cacheKey: string): void {
    const accessTimes = this.context.globalState.get<Record<string, number>>(this.getAccessTimesKey(), {});
    delete accessTimes[cacheKey];
    this.context.globalState.update(this.getAccessTimesKey(), accessTimes);
  }

  /**
   * Enforces cache size limit using LRU eviction
   */
  private enforceCacheLimit(): void {
    const keys = this.context.globalState.keys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX) && !key.includes('accessTimes'));
    
    if (cacheKeys.length >= MAX_CACHE_ENTRIES) {
      // Get access times
      const accessTimes = this.context.globalState.get<Record<string, number>>(this.getAccessTimesKey(), {});
      
      // Find least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const fullKey of cacheKeys) {
        const cacheKey = fullKey.replace(`${CACHE_KEY_PREFIX}.`, '');
        const accessTime = accessTimes[cacheKey] || 0;
        
        if (accessTime < oldestTime) {
          oldestTime = accessTime;
          oldestKey = cacheKey;
        }
      }
      
      // Evict oldest entry
      if (oldestKey) {
        this.invalidateCache(oldestKey);
      }
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    freshEntries: number;
    staleEntries: number;
  } {
    const keys = this.context.globalState.keys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX) && !key.includes('accessTimes'));
    
    let freshEntries = 0;
    let staleEntries = 0;
    
    for (const fullKey of cacheKeys) {
      const cacheKey = fullKey.replace(`${CACHE_KEY_PREFIX}.`, '');
      if (this.isCacheFresh(cacheKey)) {
        freshEntries++;
      } else {
        staleEntries++;
      }
    }
    
    return {
      totalEntries: cacheKeys.length,
      freshEntries,
      staleEntries
    };
  }
}

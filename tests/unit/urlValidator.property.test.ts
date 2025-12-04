/**
 * Property-based tests for URL validation
 * Feature: github-steering-loader
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseRepositoryUrl, validateRepositoryConfig } from '../../src/utils/urlValidator';
import { RepositoryConfig } from '../../src/types';

describe('URL Validator - Property Tests', () => {
  /**
   * Property 1: URL validation accepts valid formats
   * Feature: github-steering-loader, Property 1: URL validation accepts valid formats
   * Validates: Requirements 1.1
   */
  it('should accept and correctly parse valid GitHub repository URLs', () => {
    // Generator for valid GitHub names (alphanumeric and hyphens, not starting with hyphen)
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        // Must not start with hyphen, must contain only valid chars, and must contain at least one alphanumeric
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    // Generator for valid repository configs
    const validRepoConfigArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb,
      path: fc.option(fc.array(githubNameArb, { minLength: 1, maxLength: 5 }).map(parts => parts.join('/')), { nil: undefined })
    });

    fc.assert(
      fc.property(validRepoConfigArb, (config) => {
        // Test full URL format
        const fullUrl = `https://github.com/${config.owner}/${config.repo}`;
        const parsedFull = parseRepositoryUrl(fullUrl);
        
        expect(parsedFull.owner).toBe(config.owner);
        expect(parsedFull.repo).toBe(config.repo);
        expect(parsedFull.branch).toBe('main');

        // Test short format without path
        const shortUrl = `${config.owner}/${config.repo}`;
        const parsedShort = parseRepositoryUrl(shortUrl);
        
        expect(parsedShort.owner).toBe(config.owner);
        expect(parsedShort.repo).toBe(config.repo);
        expect(parsedShort.branch).toBe('main');

        // Test short format with path if path exists
        if (config.path) {
          const urlWithPath = `${config.owner}/${config.repo}/${config.path}`;
          const parsedWithPath = parseRepositoryUrl(urlWithPath);
          
          expect(parsedWithPath.owner).toBe(config.owner);
          expect(parsedWithPath.repo).toBe(config.repo);
          expect(parsedWithPath.path).toBe(config.path);
          expect(parsedWithPath.branch).toBe('main');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Repository path parsing consistency
   * Feature: github-steering-loader, Property 2: Repository path parsing consistency
   * Validates: Requirements 1.2
   */
  it('should consistently parse repository configurations with path components', () => {
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    const pathSegmentArb = fc.array(githubNameArb, { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(githubNameArb, githubNameArb, pathSegmentArb, (owner, repo, pathSegments) => {
        const path = pathSegments.join('/');
        const urlWithPath = `${owner}/${repo}/${path}`;
        
        const parsed = parseRepositoryUrl(urlWithPath);
        
        // Should correctly extract all components
        expect(parsed.owner).toBe(owner);
        expect(parsed.repo).toBe(repo);
        expect(parsed.path).toBe(path);
        
        // Validate the parsed config
        expect(validateRepositoryConfig(parsed)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Configuration persistence round-trip
   * Feature: github-steering-loader, Property 3: Configuration persistence round-trip
   * Validates: Requirements 1.3
   * 
   * Note: This property will be fully tested in ConfigurationService tests
   * Here we test that valid configs remain valid after parsing
   */
  it('should maintain configuration validity through parsing', () => {
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    const configArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb,
      path: fc.option(fc.string(), { nil: undefined }),
      branch: fc.option(fc.constantFrom('main', 'master', 'develop'), { nil: undefined })
    });

    fc.assert(
      fc.property(configArb, (config) => {
        // A valid config should pass validation
        const isValid = validateRepositoryConfig(config);
        expect(isValid).toBe(true);
        
        // Normalize path - trim whitespace, remove slashes, and treat empty as undefined
        const normalizedPath = config.path && config.path.trim().replace(/^\/+|\/+$/g, '').length > 0 
          ? config.path.trim().replace(/^\/+|\/+$/g, '')
          : undefined;
        
        // Reconstructing URL and parsing should yield equivalent config
        const url = normalizedPath
          ? `${config.owner}/${config.repo}/${normalizedPath}`
          : `${config.owner}/${config.repo}`;
        
        const parsed = parseRepositoryUrl(url);
        expect(parsed.owner).toBe(config.owner);
        expect(parsed.repo).toBe(config.repo);
        
        // Path should match after normalization
        if (normalizedPath) {
          expect(parsed.path).toBe(normalizedPath);
        } else {
          expect(parsed.path).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Invalid URL rejection
   * Feature: github-steering-loader, Property 4: Invalid URL rejection
   * Validates: Requirements 1.4
   */
  it('should reject invalid repository URL formats', () => {
    // Generator for invalid URLs
    const invalidUrlArb = fc.oneof(
      // Empty string
      fc.constant(''),
      // Only whitespace
      fc.constant('   '),
      // Missing repo (only owner)
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
      // Starting with hyphen
      fc.record({
        owner: fc.constant('-invalid'),
        repo: fc.string({ minLength: 1, maxLength: 20 })
      }).map(({ owner, repo }) => `${owner}/${repo}`),
      // Repo starting with hyphen (ensure owner is valid)
      fc.record({
        owner: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(s)),
        repo: fc.constant('-invalid')
      }).map(({ owner, repo }) => `${owner}/${repo}`),
      // Invalid characters (special chars not allowed)
      fc.record({
        owner: fc.string({ minLength: 1, maxLength: 20 }),
        repo: fc.array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')'), { minLength: 1, maxLength: 5 }).map(chars => chars.join(''))
      }).map(({ owner, repo }) => `${owner}/${repo}`)
    );

    fc.assert(
      fc.property(invalidUrlArb, (url) => {
        // Invalid URLs should throw an error
        expect(() => parseRepositoryUrl(url)).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('should reject URLs with invalid owner or repo names', () => {
    // Generator for names with invalid characters
    const invalidNameArb = fc.oneof(
      // Contains spaces
      fc.constant('invalid name'),
      // Contains special characters
      fc.array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*'), { minLength: 1, maxLength: 10 }).map(chars => chars.join('')),
      // Starts with hyphen
      fc.constant('-invalid'),
      // Only hyphens
      fc.constant('---'),
      // Empty
      fc.constant('')
    );

    const validNameArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(name => /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name));

    fc.assert(
      fc.property(invalidNameArb, validNameArb, (invalidName, validName) => {
        // Invalid owner with valid repo should throw
        expect(() => parseRepositoryUrl(`${invalidName}/${validName}`)).toThrow();
        
        // Valid owner with invalid repo should throw
        expect(() => parseRepositoryUrl(`${validName}/${invalidName}`)).toThrow();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-based tests for display utilities
 * Feature: github-steering-loader
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  removeExtension,
  generateTooltip,
  formatFileSize,
  formatDisplayName,
  formatConfigurationSource
} from '../../src/utils/displayUtils';
import { TemplateMetadata } from '../../src/types';

describe('Display Utils - Property Tests', () => {
  /**
   * Property 15: Filename extension removal
   * Feature: github-steering-loader, Property 15: Filename extension removal
   * Validates: Requirements 6.1
   */
  it('should remove .md extension from any filename', () => {
    const filenameArb = fc.string({ minLength: 1, maxLength: 50 }).map(name => name + '.md');

    fc.assert(
      fc.property(filenameArb, (filename) => {
        const result = removeExtension(filename);
        
        // Result should not end with .md
        expect(result).not.toMatch(/\.md$/);
        
        // Result should be the filename without .md
        expect(result).toBe(filename.substring(0, filename.length - 3));
        
        // Result should be shorter than original
        expect(result.length).toBe(filename.length - 3);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle filenames without .md extension', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.endsWith('.md')),
        (filename) => {
          const result = removeExtension(filename);
          
          // Should return unchanged if no .md extension
          expect(result).toBe(filename);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Tooltip content inclusion
   * Feature: github-steering-loader, Property 16: Tooltip content inclusion
   * Validates: Requirements 6.2
   */
  it('should include filename and size in tooltip', () => {
    const metadataArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      filename: fc.string({ minLength: 1, maxLength: 50 }).map(name => name + '.md'),
      path: fc.string({ minLength: 1, maxLength: 100 }),
      sha: fc.array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 40, maxLength: 40 }).map(c => c.join('')),
      size: fc.integer({ min: 0, max: 10000000 }),
      downloadUrl: fc.webUrl(),
      type: fc.constant('file' as const)
    });

    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const tooltip = generateTooltip(metadata);
        
        // Tooltip should contain the filename
        expect(tooltip).toContain(metadata.filename);
        
        // Tooltip should contain size information (KB)
        expect(tooltip).toMatch(/\d+\.\d+\s*KB/);
        
        // Tooltip should have the format: filename (size KB)
        expect(tooltip).toMatch(/^.+\s+\(\d+\.\d+\s*KB\)$/);
      }),
      { numRuns: 100 }
    );
  });

  it('should format file size correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }),
        (bytes) => {
          const formatted = formatFileSize(bytes);
          
          // Should contain a number
          expect(formatted).toMatch(/\d+/);
          
          // Should contain a unit
          expect(formatted).toMatch(/\s*(B|KB|MB|GB)$/);
          
          // Should be a valid format (0 B is special case without decimal)
          if (bytes === 0) {
            expect(formatted).toBe('0 B');
          } else {
            expect(formatted).toMatch(/^\d+\.\d+\s+(B|KB|MB|GB)$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero bytes', () => {
    const result = formatFileSize(0);
    expect(result).toBe('0 B');
  });

  it('should format display names correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).map(name => name + '.md'),
        (filename) => {
          const displayName = formatDisplayName(filename);
          
          // Should not contain .md extension
          expect(displayName).not.toMatch(/\.md$/);
          
          // Should be a string
          expect(typeof displayName).toBe('string');
          
          // Should not be empty
          expect(displayName.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Configuration source display
   * Feature: github-steering-loader, Property 20: Configuration source display
   * Validates: Requirements 8.4
   */
  it('should format GitHub configuration source with owner and repo', () => {
    const githubConfigArb = fc.record({
      owner: fc.string({ minLength: 1, maxLength: 39 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
      repo: fc.string({ minLength: 1, maxLength: 100 }).filter(s => /^[a-zA-Z0-9-_.]+$/.test(s)),
      path: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
    });

    fc.assert(
      fc.property(githubConfigArb, (config) => {
        const formatted = formatConfigurationSource('github', config);
        
        // Should contain 'GitHub'
        expect(formatted).toContain('GitHub');
        
        // Should contain owner
        expect(formatted).toContain(config.owner);
        
        // Should contain repo
        expect(formatted).toContain(config.repo);
        
        // Should have format: GitHub: owner/repo or GitHub: owner/repo/path
        if (config.path) {
          expect(formatted).toContain(config.path);
          expect(formatted).toBe(`GitHub: ${config.owner}/${config.repo}/${config.path}`);
        } else {
          expect(formatted).toBe(`GitHub: ${config.owner}/${config.repo}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should format local configuration source', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (localPath) => {
          const formatted = formatConfigurationSource('local', { localPath });
          
          // Should contain 'Local'
          expect(formatted).toContain('Local');
          
          // Should contain the path
          expect(formatted).toContain(localPath);
          
          // Should have format: Local: path
          expect(formatted).toBe(`Local: ${localPath}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle none configuration source', () => {
    const formatted = formatConfigurationSource('none');
    expect(formatted).toBe('No Configuration');
  });

  it('should handle GitHub source without details', () => {
    const formatted = formatConfigurationSource('github');
    expect(formatted).toBe('GitHub Repository');
  });

  it('should handle local source without details', () => {
    const formatted = formatConfigurationSource('local');
    expect(formatted).toBe('Local Filesystem');
  });
});

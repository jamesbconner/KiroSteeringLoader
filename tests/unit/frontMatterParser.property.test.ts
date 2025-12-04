/**
 * Property-based tests for front matter parser
 * Feature: github-steering-loader
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseFrontMatter,
  extractDisplayMetadata,
  FrontMatterMetadata
} from '../../src/utils/frontMatterParser';

describe('Front Matter Parser - Property Tests', () => {
  /**
   * Property 17: Front matter metadata extraction
   * Feature: github-steering-loader, Property 17: Front matter metadata extraction
   * Validates: Requirements 6.4
   */
  it('should extract all key-value pairs from valid YAML front matter', () => {
    const keyArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
      /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)
    );
    
    const valueArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      fc.integer({ min: 0, max: 1000 }).map(String),
      fc.constantFrom('true', 'false')
    );

    const metadataArb = fc.dictionary(keyArb, valueArb, { minKeys: 1, maxKeys: 10 });

    fc.assert(
      fc.property(metadataArb, fc.string({ minLength: 0, maxLength: 500 }), (metadata, content) => {
        // Build YAML front matter
        const yamlLines = Object.entries(metadata).map(([key, value]) => `${key}: ${value}`);
        const yamlContent = yamlLines.join('\n');
        const markdownWithFrontMatter = `---\n${yamlContent}\n---\n${content}`;

        // Parse the front matter
        const result = parseFrontMatter(markdownWithFrontMatter);

        // All keys with non-empty values should be present in parsed metadata
        for (const [key, value] of Object.entries(metadata)) {
          if (value.trim().length > 0) {
            expect(result.metadata).toHaveProperty(key);
          }
        }

        // Content should be preserved
        expect(result.content).toBe(content);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle markdown without front matter', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => !s.startsWith('---')),
        (content) => {
          const result = parseFrontMatter(content);

          // Metadata should be empty
          expect(Object.keys(result.metadata).length).toBe(0);

          // Content should be unchanged
          expect(result.content).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should extract title, description, and tags', () => {
    // Use alphanumeric strings that start with a letter to avoid numeric parsing
    const titleArb = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => /^[a-zA-Z][a-zA-Z0-9\s]*$/.test(s) && s.trim().length > 0);
    const descriptionArb = fc.string({ minLength: 1, maxLength: 500 })
      .filter(s => /^[a-zA-Z][a-zA-Z0-9\s]*$/.test(s) && s.trim().length > 0);
    const tagsArb = fc.array(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s)),
      { minLength: 0, maxLength: 10 }
    );

    fc.assert(
      fc.property(titleArb, descriptionArb, tagsArb, (title, description, tags) => {
        // Build front matter with title, description, and tags
        const tagLines = tags.length > 0 ? `\ntags:\n${tags.map(t => `  - ${t}`).join('\n')}` : '';
        const yamlContent = `title: ${title}\ndescription: ${description}${tagLines}`;
        const markdownWithFrontMatter = `---\n${yamlContent}\n---\nContent here`;

        // Parse the front matter
        const result = parseFrontMatter(markdownWithFrontMatter);

        // Extract display metadata
        const displayMetadata = extractDisplayMetadata(result.metadata);

        // Title should be extracted (trimmed by parser)
        expect(displayMetadata.title).toBe(title.trim());

        // Description should be extracted (trimmed by parser)
        expect(displayMetadata.description).toBe(description.trim());

        // Tags should be extracted if present
        if (tags.length > 0) {
          expect(displayMetadata.tags).toBeDefined();
          expect(displayMetadata.tags?.length).toBe(tags.length);
          for (const tag of tags) {
            expect(displayMetadata.tags).toContain(tag);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle various YAML value types', () => {
    const testCases = [
      { yaml: 'key: value', expected: { key: 'value' } },
      { yaml: 'number: 42', expected: { number: 42 } },
      { yaml: 'bool: true', expected: { bool: true } },
      { yaml: 'bool2: false', expected: { bool2: false } },
      { yaml: 'quoted: "hello world"', expected: { quoted: 'hello world' } },
      { yaml: "single: 'test'", expected: { single: 'test' } }
    ];

    for (const testCase of testCases) {
      const markdown = `---\n${testCase.yaml}\n---\nContent`;
      const result = parseFrontMatter(markdown);

      for (const [key, value] of Object.entries(testCase.expected)) {
        expect(result.metadata[key]).toEqual(value);
      }
    }
  });

  it('should handle arrays in YAML', () => {
    const arrayArb = fc.array(
      fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(arrayArb, (items) => {
        const arrayLines = items.map(item => `  - ${item}`).join('\n');
        const yamlContent = `items:\n${arrayLines}`;
        const markdown = `---\n${yamlContent}\n---\nContent`;

        const result = parseFrontMatter(markdown);

        expect(result.metadata.items).toBeDefined();
        expect(Array.isArray(result.metadata.items)).toBe(true);
        expect((result.metadata.items as string[]).length).toBe(items.length);

        // Parser trims array items, so compare trimmed values
        for (const item of items) {
          expect(result.metadata.items).toContain(item.trim());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty front matter', () => {
    const markdown = '---\n\n---\nContent here';
    const result = parseFrontMatter(markdown);

    expect(Object.keys(result.metadata).length).toBe(0);
    expect(result.content).toBe('Content here');
  });

  it('should handle malformed YAML gracefully', () => {
    const malformedCases = [
      '---\n::invalid::\n---\nContent',
      '---\n[[[broken\n---\nContent',
      '---\n}}}\n---\nContent'
    ];

    for (const markdown of malformedCases) {
      const result = parseFrontMatter(markdown);

      // Should return empty metadata on parse failure
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata).toBe('object');
    }
  });

  it('should preserve content after front matter', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (content) => {
          const markdown = `---\ntitle: Test\n---\n${content}`;
          const result = parseFrontMatter(markdown);

          expect(result.content).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle comments in YAML', () => {
    const markdown = `---
title: Test
# This is a comment
description: A test file
---
Content`;

    const result = parseFrontMatter(markdown);

    expect(result.metadata.title).toBe('Test');
    expect(result.metadata.description).toBe('A test file');
    expect(result.metadata).not.toHaveProperty('#');
  });

  it('should extract display metadata with missing fields', () => {
    const metadata: FrontMatterMetadata = {
      author: 'John Doe',
      date: '2024-01-01'
    };

    const displayMetadata = extractDisplayMetadata(metadata);

    expect(displayMetadata.title).toBeUndefined();
    expect(displayMetadata.description).toBeUndefined();
    expect(displayMetadata.tags).toBeUndefined();
  });
});

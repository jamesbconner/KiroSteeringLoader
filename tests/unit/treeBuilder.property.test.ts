/**
 * Property-based tests for tree builder utilities
 * Feature: github-steering-loader
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildTreeStructure,
  filterByDirectory,
  filterByTag,
  flattenTree,
  getDirectoryPaths,
  TreeNode
} from '../../src/utils/treeBuilder';
import { TemplateMetadata } from '../../src/types';

describe('Tree Builder - Property Tests', () => {
  // Helper to create template metadata
  const createTemplate = (path: string, name?: string): TemplateMetadata => ({
    name: name || path.split('/').pop()?.replace('.md', '') || 'template',
    filename: path.split('/').pop() || 'template.md',
    path,
    sha: 'abc123',
    size: 1000,
    downloadUrl: 'https://example.com',
    type: 'file'
  });

  /**
   * Property 23: Hierarchical tree structure generation
   * Feature: github-steering-loader, Property 23: Hierarchical tree structure generation
   * Validates: Requirements 10.1
   */
  it('should create parent directory nodes for each unique directory path', () => {
    const pathArb = fc.array(
      fc.tuple(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)), { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)).map(s => s + '.md')
      ),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(pathArb, (pathTuples) => {
        // Build templates from path tuples
        const templates = pathTuples.map(([dirs, filename]) => {
          const path = [...dirs, filename].join('/');
          return createTemplate(path);
        });

        // Build tree structure
        const tree = buildTreeStructure(templates);

        // Collect all directory paths from templates
        const expectedDirs = new Set<string>();
        for (const template of templates) {
          const parts = template.path.split('/');
          let currentPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            expectedDirs.add(currentPath);
          }
        }

        // Collect all directory nodes from tree
        const actualDirs = new Set<string>();
        function collectDirs(nodes: TreeNode[]) {
          for (const node of nodes) {
            if (node.type === 'directory') {
              actualDirs.add(node.path);
              collectDirs(node.children);
            }
          }
        }
        collectDirs(tree);

        // All expected directories should be present
        for (const dir of expectedDirs) {
          expect(actualDirs.has(dir)).toBe(true);
        }

        // All files should be in the tree
        const flatFiles = flattenTree(tree);
        expect(flatFiles.length).toBe(templates.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should place file nodes as children of their respective directories', () => {
    const templates = [
      createTemplate('dir1/file1.md'),
      createTemplate('dir1/file2.md'),
      createTemplate('dir2/file3.md'),
      createTemplate('file4.md')
    ];

    const tree = buildTreeStructure(templates);

    // Should have 3 root nodes: dir1, dir2, file4
    expect(tree.length).toBe(3);

    // Find dir1
    const dir1 = tree.find(n => n.name === 'dir1');
    expect(dir1).toBeDefined();
    expect(dir1?.type).toBe('directory');
    expect(dir1?.children.length).toBe(2);

    // Find dir2
    const dir2 = tree.find(n => n.name === 'dir2');
    expect(dir2).toBeDefined();
    expect(dir2?.type).toBe('directory');
    expect(dir2?.children.length).toBe(1);

    // Find file4 at root
    const file4 = tree.find(n => n.name === 'file4.md');
    expect(file4).toBeDefined();
    expect(file4?.type).toBe('file');
  });

  it('should handle nested directories correctly', () => {
    const templates = [
      createTemplate('a/b/c/file1.md'),
      createTemplate('a/b/file2.md'),
      createTemplate('a/file3.md')
    ];

    const tree = buildTreeStructure(templates);

    // Should have 1 root node: a
    expect(tree.length).toBe(1);

    const a = tree[0];
    expect(a.name).toBe('a');
    expect(a.type).toBe('directory');
    expect(a.children.length).toBe(2); // b directory and file3.md

    // Find b directory
    const b = a.children.find(n => n.name === 'b');
    expect(b).toBeDefined();
    expect(b?.type).toBe('directory');
    expect(b?.children.length).toBe(2); // c directory and file2.md

    // Find c directory
    const c = b?.children.find(n => n.name === 'c');
    expect(c).toBeDefined();
    expect(c?.type).toBe('directory');
    expect(c?.children.length).toBe(1); // file1.md
  });

  /**
   * Property 24: Directory filtering
   * Feature: github-steering-loader, Property 24: Directory filtering
   * Validates: Requirements 10.2
   */
  it('should filter templates by directory path', () => {
    const dirArb = fc.array(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
      { minLength: 1, maxLength: 3 }
    );

    const templatesArb = fc.array(
      fc.tuple(dirArb, fc.string({ minLength: 1, maxLength: 20 }).map(s => s + '.md')),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(templatesArb, dirArb, (templateTuples, filterDir) => {
        // Build templates
        const templates = templateTuples.map(([dirs, filename]) => {
          const path = [...dirs, filename].join('/');
          return createTemplate(path);
        });

        const filterPath = filterDir.join('/');
        const filtered = filterByDirectory(templates, filterPath);

        // All filtered templates should start with the filter path
        for (const template of filtered) {
          const normalizedFilter = filterPath.endsWith('/') ? filterPath : `${filterPath}/`;
          const startsWithPath = template.path.startsWith(normalizedFilter) || template.path === filterPath;
          expect(startsWithPath).toBe(true);
        }

        // Count how many templates should match
        const expectedCount = templates.filter(t => {
          const normalizedFilter = filterPath.endsWith('/') ? filterPath : `${filterPath}/`;
          return t.path.startsWith(normalizedFilter) || t.path === filterPath;
        }).length;

        expect(filtered.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should return only files within specified directory', () => {
    const templates = [
      createTemplate('dir1/file1.md'),
      createTemplate('dir1/file2.md'),
      createTemplate('dir1/subdir/file3.md'),
      createTemplate('dir2/file4.md'),
      createTemplate('file5.md')
    ];

    const filtered = filterByDirectory(templates, 'dir1');

    // Should include dir1/file1.md, dir1/file2.md, dir1/subdir/file3.md
    expect(filtered.length).toBe(3);
    expect(filtered.every(t => t.path.startsWith('dir1/'))).toBe(true);
  });

  /**
   * Property 25: Tag-based filtering
   * Feature: github-steering-loader, Property 25: Tag-based filtering
   * Validates: Requirements 10.3
   */
  it('should filter templates by tag', () => {
    const tagArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s));
    const tagsArb = fc.array(tagArb, { minLength: 0, maxLength: 5 });

    const templatesWithTagsArb = fc.array(
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.md'),
        tagsArb
      ),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(templatesWithTagsArb, tagArb, (templateTuples, filterTag) => {
        // Build templates with tag mapping
        const tagMap = new Map<string, string[]>();
        const templates = templateTuples.map(([path, tags]) => {
          const template = createTemplate(path);
          tagMap.set(template.path, tags);
          return template;
        });

        // Filter by tag
        const filtered = filterByTag(templates, filterTag, (t) => tagMap.get(t.path) || []);

        // All filtered templates should have the filter tag
        for (const template of filtered) {
          const tags = tagMap.get(template.path) || [];
          expect(tags.includes(filterTag)).toBe(true);
        }

        // Count expected matches
        const expectedCount = templates.filter(t => {
          const tags = tagMap.get(t.path) || [];
          return tags.includes(filterTag);
        }).length;

        expect(filtered.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no templates have the tag', () => {
    const templates = [
      createTemplate('file1.md'),
      createTemplate('file2.md')
    ];

    const getTags = () => ['tag1', 'tag2'];
    const filtered = filterByTag(templates, 'nonexistent', getTags);

    expect(filtered.length).toBe(0);
  });

  it('should handle templates with no tags', () => {
    const templates = [
      createTemplate('file1.md'),
      createTemplate('file2.md')
    ];

    const getTags = () => [];
    const filtered = filterByTag(templates, 'anytag', getTags);

    expect(filtered.length).toBe(0);
  });

  it('should get all unique directory paths', () => {
    const templates = [
      createTemplate('a/b/c/file1.md'),
      createTemplate('a/b/file2.md'),
      createTemplate('a/file3.md'),
      createTemplate('x/y/file4.md')
    ];

    const dirs = getDirectoryPaths(templates);

    expect(dirs.has('a')).toBe(true);
    expect(dirs.has('a/b')).toBe(true);
    expect(dirs.has('a/b/c')).toBe(true);
    expect(dirs.has('x')).toBe(true);
    expect(dirs.has('x/y')).toBe(true);
    expect(dirs.size).toBe(5);
  });

  it('should flatten tree back to template list', () => {
    const templates = [
      createTemplate('dir1/file1.md'),
      createTemplate('dir1/file2.md'),
      createTemplate('dir2/file3.md')
    ];

    const tree = buildTreeStructure(templates);
    const flattened = flattenTree(tree);

    expect(flattened.length).toBe(templates.length);
    
    // All original templates should be in flattened list
    for (const template of templates) {
      const found = flattened.find(t => t.path === template.path);
      expect(found).toBeDefined();
    }
  });

  it('should handle empty template list', () => {
    const tree = buildTreeStructure([]);
    expect(tree.length).toBe(0);
  });

  it('should handle single file at root', () => {
    const templates = [createTemplate('file.md')];
    const tree = buildTreeStructure(templates);

    expect(tree.length).toBe(1);
    expect(tree[0].type).toBe('file');
    expect(tree[0].name).toBe('file.md');
  });
});

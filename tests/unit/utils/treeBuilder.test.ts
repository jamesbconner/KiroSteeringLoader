/**
 * Tree Builder Tests
 * 
 * Comprehensive tests for hierarchical template organization including:
 * - Tree structure building from flat template lists
 * - Directory and tag filtering operations
 * - Tree node conversion to VS Code tree items
 * - Tree flattening and directory path extraction
 * - Edge cases: empty lists, single files, deep nesting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTreeStructure,
  filterByDirectory,
  filterByTag,
  convertToEnhancedItems,
  flattenTree,
  getDirectoryPaths,
  type TreeNode
} from '../../../src/utils/treeBuilder';
import type { TemplateMetadata, EnhancedTemplateItem } from '../../../src/types';

describe('treeBuilder', () => {
  // Sample template data for testing
  const sampleTemplates: TemplateMetadata[] = [
    {
      name: 'basic-component',
      filename: 'basic-component.md',
      path: 'components/basic-component.md',
      sha: 'abc123',
      size: 1024,
      downloadUrl: 'https://example.com/basic-component.md',
      type: 'file'
    },
    {
      name: 'advanced-component',
      filename: 'advanced-component.md',
      path: 'components/advanced-component.md',
      sha: 'def456',
      size: 2048,
      downloadUrl: 'https://example.com/advanced-component.md',
      type: 'file'
    },
    {
      name: 'react-hook',
      filename: 'react-hook.md',
      path: 'components/hooks/react-hook.md',
      sha: 'ghi789',
      size: 1536,
      downloadUrl: 'https://example.com/react-hook.md',
      type: 'file'
    },
    {
      name: 'custom-hook',
      filename: 'custom-hook.md',
      path: 'components/hooks/custom-hook.md',
      sha: 'jkl012',
      size: 1200,
      downloadUrl: 'https://example.com/custom-hook.md',
      type: 'file'
    },
    {
      name: 'api-service',
      filename: 'api-service.md',
      path: 'services/api-service.md',
      sha: 'mno345',
      size: 3072,
      downloadUrl: 'https://example.com/api-service.md',
      type: 'file'
    },
    {
      name: 'readme',
      filename: 'readme.md',
      path: 'readme.md',
      sha: 'pqr678',
      size: 512,
      downloadUrl: 'https://example.com/readme.md',
      type: 'file'
    }
  ];

  describe('buildTreeStructure', () => {
    it('should build hierarchical tree from flat template list', () => {
      const result = buildTreeStructure(sampleTemplates);

      expect(result).toHaveLength(3); // components/, services/, readme.md

      // Check components directory
      const componentsDir = result.find(node => node.name === 'components');
      expect(componentsDir).toBeDefined();
      expect(componentsDir?.type).toBe('directory');
      expect(componentsDir?.children).toHaveLength(3); // 2 files + hooks/

      // Check hooks subdirectory
      const hooksDir = componentsDir?.children.find(child => child.name === 'hooks');
      expect(hooksDir).toBeDefined();
      expect(hooksDir?.type).toBe('directory');
      expect(hooksDir?.children).toHaveLength(2);

      // Check services directory
      const servicesDir = result.find(node => node.name === 'services');
      expect(servicesDir).toBeDefined();
      expect(servicesDir?.type).toBe('directory');
      expect(servicesDir?.children).toHaveLength(1);

      // Check root file
      const readmeFile = result.find(node => node.name === 'readme.md');
      expect(readmeFile).toBeDefined();
      expect(readmeFile?.type).toBe('file');
      expect(readmeFile?.metadata).toBeDefined();
    });

    it('should handle empty template list', () => {
      const result = buildTreeStructure([]);
      expect(result).toEqual([]);
    });

    it('should handle single file at root', () => {
      const singleTemplate: TemplateMetadata[] = [{
        name: 'single',
        filename: 'single.md',
        path: 'single.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/single.md',
        type: 'file'
      }];

      const result = buildTreeStructure(singleTemplate);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('file');
      expect(result[0].name).toBe('single.md');
      expect(result[0].metadata).toBeDefined();
    });

    it('should handle deep nesting', () => {
      const deepTemplates: TemplateMetadata[] = [{
        name: 'deep-file',
        filename: 'deep-file.md',
        path: 'level1/level2/level3/level4/deep-file.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/deep-file.md',
        type: 'file'
      }];

      const result = buildTreeStructure(deepTemplates);
      expect(result).toHaveLength(1);

      // Navigate through the hierarchy
      let current = result[0];
      expect(current.name).toBe('level1');
      expect(current.type).toBe('directory');

      current = current.children[0];
      expect(current.name).toBe('level2');
      expect(current.type).toBe('directory');

      current = current.children[0];
      expect(current.name).toBe('level3');
      expect(current.type).toBe('directory');

      current = current.children[0];
      expect(current.name).toBe('level4');
      expect(current.type).toBe('directory');

      const file = current.children[0];
      expect(file.name).toBe('deep-file.md');
      expect(file.type).toBe('file');
    });

    it('should sort templates by path for consistent ordering', () => {
      const unsortedTemplates: TemplateMetadata[] = [
        {
          name: 'zebra',
          filename: 'zebra.md',
          path: 'zebra.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/zebra.md',
          type: 'file'
        },
        {
          name: 'alpha',
          filename: 'alpha.md',
          path: 'alpha.md',
          sha: 'def456',
          size: 1024,
          downloadUrl: 'https://example.com/alpha.md',
          type: 'file'
        }
      ];

      const result = buildTreeStructure(unsortedTemplates);
      expect(result[0].name).toBe('alpha.md');
      expect(result[1].name).toBe('zebra.md');
    });

    it('should handle files with same directory prefix', () => {
      const templates: TemplateMetadata[] = [
        {
          name: 'component',
          filename: 'component.md',
          path: 'comp/component.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/component.md',
          type: 'file'
        },
        {
          name: 'component-test',
          filename: 'component-test.md',
          path: 'component-test.md',
          sha: 'def456',
          size: 1024,
          downloadUrl: 'https://example.com/component-test.md',
          type: 'file'
        }
      ];

      const result = buildTreeStructure(templates);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('comp');
      expect(result[0].type).toBe('directory');
      expect(result[1].name).toBe('component-test.md');
      expect(result[1].type).toBe('file');
    });
  });

  describe('filterByDirectory', () => {
    it('should filter templates by exact directory path', () => {
      const result = filterByDirectory(sampleTemplates, 'components');
      expect(result).toHaveLength(4); // 2 direct files + 2 in hooks subdirectory
      expect(result.every(t => t.path.startsWith('components/'))).toBe(true);
    });

    it('should filter templates by directory path with trailing slash', () => {
      const result = filterByDirectory(sampleTemplates, 'components/');
      expect(result).toHaveLength(4); // 2 direct files + 2 in hooks subdirectory
      expect(result.every(t => t.path.startsWith('components/'))).toBe(true);
    });

    it('should filter templates by nested directory', () => {
      const result = filterByDirectory(sampleTemplates, 'components/hooks');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.path.startsWith('components/hooks/'))).toBe(true);
    });

    it('should return empty array for non-existent directory', () => {
      const result = filterByDirectory(sampleTemplates, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should handle root level filtering', () => {
      const result = filterByDirectory(sampleTemplates, '');
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('readme.md');
    });

    it('should not match root files when filtering by directory name', () => {
      const templates: TemplateMetadata[] = [{
        name: 'components',
        filename: 'components.md',
        path: 'components.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/components.md',
        type: 'file'
      }];

      const result = filterByDirectory(templates, 'components');
      expect(result).toHaveLength(0); // Root file 'components.md' should not match directory filter 'components'
    });
  });

  describe('filterByTag', () => {
    const mockGetTemplateTags = (template: TemplateMetadata): string[] => {
      // Mock tag extraction based on template name
      if (template.name.includes('component')) return ['react', 'component'];
      if (template.name.includes('hook')) return ['react', 'hook'];
      if (template.name.includes('service')) return ['api', 'service'];
      return [];
    };

    it('should filter templates by tag', () => {
      const result = filterByTag(sampleTemplates, 'react', mockGetTemplateTags);
      expect(result).toHaveLength(4); // All component and hook templates
      expect(result.every(t => 
        t.name.includes('component') || t.name.includes('hook')
      )).toBe(true);
    });

    it('should filter templates by specific tag', () => {
      const result = filterByTag(sampleTemplates, 'hook', mockGetTemplateTags);
      expect(result).toHaveLength(2);
      expect(result.every(t => t.name.includes('hook'))).toBe(true);
    });

    it('should return empty array for non-existent tag', () => {
      const result = filterByTag(sampleTemplates, 'nonexistent', mockGetTemplateTags);
      expect(result).toEqual([]);
    });

    it('should handle templates with no tags', () => {
      const noTagsGetter = (): string[] => [];
      const result = filterByTag(sampleTemplates, 'any', noTagsGetter);
      expect(result).toEqual([]);
    });

    it('should handle empty template list', () => {
      const result = filterByTag([], 'any', mockGetTemplateTags);
      expect(result).toEqual([]);
    });
  });

  describe('convertToEnhancedItems', () => {
    let treeNodes: TreeNode[];

    beforeEach(() => {
      treeNodes = buildTreeStructure(sampleTemplates);
    });

    it('should convert tree nodes to enhanced template items', () => {
      const result = convertToEnhancedItems(treeNodes);
      expect(result).toHaveLength(3);

      // Check directory item
      const componentsItem = result.find(item => item.label === 'components');
      expect(componentsItem).toBeDefined();
      expect(componentsItem?.type).toBe('directory');
      expect(componentsItem?.children).toBeDefined();
      expect(componentsItem?.collapsibleState).toBe(1); // Collapsed by default

      // Check file item
      const readmeItem = result.find(item => item.label === 'readme');
      expect(readmeItem).toBeDefined();
      expect(readmeItem?.type).toBe('template');
      expect(readmeItem?.metadata).toBeDefined();
      expect(readmeItem?.collapsibleState).toBe(0); // None for files
    });

    it('should use custom collapsed state', () => {
      const result = convertToEnhancedItems(treeNodes, 2); // Expanded
      const componentsItem = result.find(item => item.label === 'components');
      expect(componentsItem?.collapsibleState).toBe(2);
    });

    it('should handle empty directories', () => {
      const emptyDirNode: TreeNode = {
        path: 'empty',
        name: 'empty',
        type: 'directory',
        children: []
      };

      const result = convertToEnhancedItems([emptyDirNode]);
      expect(result[0].collapsibleState).toBe(0); // None for empty directories
    });

    it('should use template name for file labels', () => {
      const result = convertToEnhancedItems(treeNodes);
      const readmeItem = result.find(item => item.type === 'template');
      expect(readmeItem?.label).toBe('readme'); // Uses metadata.name, not filename
    });

    it('should fallback to node name when metadata is missing', () => {
      const nodeWithoutMetadata: TreeNode = {
        path: 'test.md',
        name: 'test.md',
        type: 'file',
        children: []
      };

      const result = convertToEnhancedItems([nodeWithoutMetadata]);
      expect(result[0].label).toBe('test.md');
    });
  });

  describe('flattenTree', () => {
    let treeNodes: TreeNode[];

    beforeEach(() => {
      treeNodes = buildTreeStructure(sampleTemplates);
    });

    it('should flatten tree structure back to template list', () => {
      const result = flattenTree(treeNodes);
      expect(result).toHaveLength(6); // All original templates
      
      // Should contain all original templates
      const originalPaths = sampleTemplates.map(t => t.path).sort();
      const resultPaths = result.map(t => t.path).sort();
      expect(resultPaths).toEqual(originalPaths);
    });

    it('should handle empty tree', () => {
      const result = flattenTree([]);
      expect(result).toEqual([]);
    });

    it('should only include file nodes with metadata', () => {
      const mixedNodes: TreeNode[] = [
        {
          path: 'dir',
          name: 'dir',
          type: 'directory',
          children: []
        },
        {
          path: 'file.md',
          name: 'file.md',
          type: 'file',
          children: [],
          metadata: sampleTemplates[0]
        }
      ];

      const result = flattenTree(mixedNodes);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(sampleTemplates[0]);
    });

    it('should preserve metadata references', () => {
      const result = flattenTree(treeNodes);
      const originalTemplate = sampleTemplates.find(t => t.path === 'readme.md');
      const flattenedTemplate = result.find(t => t.path === 'readme.md');
      
      expect(flattenedTemplate).toBe(originalTemplate);
    });
  });

  describe('getDirectoryPaths', () => {
    it('should extract all unique directory paths', () => {
      const result = getDirectoryPaths(sampleTemplates);
      const expectedPaths = new Set([
        'components',
        'components/hooks',
        'services'
      ]);
      
      expect(result).toEqual(expectedPaths);
    });

    it('should handle nested directories correctly', () => {
      const deepTemplates: TemplateMetadata[] = [{
        name: 'deep',
        filename: 'deep.md',
        path: 'a/b/c/d/deep.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/deep.md',
        type: 'file'
      }];

      const result = getDirectoryPaths(deepTemplates);
      const expectedPaths = new Set(['a', 'a/b', 'a/b/c', 'a/b/c/d']);
      expect(result).toEqual(expectedPaths);
    });

    it('should handle root level files', () => {
      const rootTemplates: TemplateMetadata[] = [{
        name: 'root',
        filename: 'root.md',
        path: 'root.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/root.md',
        type: 'file'
      }];

      const result = getDirectoryPaths(rootTemplates);
      expect(result.size).toBe(0);
    });

    it('should handle empty template list', () => {
      const result = getDirectoryPaths([]);
      expect(result.size).toBe(0);
    });

    it('should handle duplicate directory paths', () => {
      const duplicateTemplates: TemplateMetadata[] = [
        {
          name: 'file1',
          filename: 'file1.md',
          path: 'shared/file1.md',
          sha: 'abc123',
          size: 1024,
          downloadUrl: 'https://example.com/file1.md',
          type: 'file'
        },
        {
          name: 'file2',
          filename: 'file2.md',
          path: 'shared/file2.md',
          sha: 'def456',
          size: 1024,
          downloadUrl: 'https://example.com/file2.md',
          type: 'file'
        }
      ];

      const result = getDirectoryPaths(duplicateTemplates);
      expect(result.size).toBe(1);
      expect(result.has('shared')).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle templates with empty paths', () => {
      const emptyPathTemplate: TemplateMetadata[] = [{
        name: 'empty',
        filename: 'empty.md',
        path: '',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/empty.md',
        type: 'file'
      }];

      expect(() => buildTreeStructure(emptyPathTemplate)).not.toThrow();
    });

    it('should handle templates with special characters in paths', () => {
      const specialCharTemplates: TemplateMetadata[] = [{
        name: 'special',
        filename: 'special-file_name.md',
        path: 'special-dir_name/special-file_name.md',
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/special.md',
        type: 'file'
      }];

      const result = buildTreeStructure(specialCharTemplates);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('special-dir_name');
    });

    it('should handle very long paths', () => {
      const longPath = 'a'.repeat(100) + '/' + 'b'.repeat(100) + '.md';
      const longPathTemplate: TemplateMetadata[] = [{
        name: 'long',
        filename: 'b'.repeat(100) + '.md',
        path: longPath,
        sha: 'abc123',
        size: 1024,
        downloadUrl: 'https://example.com/long.md',
        type: 'file'
      }];

      expect(() => buildTreeStructure(longPathTemplate)).not.toThrow();
    });
  });
});
/**
 * Tree builder utility for hierarchical template organization
 * 
 * Converts flat file lists into hierarchical tree structures for display
 */

import { TemplateMetadata, EnhancedTemplateItem } from '../types';

/**
 * Tree node representing a directory or file
 */
export interface TreeNode {
  path: string;
  name: string;
  type: 'directory' | 'file';
  children: TreeNode[];
  metadata?: TemplateMetadata;
}

/**
 * Builds a hierarchical tree structure from a flat list of templates
 * @param templates - Flat list of template metadata
 * @returns Root tree nodes
 */
export function buildTreeStructure(templates: TemplateMetadata[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort templates by path for consistent ordering
  const sortedTemplates = [...templates].sort((a, b) => a.path.localeCompare(b.path));

  for (const template of sortedTemplates) {
    const pathParts = template.path.split('/');
    
    // Build directory hierarchy
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      // Create directory node if it doesn't exist
      if (!nodeMap.has(currentPath)) {
        const dirNode: TreeNode = {
          path: currentPath,
          name: part,
          type: 'directory',
          children: []
        };

        nodeMap.set(currentPath, dirNode);

        // Add to parent or root
        if (parentPath) {
          const parent = nodeMap.get(parentPath);
          if (parent) {
            parent.children.push(dirNode);
          }
        } else {
          root.push(dirNode);
        }
      }
    }

    // Create file node
    const fileNode: TreeNode = {
      path: template.path,
      name: pathParts[pathParts.length - 1],
      type: 'file',
      children: [],
      metadata: template
    };

    // Add file to its parent directory or root
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(fileNode);
      }
    } else {
      root.push(fileNode);
    }
  }

  return root;
}

/**
 * Filters templates by directory path
 * @param templates - List of templates to filter
 * @param directoryPath - Directory path to filter by
 * @returns Templates within the specified directory
 */
export function filterByDirectory(
  templates: TemplateMetadata[],
  directoryPath: string
): TemplateMetadata[] {
  const normalizedPath = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
  
  return templates.filter(template => {
    // Check if template path starts with directory path
    return template.path.startsWith(normalizedPath) || template.path === directoryPath;
  });
}

/**
 * Filters templates by tags
 * @param templates - List of templates to filter
 * @param filterTag - Tag to filter by
 * @param getTemplateTags - Function to extract tags from template metadata
 * @returns Templates that have the specified tag
 */
export function filterByTag(
  templates: TemplateMetadata[],
  filterTag: string,
  getTemplateTags: (template: TemplateMetadata) => string[]
): TemplateMetadata[] {
  return templates.filter(template => {
    const tags = getTemplateTags(template);
    return tags.includes(filterTag);
  });
}

/**
 * Converts tree nodes to enhanced template items for VS Code tree view
 * @param nodes - Tree nodes to convert
 * @param collapsedState - Collapsed state value (0 = None, 1 = Collapsed, 2 = Expanded)
 * @returns Enhanced template items
 */
export function convertToEnhancedItems(
  nodes: TreeNode[],
  collapsedState: number = 1
): EnhancedTemplateItem[] {
  return nodes.map(node => {
    if (node.type === 'directory') {
      return {
        label: node.name,
        type: 'directory',
        children: convertToEnhancedItems(node.children, collapsedState),
        collapsibleState: node.children.length > 0 ? collapsedState : 0
      };
    } else {
      return {
        label: node.metadata?.name || node.name,
        type: 'template',
        metadata: node.metadata,
        collapsibleState: 0
      };
    }
  });
}

/**
 * Flattens a tree structure back to a flat list
 * @param nodes - Tree nodes to flatten
 * @returns Flat list of templates
 */
export function flattenTree(nodes: TreeNode[]): TemplateMetadata[] {
  const result: TemplateMetadata[] = [];

  function traverse(node: TreeNode) {
    if (node.type === 'file' && node.metadata) {
      result.push(node.metadata);
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result;
}

/**
 * Gets all unique directory paths from a list of templates
 * @param templates - List of templates
 * @returns Set of unique directory paths
 */
export function getDirectoryPaths(templates: TemplateMetadata[]): Set<string> {
  const directories = new Set<string>();

  for (const template of templates) {
    const pathParts = template.path.split('/');
    
    // Add all parent directories
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
      directories.add(currentPath);
    }
  }

  return directories;
}

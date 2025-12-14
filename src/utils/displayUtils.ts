/**
 * Display utilities for template metadata and UI formatting
 * 
 * Provides functions for formatting template names, tooltips, and configuration sources
 */

import { TemplateMetadata } from '../types';

/**
 * Removes .md extension from filename
 * @param filename - Filename with extension
 * @returns Display name without extension
 */
export function removeExtension(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * Generates tooltip content with filename and size
 * @param metadata - Template metadata
 * @returns Formatted tooltip string
 */
export function generateTooltip(metadata: TemplateMetadata): string {
  const sizeKB = (metadata.size / 1024).toFixed(2);
  return `${metadata.filename} (${sizeKB} KB)`;
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  return `${size.toFixed(2)} ${units[i]}`;
}

/**
 * Formats display name from filename
 * @param filename - Original filename
 * @returns Formatted display name
 */
export function formatDisplayName(filename: string): string {
  // Remove extension
  const nameWithoutExt = removeExtension(filename);
  
  // Replace hyphens and underscores with spaces
  const withSpaces = nameWithoutExt.replace(/[-_]/g, ' ');
  
  // Capitalize first letter of each word
  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats configuration source indicator
 * @param source - Configuration source type
 * @param details - Optional details (repository name, path)
 * @returns Formatted source indicator string
 */
export function formatConfigurationSource(
  source: 'github' | 'local' | 'none',
  details?: { owner?: string; repo?: string; path?: string; localPath?: string }
): string {
  switch (source) {
    case 'github':
      if (details?.owner && details?.repo) {
        const pathPart = details.path ? `/${details.path}` : '';
        return `GitHub: ${details.owner}/${details.repo}${pathPart}`;
      }
      return 'GitHub Repository';
    
    case 'local':
      if (details?.localPath) {
        return `Local: ${details.localPath}`;
      }
      return 'Local Filesystem';
    
    case 'none':
      return 'No Configuration';
    
    default:
      return 'Unknown Source';
  }
}

/**
 * Core type definitions for GitHub Steering Loader
 */

/**
 * GitHub repository configuration
 */
export interface RepositoryConfig {
  owner: string;
  repo: string;
  path?: string;
  branch?: string;  // Default: 'main'
}

/**
 * Template metadata from GitHub repository
 */
export interface TemplateMetadata {
  name: string;           // Display name (without .md extension)
  filename: string;       // Full filename with extension
  path: string;           // Full path in repository
  sha: string;            // Git SHA for change detection
  size: number;           // File size in bytes
  downloadUrl: string;    // Raw content URL
  type: 'file' | 'dir';   // Item type for hierarchical display
}

/**
 * Cache entry for repository contents
 */
export interface CacheEntry {
  templates: TemplateMetadata[];
  timestamp: number;
  sha: string;  // Repository tree SHA for change detection
}

/**
 * Validation result for repository checks
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * GitHub API rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  authenticated: boolean;
}

/**
 * Result of template loading operation
 */
export interface LoadResult {
  success: boolean;
  error?: string;
  filepath?: string;
}

/**
 * User choice for file overwrite
 */
export type OverwriteChoice = 'overwrite' | 'cancel';

/**
 * Configuration source priority
 */
export type ConfigSource = 'github' | 'local' | 'none';

/**
 * Enhanced template item for tree view
 */
export interface EnhancedTemplateItem {
  label: string;
  type: 'template' | 'directory' | 'info' | 'error' | 'setup';
  metadata?: TemplateMetadata;
  children?: EnhancedTemplateItem[];
  collapsibleState: number;  // vscode.TreeItemCollapsibleState
}

/**
 * GitHub API response models
 */

/**
 * GitHub Contents API Response
 */
export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * GitHub Rate Limit API Response
 */
export interface GitHubRateLimit {
  resources: {
    core: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
  };
}

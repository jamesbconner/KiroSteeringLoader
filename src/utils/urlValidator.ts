/**
 * URL validation utilities for GitHub repository URLs
 */

import { RepositoryConfig } from '../types';
import { GitHubSteeringError, ErrorCode } from '../errors';

/**
 * Parses a GitHub repository URL and extracts owner and repo
 * Supports formats:
 * - https://github.com/owner/repo
 * - owner/repo
 * - owner/repo/path/to/steering
 */
export function parseRepositoryUrl(url: string): RepositoryConfig {
  const trimmed = url.trim();
  
  if (!trimmed) {
    throw new GitHubSteeringError(
      'Empty repository URL',
      ErrorCode.INVALID_CONFIG,
      { url },
      'Repository URL cannot be empty'
    );
  }

  // Handle full GitHub URL format
  const fullUrlMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (fullUrlMatch) {
    return {
      owner: fullUrlMatch[1],
      repo: fullUrlMatch[2].replace(/\.git$/, ''),
      branch: 'main'
    };
  }

  // Handle short format: owner/repo or owner/repo/path
  const parts = trimmed.split('/');
  if (parts.length < 2) {
    throw new GitHubSteeringError(
      'Invalid repository URL format',
      ErrorCode.INVALID_CONFIG,
      { url },
      'Repository URL must be in format "owner/repo" or "https://github.com/owner/repo"'
    );
  }

  const owner = parts[0];
  const repo = parts[1];
  const pathParts = parts.slice(2).filter(p => p.trim().length > 0);
  const path = pathParts.length > 0 ? pathParts.join('/') : undefined;

  // Validate owner and repo names
  if (!isValidGitHubName(owner)) {
    throw new GitHubSteeringError(
      'Invalid owner name',
      ErrorCode.INVALID_CONFIG,
      { owner },
      'Owner name contains invalid characters'
    );
  }

  if (!isValidGitHubName(repo)) {
    throw new GitHubSteeringError(
      'Invalid repository name',
      ErrorCode.INVALID_CONFIG,
      { repo },
      'Repository name contains invalid characters'
    );
  }

  return {
    owner,
    repo,
    path,
    branch: 'main'
  };
}

/**
 * Validates a GitHub username or repository name
 * GitHub names can contain alphanumeric characters and hyphens
 * Cannot start with a hyphen
 */
function isValidGitHubName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }
  
  // GitHub names: alphanumeric and hyphens, cannot start with hyphen
  const githubNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;
  return githubNameRegex.test(name);
}

/**
 * Validates a repository configuration object
 */
export function validateRepositoryConfig(config: RepositoryConfig): boolean {
  if (!config.owner || !config.repo) {
    return false;
  }
  
  if (!isValidGitHubName(config.owner) || !isValidGitHubName(config.repo)) {
    return false;
  }
  
  return true;
}

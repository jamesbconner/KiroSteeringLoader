/**
 * Error handling for GitHub Steering Loader
 */

/**
 * Error codes for different failure scenarios
 */
export enum ErrorCode {
  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // GitHub API
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FORBIDDEN = 'FORBIDDEN',
  
  // File System
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  FILE_EXISTS = 'FILE_EXISTS',
  
  // Configuration
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',
  
  // Cache
  CACHE_CORRUPTED = 'CACHE_CORRUPTED',
  CACHE_QUOTA_EXCEEDED = 'CACHE_QUOTA_EXCEEDED'
}

/**
 * Custom error class for GitHub Steering Loader
 */
export class GitHubSteeringError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'GitHubSteeringError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitHubSteeringError);
    }
  }
}

/**
 * Maps error codes to user-friendly messages
 */
export function getUserMessage(code: ErrorCode, details?: unknown): string {
  switch (code) {
    case ErrorCode.NETWORK_ERROR:
      return 'Unable to connect to GitHub. Please check your internet connection.';
    case ErrorCode.TIMEOUT:
      return 'Request to GitHub timed out. Please try again.';
    case ErrorCode.REPOSITORY_NOT_FOUND:
      return 'Repository not found. Please check the repository URL and ensure it exists.';
    case ErrorCode.UNAUTHORIZED:
      return 'Authentication failed. Please check your GitHub token.';
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 'GitHub API rate limit exceeded. Please wait or configure an authentication token.';
    case ErrorCode.FORBIDDEN:
      return 'Access forbidden. You may not have permission to access this repository.';
    case ErrorCode.PERMISSION_DENIED:
      return 'Permission denied. Unable to write to the file system.';
    case ErrorCode.DISK_FULL:
      return 'Disk is full. Please free up space and try again.';
    case ErrorCode.FILE_EXISTS:
      return 'File already exists. Please choose whether to overwrite.';
    case ErrorCode.INVALID_CONFIG:
      return 'Invalid configuration. Please check your repository settings.';
    case ErrorCode.MISSING_CONFIG:
      return 'No configuration found. Please configure a GitHub repository or local path.';
    case ErrorCode.CACHE_CORRUPTED:
      return 'Cache data is corrupted. Clearing cache and fetching fresh data.';
    case ErrorCode.CACHE_QUOTA_EXCEEDED:
      return 'Cache storage quota exceeded. Clearing old cache entries.';
    default:
      return 'An unexpected error occurred.';
  }
}

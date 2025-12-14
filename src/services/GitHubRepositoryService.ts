/**
 * GitHubRepositoryService - Handles all GitHub API interactions
 * 
 * Implements GitHub API client with authentication, rate limiting, and error handling
 */

import { TemplateMetadata, ValidationResult, RateLimitInfo, GitHubContent, GitHubRateLimit } from '../types';
import { GitHubSteeringError, ErrorCode } from '../errors';

const GITHUB_API_BASE = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

export class GitHubRepositoryService {
  private authToken: string | null = null;

  /**
   * Fetches the list of markdown files from the configured repository
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - Optional subdirectory path
   * @param branch - Optional branch name (defaults to repository's default branch)
   * @returns Array of template metadata
   */
  async fetchTemplates(owner: string, repo: string, path?: string, branch?: string): Promise<TemplateMetadata[]> {
    const apiPath = path ? `/repos/${owner}/${repo}/contents/${path}` : `/repos/${owner}/${repo}/contents`;
    const url = new URL(`${GITHUB_API_BASE}${apiPath}`);
    
    // Add branch parameter if specified
    if (branch) {
      url.searchParams.set('ref', branch);
    }

    try {
      const response = await this.fetchWithRetry(url.toString());
      const responseData = await response.json();

      // Handle both single file and directory responses
      let contents: GitHubContent[];
      
      if (Array.isArray(responseData)) {
        // Directory response - array of files/folders
        contents = responseData as GitHubContent[];
      } else if (responseData && typeof responseData === 'object' && 'type' in responseData) {
        // Single file response - cast to GitHubContent for type safety
        const singleFile = responseData as GitHubContent;
        
        if (singleFile.type === 'file') {
          // If path points to a single file, return it if it's a markdown file
          if (singleFile.name.endsWith('.md')) {
            const template = this.transformToTemplateMetadata(singleFile);
            return [template];
          } else {
            // Path points to a non-markdown file
            throw new GitHubSteeringError(
              'Path points to non-markdown file',
              ErrorCode.INVALID_CONFIG,
              { path, fileName: singleFile.name },
              `The configured path "${path}" points to a file "${singleFile.name}" that is not a markdown file. Please configure a directory path containing markdown files.`
            );
          }
        } else {
          // Single directory response (shouldn't happen with GitHub API, but handle gracefully)
          contents = [];
        }
      } else {
        // Unexpected response format
        throw new GitHubSteeringError(
          'Unexpected GitHub API response format',
          ErrorCode.NETWORK_ERROR,
          { responseType: typeof responseData },
          'Received unexpected response format from GitHub API'
        );
      }

      // Filter for markdown files only
      const markdownFiles = contents.filter(item => 
        item.type === 'file' && item.name.endsWith('.md')
      );

      // Transform to TemplateMetadata and sort alphabetically
      const templates = markdownFiles.map(file => this.transformToTemplateMetadata(file));
      return this.sortTemplatesAlphabetically(templates);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch templates');
    }
  }

  /**
   * Fetches the raw content of a specific file
   * @param downloadUrl - GitHub raw content URL
   * @returns File content as string
   */
  async fetchFileContent(downloadUrl: string): Promise<string> {
    try {
      const response = await this.fetchWithRetry(downloadUrl);
      return await response.text();
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch file content');
    }
  }

  /**
   * Validates repository accessibility
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Validation result with error details if any
   */
  async validateRepository(owner: string, repo: string): Promise<ValidationResult> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

    try {
      const response = await this.fetchWithRetry(url);
      
      if (response.ok) {
        return { valid: true };
      }

      return {
        valid: false,
        error: `Repository validation failed with status ${response.status}`,
        statusCode: response.status
      };
    } catch (error) {
      if (error instanceof GitHubSteeringError) {
        return {
          valid: false,
          error: error.userMessage || error.message,
          statusCode: error.details as number
        };
      }

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gets current rate limit status
   * @returns Rate limit information
   */
  async getRateLimitStatus(): Promise<RateLimitInfo> {
    const url = `${GITHUB_API_BASE}/rate_limit`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error(`Rate limit check failed: ${response.status}`);
      }

      const data = await response.json() as GitHubRateLimit;
      const core = data.resources.core;

      return {
        limit: core.limit,
        remaining: core.remaining,
        reset: new Date(core.reset * 1000),
        authenticated: !!this.authToken
      };
    } catch (error) {
      // Return default values if rate limit check fails
      return {
        limit: this.authToken ? 5000 : 60,
        remaining: 0,
        reset: new Date(),
        authenticated: !!this.authToken
      };
    }
  }

  /**
   * Sets authentication token
   * @param token - GitHub personal access token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clears authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Transforms GitHub API content to TemplateMetadata
   */
  private transformToTemplateMetadata(content: GitHubContent): TemplateMetadata {
    return {
      name: content.name.replace(/\.md$/, ''),
      filename: content.name,
      path: content.path,
      sha: content.sha,
      size: content.size,
      downloadUrl: content.download_url || '',
      type: content.type
    };
  }

  /**
   * Sorts templates alphabetically by name
   */
  private sortTemplatesAlphabetically(templates: TemplateMetadata[]): TemplateMetadata[] {
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gets headers for GitHub API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Kiro-Steering-Loader'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Fetches with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string, retryCount: number = 0): Promise<Response> {
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          
          throw new GitHubSteeringError(
            'GitHub API rate limit exceeded',
            ErrorCode.RATE_LIMIT_EXCEEDED,
            { resetTime: resetDate },
            `Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`
          );
        }
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new GitHubSteeringError(
          'GitHub authentication failed',
          ErrorCode.UNAUTHORIZED,
          { status: response.status },
          'Invalid GitHub token. Please update your authentication token.'
        );
      }

      // Handle not found
      if (response.status === 404) {
        throw new GitHubSteeringError(
          'Repository not found',
          ErrorCode.REPOSITORY_NOT_FOUND,
          { status: response.status },
          'Repository not found or is private. Check the repository URL or configure authentication.'
        );
      }

      // Handle forbidden (insufficient permissions)
      if (response.status === 403) {
        throw new GitHubSteeringError(
          'Access forbidden',
          ErrorCode.FORBIDDEN,
          { status: response.status },
          'Access forbidden. You may not have permission to access this repository.'
        );
      }

      if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      // Don't retry on specific errors
      if (error instanceof GitHubSteeringError) {
        throw error;
      }

      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        await this.sleep(delay);
        return this.fetchWithRetry(url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Handles errors and converts to GitHubSteeringError
   */
  private handleError(error: unknown, context: string): GitHubSteeringError {
    if (error instanceof GitHubSteeringError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new GitHubSteeringError(
          `${context}: Request timeout`,
          ErrorCode.TIMEOUT,
          error,
          'Request timed out. Please check your internet connection and try again.'
        );
      }

      return new GitHubSteeringError(
        `${context}: ${error.message}`,
        ErrorCode.NETWORK_ERROR,
        error,
        'Network error occurred. Please check your internet connection.'
      );
    }

    return new GitHubSteeringError(
      `${context}: Unknown error`,
      ErrorCode.NETWORK_ERROR,
      error,
      'An unexpected error occurred.'
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

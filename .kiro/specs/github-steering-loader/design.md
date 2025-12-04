# Design Document: GitHub Steering Loader v0.1.0

## Overview

Version 0.1.0 of the Kiro Steering Loader introduces GitHub repository integration as the primary source for steering documents. This design maintains backward compatibility with local filesystem paths while adding robust GitHub API integration, caching, authentication, and enhanced user experience features.

The architecture follows a layered approach with clear separation between:
- GitHub API communication layer
- Caching and state management layer  
- VS Code UI integration layer
- File system operations layer

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                   │
├─────────────────────────────────────────────────────────────┤
│  Extension Activation & Command Registration                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SteeringTemplateProvider (Tree View)          │  │
│  │  - Tree data management                               │  │
│  │  - UI state coordination                              │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                            │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │           GitHubRepositoryService                     │  │
│  │  - Repository content fetching                        │  │
│  │  - API request management                             │  │
│  │  - Authentication handling                            │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                            │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │              CacheManager                             │  │
│  │  - Cache storage and retrieval                        │  │
│  │  - Cache invalidation logic                           │  │
│  │  - Timestamp management                               │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                            │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │          FileSystemService                            │  │
│  │  - Template loading to workspace                      │  │
│  │  - Directory creation                                 │  │
│  │  - File conflict resolution                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  GitHub API    │
                  └────────────────┘
```

### Component Interaction Flow

1. **User Action** → Tree View Command
2. **Tree View** → GitHubRepositoryService (fetch templates)
3. **GitHubRepositoryService** → CacheManager (check cache)
4. **CacheManager** → Return cached data OR trigger API call
5. **GitHubRepositoryService** → GitHub API (if cache miss/expired)
6. **GitHub API** → Return repository contents
7. **GitHubRepositoryService** → CacheManager (store results)
8. **Tree View** → Display templates
9. **User Selection** → FileSystemService (load template)
10. **FileSystemService** → Write to `.kiro/steering/`

## Components and Interfaces

### 1. GitHubRepositoryService

Handles all GitHub API interactions including authentication, rate limiting, and error handling.

```typescript
interface GitHubRepositoryService {
  /**
   * Fetches the list of markdown files from the configured repository
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - Optional subdirectory path
   * @returns Array of template metadata
   */
  fetchTemplates(owner: string, repo: string, path?: string): Promise<TemplateMetadata[]>;
  
  /**
   * Fetches the raw content of a specific file
   * @param downloadUrl - GitHub raw content URL
   * @returns File content as string
   */
  fetchFileContent(downloadUrl: string): Promise<string>;
  
  /**
   * Validates repository accessibility
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Validation result with error details if any
   */
  validateRepository(owner: string, repo: string): Promise<ValidationResult>;
  
  /**
   * Gets current rate limit status
   * @returns Rate limit information
   */
  getRateLimitStatus(): Promise<RateLimitInfo>;
  
  /**
   * Sets authentication token
   * @param token - GitHub personal access token
   */
  setAuthToken(token: string): void;
  
  /**
   * Clears authentication token
   */
  clearAuthToken(): void;
}

interface TemplateMetadata {
  name: string;           // Display name (without .md extension)
  filename: string;       // Full filename with extension
  path: string;           // Full path in repository
  sha: string;            // Git SHA for change detection
  size: number;           // File size in bytes
  downloadUrl: string;    // Raw content URL
  type: 'file' | 'dir';   // Item type for hierarchical display
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  authenticated: boolean;
}
```

### 2. CacheManager

Manages local caching of repository contents to minimize API calls and improve performance.

```typescript
interface CacheManager {
  /**
   * Retrieves cached templates if available and fresh
   * @param cacheKey - Unique key for the repository/path combination
   * @returns Cached templates or null if cache miss/expired
   */
  getCachedTemplates(cacheKey: string): TemplateMetadata[] | null;
  
  /**
   * Stores templates in cache with timestamp
   * @param cacheKey - Unique key for the repository/path combination
   * @param templates - Template metadata to cache
   */
  setCachedTemplates(cacheKey: string, templates: TemplateMetadata[]): void;
  
  /**
   * Invalidates cache for a specific key
   * @param cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey: string): void;
  
  /**
   * Clears all cached data
   */
  clearAllCache(): void;
  
  /**
   * Checks if cached data is still fresh
   * @param cacheKey - Cache key to check
   * @returns True if cache is fresh (< 5 minutes old)
   */
  isCacheFresh(cacheKey: string): boolean;
}

interface CacheEntry {
  templates: TemplateMetadata[];
  timestamp: number;
  sha: string;  // Repository tree SHA for change detection
}
```

### 3. FileSystemService

Handles file operations for loading templates into the workspace.

```typescript
interface FileSystemService {
  /**
   * Loads a template into the workspace .kiro/steering directory
   * @param content - Template file content
   * @param filename - Target filename
   * @param workspacePath - Workspace root path
   * @returns Success status
   */
  loadTemplate(content: string, filename: string, workspacePath: string): Promise<LoadResult>;
  
  /**
   * Ensures .kiro/steering directory exists
   * @param workspacePath - Workspace root path
   */
  ensureSteeringDirectory(workspacePath: string): Promise<void>;
  
  /**
   * Checks if a file already exists
   * @param filepath - Full file path to check
   * @returns True if file exists
   */
  fileExists(filepath: string): Promise<boolean>;
  
  /**
   * Prompts user for overwrite confirmation
   * @param filename - Name of existing file
   * @returns User's choice (overwrite, cancel)
   */
  promptOverwrite(filename: string): Promise<OverwriteChoice>;
}

interface LoadResult {
  success: boolean;
  error?: string;
  filepath?: string;
}

type OverwriteChoice = 'overwrite' | 'cancel';
```

### 4. ConfigurationService

Manages extension configuration including repository settings and authentication.

```typescript
interface ConfigurationService {
  /**
   * Gets the configured GitHub repository
   * @returns Repository configuration or null
   */
  getRepositoryConfig(): RepositoryConfig | null;
  
  /**
   * Sets the GitHub repository configuration
   * @param config - Repository configuration
   */
  setRepositoryConfig(config: RepositoryConfig): Promise<void>;
  
  /**
   * Gets the authentication token from secure storage
   * @returns Token or null if not configured
   */
  getAuthToken(): Promise<string | null>;
  
  /**
   * Stores authentication token in secure storage
   * @param token - GitHub personal access token
   */
  setAuthToken(token: string): Promise<void>;
  
  /**
   * Removes authentication token from secure storage
   */
  clearAuthToken(): Promise<void>;
  
  /**
   * Gets the legacy local templates path if configured
   * @returns Local path or null
   */
  getLocalTemplatesPath(): string | null;
  
  /**
   * Determines which configuration source to use
   * @returns Configuration source priority
   */
  getConfigurationSource(): ConfigSource;
}

interface RepositoryConfig {
  owner: string;
  repo: string;
  path?: string;
  branch?: string;  // Default: 'main'
}

type ConfigSource = 'github' | 'local' | 'none';
```

### 5. Enhanced SteeringTemplateProvider

Extended tree data provider with GitHub integration and hierarchical display.

```typescript
interface EnhancedTemplateItem {
  label: string;
  type: 'template' | 'directory' | 'info' | 'error' | 'setup';
  metadata?: TemplateMetadata;
  children?: EnhancedTemplateItem[];
  collapsibleState: vscode.TreeItemCollapsibleState;
}
```

## Data Models

### Configuration Storage

```typescript
// VS Code Settings (settings.json)
{
  "kiroSteeringLoader.repository": {
    "owner": "myorg",
    "repo": "steering-templates",
    "path": "templates/typescript",
    "branch": "main"
  },
  "kiroSteeringLoader.templatesPath": "/local/path"  // Legacy support
}

// VS Code SecretStorage (encrypted)
{
  "kiroSteeringLoader.githubToken": "ghp_xxxxxxxxxxxx"
}

// Extension Context GlobalState (cache)
{
  "kiroSteeringLoader.cache": {
    "myorg/steering-templates/templates/typescript": {
      "templates": [...],
      "timestamp": 1234567890,
      "sha": "abc123"
    }
  }
}
```

### GitHub API Response Models

```typescript
// GitHub Contents API Response
interface GitHubContent {
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

// GitHub Rate Limit API Response
interface GitHubRateLimit {
  resources: {
    core: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
  };
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: URL validation accepts valid formats

*For any* valid GitHub repository URL (either `https://github.com/owner/repo` or `owner/repo` format), the URL validator should accept it and correctly parse the owner and repository name.
**Validates: Requirements 1.1**

### Property 2: Repository path parsing consistency

*For any* repository configuration with a path component, parsing the configuration should correctly extract the owner, repo, and path regardless of input format (`owner/repo/path` or separate path field).
**Validates: Requirements 1.2**

### Property 3: Configuration persistence round-trip

*For any* valid repository configuration, saving it to VS Code settings and then retrieving it should return an equivalent configuration object.
**Validates: Requirements 1.3**

### Property 4: Invalid URL rejection

*For any* invalid repository URL format (missing owner, invalid characters, malformed URL), the validator should reject it and return an error message.
**Validates: Requirements 1.4**

### Property 5: Markdown file filtering

*For any* list of files returned from GitHub API (with mixed file extensions), filtering for templates should return only files with `.md` extension.
**Validates: Requirements 2.2**

### Property 6: Metadata extraction completeness

*For any* valid GitHub API file response, extracting metadata should produce an object containing all required fields (name, filename, path, sha, size, downloadUrl, type).
**Validates: Requirements 2.3**

### Property 7: Alphabetical sorting preservation

*For any* list of template files, sorting them alphabetically should produce a list where each element's name is lexicographically less than or equal to the next element's name, and all original elements are present.
**Validates: Requirements 2.5**

### Property 8: Token storage round-trip

*For any* valid GitHub personal access token string, storing it in SecretStorage and then retrieving it should return the same token value.
**Validates: Requirements 3.1**

### Property 9: Token clearing completeness

*For any* stored authentication token, after clearing the token, retrieving it should return null or undefined.
**Validates: Requirements 3.5**

### Property 10: Cache storage with timestamp

*For any* successfully fetched repository contents, storing them in cache should create a cache entry that includes the templates array and a timestamp within 1 second of the current time.
**Validates: Requirements 4.1**

### Property 11: Fresh cache usage

*For any* cached data with a timestamp less than 5 minutes old, checking if the cache is fresh should return true, and requesting templates should return the cached data without making an API call.
**Validates: Requirements 4.3**

### Property 12: SHA-based cache invalidation

*For any* cached repository contents with a specific SHA, if the repository's current SHA differs, the cache should be marked as invalid and a new fetch should be triggered.
**Validates: Requirements 4.5**

### Property 13: Directory creation guarantee

*For any* workspace path, after attempting to load a template, the `.kiro/steering/` directory should exist.
**Validates: Requirements 5.2**

### Property 14: Template content preservation

*For any* template file content fetched from GitHub, saving it to the workspace and then reading it back should return identical content.
**Validates: Requirements 5.3**

### Property 15: Filename extension removal

*For any* template filename ending with `.md`, the display name should be the filename with the `.md` extension removed.
**Validates: Requirements 6.1**

### Property 16: Tooltip content inclusion

*For any* template metadata, generating a tooltip should produce a string that contains both the full filename and the file size.
**Validates: Requirements 6.2**

### Property 17: Front matter metadata extraction

*For any* markdown file content with valid YAML front matter, parsing the front matter should extract all key-value pairs from the front matter block.
**Validates: Requirements 6.4**

### Property 18: Error logging completeness

*For any* operation that throws an error, the error details (message, stack trace, context) should be written to the VS Code output channel.
**Validates: Requirements 7.5**

### Property 19: Configuration source priority

*For any* extension state where both GitHub and local configurations exist, querying the active configuration source should return 'github', and fetching templates should use the GitHub configuration.
**Validates: Requirements 8.2**

### Property 20: Configuration source display

*For any* active configuration (GitHub or local), the tree view should display a label or indicator that identifies the configuration source.
**Validates: Requirements 8.4**

### Property 21: Migration file preservation

*For any* set of files in `.kiro/steering/` directory, changing the configuration source (from local to GitHub or vice versa) should not delete or modify any existing files in that directory.
**Validates: Requirements 8.5**

### Property 22: Workspace configuration priority

*For any* extension state where both workspace-level and user-level GitHub configurations exist, the active configuration should be the workspace-level configuration.
**Validates: Requirements 9.4**

### Property 23: Hierarchical tree structure generation

*For any* flat list of file paths with directory separators, building a tree structure should create parent directory nodes for each unique directory path, with file nodes as children of their respective directories.
**Validates: Requirements 10.1**

### Property 24: Directory filtering

*For any* directory node in the tree, expanding it should show only the markdown files whose path starts with that directory's path.
**Validates: Requirements 10.2**

### Property 25: Tag-based filtering

*For any* set of templates with tag metadata and a filter tag, filtering by that tag should return only templates whose tags array includes the filter tag.
**Validates: Requirements 10.3**

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection timeouts
   - DNS resolution failures
   - SSL/TLS errors
   - Offline mode detection

2. **GitHub API Errors**
   - 404 Not Found (repository doesn't exist or is private)
   - 401 Unauthorized (invalid token)
   - 403 Forbidden (rate limit exceeded, insufficient permissions)
   - 422 Unprocessable Entity (invalid request parameters)
   - 500+ Server errors

3. **File System Errors**
   - Permission denied (cannot create directory or write file)
   - Disk full
   - Invalid path characters
   - File locked by another process

4. **Configuration Errors**
   - Invalid repository URL format
   - Missing required configuration
   - Conflicting configurations

5. **Cache Errors**
   - Corrupted cache data
   - Cache storage quota exceeded

### Error Handling Strategy

```typescript
class GitHubSteeringError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'GitHubSteeringError';
  }
}

enum ErrorCode {
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
```

### Error Recovery Strategies

1. **Automatic Retry with Exponential Backoff**
   - Network errors: 3 retries with 1s, 2s, 4s delays
   - Rate limit errors: Wait until reset time, then retry once

2. **Graceful Degradation**
   - If GitHub API fails, show cached data with warning
   - If cache is corrupted, clear cache and fetch fresh data
   - If authentication fails, fall back to unauthenticated requests

3. **User Guidance**
   - Provide actionable error messages with next steps
   - Include links to documentation for complex errors
   - Offer quick fixes (e.g., "Configure Token" button in rate limit error)

4. **Logging and Diagnostics**
   - Log all errors to VS Code output channel with full context
   - Include request/response details for API errors
   - Track error frequency for monitoring

## Testing Strategy

### Unit Testing

Unit tests will verify individual functions and components in isolation:

- **URL Parsing**: Test various URL formats and edge cases
- **Metadata Extraction**: Test transformation of GitHub API responses
- **Cache Logic**: Test cache freshness calculations and invalidation
- **File Operations**: Test directory creation and file writing (with mocked fs)
- **Configuration Management**: Test config reading/writing and priority logic
- **Error Handling**: Test error creation and message formatting

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** library (TypeScript PBT framework):

- **Minimum 100 iterations** per property test
- Each property test tagged with: `**Feature: github-steering-loader, Property {number}: {property_text}**`
- Generators for:
  - Valid/invalid GitHub URLs
  - Repository configurations
  - GitHub API responses
  - File paths and directory structures
  - Cache entries with various timestamps
  - Front matter metadata

### Integration Testing

Integration tests will verify component interactions:

- GitHub API integration (using nock for HTTP mocking)
- VS Code API integration (using vscode-test)
- File system operations (using temp directories)
- Configuration persistence (using test workspace)
- Cache storage and retrieval (using test global state)

### End-to-End Testing

E2E tests will verify complete user workflows:

- Configure repository → Fetch templates → Load template
- Authentication flow with token
- Cache hit/miss scenarios
- Error recovery flows
- Migration from local to GitHub configuration

### Test Data Strategy

- **Mock GitHub API responses** using realistic data from actual repositories
- **Test repositories**: Create dedicated test repos with known structure
- **Fixture files**: Sample markdown files with various front matter formats
- **Edge cases**: Empty repositories, large file lists, deeply nested directories

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load directory contents only when expanded
   - Fetch file content only when template is selected

2. **Request Batching**
   - Use GitHub Tree API to fetch entire directory structure in one request
   - Batch multiple file content requests when possible

3. **Caching Strategy**
   - 5-minute cache TTL for repository contents
   - Persistent cache across VS Code sessions using GlobalState
   - ETag-based conditional requests to minimize data transfer

4. **Rate Limit Management**
   - Track remaining rate limit after each request
   - Show warning when approaching limit (< 10 remaining)
   - Automatically use cache when rate limited

5. **Memory Management**
   - Limit cache size to 100 repositories
   - Use LRU eviction when cache is full
   - Clear cache on extension deactivation

### Performance Targets

- **Extension Activation**: < 100ms
- **Template List Fetch** (cache hit): < 50ms
- **Template List Fetch** (cache miss): < 2s
- **Template Load**: < 1s
- **Memory Usage**: < 20MB for typical usage (< 50 repositories cached)

## Security Considerations

### Token Security

- Store tokens in VS Code SecretStorage (encrypted)
- Never log tokens or include in error messages
- Clear tokens from memory after use
- Support token scopes: `repo` (private repos) or `public_repo` (public only)

### Input Validation

- Validate all user inputs (URLs, paths, filenames)
- Sanitize file paths to prevent directory traversal
- Validate GitHub API responses before processing
- Limit file sizes (max 1MB per template)

### Network Security

- Use HTTPS for all GitHub API requests
- Validate SSL certificates
- Set reasonable timeouts (30s for API requests)
- Implement request size limits

### Content Security

- Scan template content for malicious patterns (optional)
- Warn users when loading templates from untrusted sources
- Validate markdown front matter to prevent code injection

## Migration Path

### From v0.0.3 to v0.1.0

1. **Backward Compatibility**
   - Existing `kiroSteeringLoader.templatesPath` setting continues to work
   - No breaking changes to existing functionality
   - Users can opt-in to GitHub integration

2. **Migration Steps for Users**
   - Install v0.1.0
   - Run "Configure GitHub Repository" command
   - Enter repository URL
   - (Optional) Configure authentication token
   - Existing local templates remain in workspace

3. **Configuration Coexistence**
   - Both local and GitHub configs can exist simultaneously
   - GitHub config takes priority when both are present
   - Clear visual indication of active source

4. **Data Migration**
   - No automatic migration of local templates to GitHub
   - Users manually commit local templates to GitHub if desired
   - Extension provides guidance on migration process

## Future Enhancements (Out of Scope for v0.1.0)

- Multiple repository support
- Template versioning and update notifications
- Template search across repositories
- Template preview before loading
- Bulk template loading
- Template dependency management
- Custom template categories/tags
- Template usage analytics
- Offline mode with full cache
- GitHub Enterprise support

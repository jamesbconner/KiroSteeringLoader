# Implementation Plan

- [x] 1. Set up core infrastructure and types



  - Create TypeScript interfaces for all data models (RepositoryConfig, TemplateMetadata, CacheEntry, etc.)
  - Define error types and error codes enum
  - Set up project structure with new service directories
  - Configure fast-check for property-based testing
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 1.1 Write property test for URL validation


  - **Property 1: URL validation accepts valid formats**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for invalid URL rejection


  - **Property 4: Invalid URL rejection**
  - **Validates: Requirements 1.4**

- [x] 2. Implement ConfigurationService



  - Create ConfigurationService class with methods for reading/writing repository config
  - Implement VS Code settings integration for repository configuration
  - Implement SecretStorage integration for token management
  - Add support for workspace-level vs user-level configuration priority
  - Add legacy local path configuration support
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 8.1, 8.2, 9.1, 9.4_

- [x] 2.1 Write property test for configuration persistence


  - **Property 3: Configuration persistence round-trip**
  - **Validates: Requirements 1.3**

- [x] 2.2 Write property test for repository path parsing

  - **Property 2: Repository path parsing consistency**
  - **Validates: Requirements 1.2**

- [x] 2.3 Write property test for token storage

  - **Property 8: Token storage round-trip**
  - **Validates: Requirements 3.1**

- [x] 2.4 Write property test for token clearing

  - **Property 9: Token clearing completeness**
  - **Validates: Requirements 3.5**

- [x] 2.5 Write property test for configuration priority

  - **Property 19: Configuration source priority**
  - **Validates: Requirements 8.2**

- [x] 2.6 Write property test for workspace configuration priority

  - **Property 22: Workspace configuration priority**
  - **Validates: Requirements 9.4**

- [x] 3. Implement CacheManager



  - Create CacheManager class with cache storage using VS Code GlobalState
  - Implement cache freshness checking (5-minute TTL)
  - Implement SHA-based cache invalidation
  - Add LRU eviction for cache size management (max 100 entries)
  - Implement cache key generation from repository config
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.1 Write property test for cache storage with timestamp


  - **Property 10: Cache storage with timestamp**
  - **Validates: Requirements 4.1**

- [x] 3.2 Write property test for fresh cache usage

  - **Property 11: Fresh cache usage**
  - **Validates: Requirements 4.3**

- [x] 3.3 Write property test for SHA-based invalidation

  - **Property 12: SHA-based cache invalidation**
  - **Validates: Requirements 4.5**

- [x] 4. Implement GitHubRepositoryService


  - Create GitHubRepositoryService class with GitHub API client
  - Implement fetchTemplates method using GitHub Contents API
  - Implement fetchFileContent method for raw file retrieval
  - Implement validateRepository method for repository accessibility checks
  - Implement getRateLimitStatus method
  - Add authentication header injection when token is available
  - Implement error handling with custom error types
  - Add retry logic with exponential backoff for network errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 7.1, 7.2, 7.3_

- [x] 4.1 Write property test for markdown filtering


  - **Property 5: Markdown file filtering**
  - **Validates: Requirements 2.2**

- [x] 4.2 Write property test for metadata extraction

  - **Property 6: Metadata extraction completeness**
  - **Validates: Requirements 2.3**

- [x] 4.3 Write property test for alphabetical sorting

  - **Property 7: Alphabetical sorting preservation**
  - **Validates: Requirements 2.5**

- [x] 4.4 Write unit tests for GitHub API integration

  - Test API endpoint construction
  - Test authentication header inclusion
  - Test rate limit handling
  - Mock GitHub API responses using nock
  - _Requirements: 2.1, 3.2, 3.3, 7.2_

- [x] 5. Implement FileSystemService



  - Create FileSystemService class for file operations
  - Implement ensureSteeringDirectory method with recursive directory creation
  - Implement loadTemplate method with file writing
  - Implement fileExists check
  - Implement promptOverwrite for conflict resolution
  - Add error handling for file system operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.4_

- [x] 5.1 Write property test for directory creation


  - **Property 13: Directory creation guarantee**
  - **Validates: Requirements 5.2**

- [x] 5.2 Write property test for content preservation

  - **Property 14: Template content preservation**
  - **Validates: Requirements 5.3**

- [x] 5.3 Write property test for file preservation during migration

  - **Property 21: Migration file preservation**
  - **Validates: Requirements 8.5**

- [x] 6. Implement metadata and display utilities
  - Create utility functions for filename extension removal
  - Implement tooltip generation with filename and size
  - Implement front matter parser for YAML metadata extraction
  - Create display name formatter
  - Add configuration source indicator formatter
  - _Requirements: 6.1, 6.2, 6.4, 8.4_

- [x] 6.1 Write property test for extension removal
  - **Property 15: Filename extension removal**
  - **Validates: Requirements 6.1**

- [x] 6.2 Write property test for tooltip content
  - **Property 16: Tooltip content inclusion**
  - **Validates: Requirements 6.2**

- [x] 6.3 Write property test for front matter extraction
  - **Property 17: Front matter metadata extraction**
  - **Validates: Requirements 6.4**

- [x] 6.4 Write property test for configuration source display
  - **Property 20: Configuration source display**
  - **Validates: Requirements 8.4**

- [x] 7. Implement hierarchical tree structure


  - Create tree builder utility to convert flat file list to hierarchical structure
  - Implement directory node creation with collapsible state
  - Implement file node creation with template metadata
  - Add tag-based filtering logic
  - Implement directory expansion filtering
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 7.1 Write property test for tree structure generation

  - **Property 23: Hierarchical tree structure generation**
  - **Validates: Requirements 10.1**

- [x] 7.2 Write property test for directory filtering

  - **Property 24: Directory filtering**
  - **Validates: Requirements 10.2**

- [x] 7.3 Write property test for tag filtering

  - **Property 25: Tag-based filtering**
  - **Validates: Requirements 10.3**

- [x] 8. Update SteeringTemplateProvider with GitHub integration


  - Inject ConfigurationService, GitHubRepositoryService, CacheManager, and FileSystemService
  - Update getChildren to fetch from GitHub when configured
  - Implement fallback to local filesystem when GitHub config is not present
  - Add configuration source indicator in tree view
  - Update loadTemplate to use FileSystemService
  - Add error state handling in tree view
  - Display cache status and last fetch time
  - _Requirements: 1.5, 2.1, 4.2, 5.1, 6.5, 8.1, 8.4_

- [x] 8.1 Write integration tests for tree provider

  - Test GitHub mode template fetching
  - Test local mode fallback
  - Test configuration source display
  - Test error state rendering
  - _Requirements: 1.5, 8.1, 8.4_

- [x] 9. Implement new VS Code commands


  - Create "Configure GitHub Repository" command with input prompts
  - Create "Configure GitHub Token" command with secure input
  - Create "Clear GitHub Token" command
  - Create "Clear Cache" command
  - Create "Switch to Local Mode" command
  - Update "Refresh" command to support force refresh (bypass cache)
  - Add commands to package.json contributions
  - _Requirements: 1.1, 3.1, 3.5, 4.4, 8.3_

- [x] 9.1 Write integration tests for commands

  - Test repository configuration command
  - Test token management commands
  - Test cache clearing command
  - Test mode switching command
  - _Requirements: 1.1, 3.1, 3.5, 8.3_

- [x] 10. Implement error handling and logging







  - Create centralized error handler with error code mapping
  - Implement VS Code output channel for logging
  - Add error message formatting with user-friendly messages
  - Implement error recovery strategies (retry, fallback, graceful degradation)
  - Add error notification with action buttons (e.g., "Configure Token")
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.1 Write property test for error logging

  - **Property 18: Error logging completeness**
  - **Validates: Requirements 7.5**


- [x] 10.2 Write unit tests for error handling




  - Test error message formatting for each error code
  - Test retry logic with exponential backoff
  - Test graceful degradation scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11. Update extension activation and registration



  - Update extension.ts to instantiate all services
  - Wire up dependency injection for SteeringTemplateProvider
  - Register all new commands
  - Initialize configuration on activation
  - Add extension deactivation cleanup (clear sensitive data from memory)
  - _Requirements: All_

- [x] 11.1 Write E2E tests for extension activation


  - Test extension activates successfully with GitHub config
  - Test extension activates successfully with local config
  - Test extension activates successfully with no config
  - _Requirements: 8.1, 9.3_

- [x] 12. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Update configuration schema in package.json



  - Add kiroSteeringLoader.repository configuration object
  - Add kiroSteeringLoader.repository.owner property
  - Add kiroSteeringLoader.repository.repo property
  - Add kiroSteeringLoader.repository.path property (optional)
  - Add kiroSteeringLoader.repository.branch property (optional, default: main)
  - Keep kiroSteeringLoader.templatesPath for backward compatibility
  - Add configuration descriptions and examples
  - _Requirements: 1.1, 1.2, 8.1_

- [x] 14. Add user documentation
  - Update README.md with GitHub repository configuration instructions
  - Add authentication setup guide
  - Add troubleshooting section for common errors
  - Add migration guide from local to GitHub mode
  - Document rate limiting and caching behavior
  - Add examples of repository URL formats
  - _Requirements: All_

- [x] 15. Performance optimization and validation
  - Implement lazy loading for directory expansion
  - Add request batching where possible
  - Validate memory usage stays under 20MB
  - Validate extension activation time under 100ms
  - Add performance monitoring for API requests
  - _Requirements: All_

- [x] 15.1 Write performance tests
  - Test extension activation time
  - Test template fetch performance (cache hit vs miss)
  - Test memory usage with large repository
  - Test tree rendering performance with many templates
  - _Requirements: All_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

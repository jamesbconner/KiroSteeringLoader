# Requirements Document

## Introduction

This document specifies the requirements for version 0.1.0 of the Kiro Steering Loader extension. This version introduces GitHub repository integration, enabling teams and organizations to leverage version-controlled steering documents stored in GitHub repositories instead of local filesystem paths. This enhancement ensures steering documents are centrally managed, version controlled, and accessible across teams, while supporting collaborative improvements through pull requests.

## Glossary

- **Steering Document**: A markdown file containing rules, guidelines, or instructions that guide AI agent behavior in Kiro
- **GitHub Repository**: A version-controlled repository hosted on GitHub containing steering documents
- **Repository URL**: A GitHub repository URL in the format `https://github.com/owner/repo` or `owner/repo`
- **Repository Path**: An optional subdirectory path within a GitHub repository (e.g., `steering/rules`)
- **Template**: A steering document available for loading into a workspace
- **Workspace**: A VS Code workspace folder where steering documents are loaded into `.kiro/steering/`
- **Extension**: The Kiro Steering Loader VS Code extension
- **GitHub API**: The GitHub REST API used to fetch repository contents
- **Personal Access Token (PAT)**: An optional GitHub authentication token for accessing private repositories or increasing rate limits
- **Rate Limit**: GitHub API request limits (60 requests/hour unauthenticated, 5000/hour authenticated)
- **Cache**: Local storage of fetched repository contents to reduce API calls
- **Tree View**: The VS Code sidebar view displaying available steering templates

## Requirements

### Requirement 1

**User Story:** As a developer, I want to configure a GitHub repository as my steering templates source, so that I can access version-controlled steering documents maintained by my team or organization.

#### Acceptance Criteria

1. WHEN a user configures a GitHub repository URL THEN the Extension SHALL validate the URL format and accept both full URLs (`https://github.com/owner/repo`) and short format (`owner/repo`)
2. WHEN a user provides a repository with an optional path THEN the Extension SHALL support path specification in the format `owner/repo/path/to/steering` or `https://github.com/owner/repo` with separate path configuration
3. WHEN a user saves a valid repository configuration THEN the Extension SHALL persist the configuration in VS Code settings
4. WHEN a user provides an invalid repository URL THEN the Extension SHALL display a clear error message indicating the correct format
5. WHERE a user has configured a GitHub repository THEN the Extension SHALL display the repository information in the tree view header

### Requirement 2

**User Story:** As a developer, I want the extension to fetch steering documents from a GitHub repository, so that I can browse and load the latest version-controlled templates.

#### Acceptance Criteria

1. WHEN the Extension fetches repository contents THEN the Extension SHALL use the GitHub API to retrieve the file tree from the configured repository and path
2. WHEN fetching repository contents THEN the Extension SHALL filter for markdown files (`.md` extension) in the specified directory
3. WHEN the GitHub API returns file metadata THEN the Extension SHALL extract file names, paths, and SHA hashes for change detection
4. IF the GitHub API request fails THEN the Extension SHALL display an appropriate error message indicating the failure reason (network error, repository not found, rate limit exceeded)
5. WHEN multiple markdown files exist in the repository path THEN the Extension SHALL display all files in the tree view sorted alphabetically

### Requirement 3

**User Story:** As a developer, I want to authenticate with GitHub using a personal access token, so that I can access private repositories and avoid rate limiting issues.

#### Acceptance Criteria

1. WHERE a user provides a GitHub personal access token THEN the Extension SHALL store the token securely using VS Code's SecretStorage API
2. WHEN making GitHub API requests with a configured token THEN the Extension SHALL include the token in the Authorization header
3. WHEN a user has not provided a token THEN the Extension SHALL make unauthenticated requests and display remaining rate limit information
4. IF authentication fails with an invalid token THEN the Extension SHALL display an error message and prompt the user to update their token
5. WHEN a user wants to remove their token THEN the Extension SHALL provide a command to clear the stored token from SecretStorage

### Requirement 4

**User Story:** As a developer, I want the extension to cache fetched repository contents, so that I can browse templates quickly without hitting GitHub API rate limits.

#### Acceptance Criteria

1. WHEN the Extension successfully fetches repository contents THEN the Extension SHALL cache the file list and metadata locally with a timestamp
2. WHEN a user refreshes the template list THEN the Extension SHALL check if cached data exists and is less than 5 minutes old before making a new API request
3. WHEN cached data is available and fresh THEN the Extension SHALL display templates from cache without making an API request
4. WHEN a user explicitly requests a refresh THEN the Extension SHALL bypass the cache and fetch fresh data from GitHub
5. WHEN the Extension detects file changes using SHA hashes THEN the Extension SHALL invalidate the cache for changed files

### Requirement 5

**User Story:** As a developer, I want to load a steering document from the GitHub repository into my workspace, so that I can use version-controlled steering rules in my project.

#### Acceptance Criteria

1. WHEN a user clicks on a template in the tree view THEN the Extension SHALL fetch the raw file content from GitHub using the file's download URL
2. WHEN the Extension fetches file content THEN the Extension SHALL create the `.kiro/steering/` directory structure if it does not exist
3. WHEN writing the template file THEN the Extension SHALL save the content to `.kiro/steering/` with the original filename
4. IF a file with the same name already exists THEN the Extension SHALL prompt the user to confirm overwrite or cancel the operation
5. WHEN the template is successfully loaded THEN the Extension SHALL display a success notification with the template name

### Requirement 6

**User Story:** As a developer, I want to see metadata about steering templates, so that I can understand what each template does before loading it.

#### Acceptance Criteria

1. WHEN displaying a template in the tree view THEN the Extension SHALL show the filename without the `.md` extension
2. WHEN a user hovers over a template item THEN the Extension SHALL display a tooltip with the full filename and file size
3. WHERE the repository contains a README or description file THEN the Extension SHALL parse and display template descriptions in tooltips
4. WHEN a template file contains front matter metadata THEN the Extension SHALL extract and display relevant metadata (title, description, tags)
5. WHEN displaying the tree view THEN the Extension SHALL show the last fetch timestamp and cache status

### Requirement 7

**User Story:** As a developer, I want clear error handling and feedback, so that I understand what went wrong when operations fail.

#### Acceptance Criteria

1. WHEN a network error occurs during GitHub API requests THEN the Extension SHALL display an error message indicating network connectivity issues
2. WHEN the GitHub API rate limit is exceeded THEN the Extension SHALL display the rate limit reset time and suggest authentication
3. WHEN a repository is not found or is private without authentication THEN the Extension SHALL display an appropriate error message with troubleshooting steps
4. WHEN file operations fail (directory creation, file writing) THEN the Extension SHALL display specific error messages with the failure reason
5. WHEN any operation fails THEN the Extension SHALL log detailed error information to the VS Code output channel for debugging

### Requirement 8

**User Story:** As a developer, I want to migrate from local filesystem configuration to GitHub repository configuration, so that I can transition my existing setup to version-controlled templates.

#### Acceptance Criteria

1. WHEN the Extension detects an existing local filesystem configuration THEN the Extension SHALL continue to support the local path configuration
2. WHEN both local and GitHub configurations exist THEN the Extension SHALL prioritize the GitHub repository configuration
3. WHEN a user switches from local to GitHub configuration THEN the Extension SHALL provide a command to clear the local path setting
4. WHEN displaying templates THEN the Extension SHALL indicate the source (local filesystem or GitHub repository) in the tree view
5. WHEN migrating configurations THEN the Extension SHALL preserve all existing loaded templates in the workspace `.kiro/steering/` directory

### Requirement 9

**User Story:** As a team lead, I want to configure a default GitHub repository for my organization, so that all team members can access shared steering templates without individual configuration.

#### Acceptance Criteria

1. WHERE an organization has a default repository THEN the Extension SHALL support workspace-level configuration that overrides user-level settings
2. WHEN a workspace configuration exists THEN the Extension SHALL display a visual indicator showing the configuration source (user vs workspace)
3. WHEN a user opens a workspace with pre-configured repository settings THEN the Extension SHALL automatically fetch and display templates without additional setup
4. WHEN workspace settings conflict with user settings THEN the Extension SHALL use workspace settings and display a notification explaining the override
5. WHEN a user wants to use personal settings instead of workspace settings THEN the Extension SHALL provide a command to disable workspace configuration

### Requirement 10

**User Story:** As a developer, I want to browse templates by category or tag, so that I can quickly find relevant steering documents for my specific use case.

#### Acceptance Criteria

1. WHEN the repository contains subdirectories THEN the Extension SHALL display templates in a hierarchical tree structure organized by directory
2. WHEN a user expands a directory node THEN the Extension SHALL show all markdown files within that directory
3. WHEN template files contain tag metadata THEN the Extension SHALL support filtering templates by tags
4. WHEN multiple categories exist THEN the Extension SHALL allow users to collapse and expand category groups
5. WHEN displaying hierarchical templates THEN the Extension SHALL show directory icons for folders and file icons for templates

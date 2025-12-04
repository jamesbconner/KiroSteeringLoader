# Kiro Steering Loader

A Visual Studio Code extension that helps you load steering agent templates into your Kiro projects.

## Features

- **GitHub Repository Integration**: Load steering templates directly from GitHub repositories
- **Local Mode Support**: Use local filesystem templates as a fallback
- **Activity Bar Integration**: Access the extension from the VS Code activity bar
- **Template Management**: Browse and load steering templates with hierarchical folder structure
- **Automatic Directory Creation**: Creates `.kiro/steering/` directory structure automatically
- **Smart Caching**: 5-minute cache with SHA-based invalidation for optimal performance
- **Secure Token Storage**: GitHub tokens stored securely in VS Code's secret storage
- **Rate Limit Handling**: Automatic detection and user-friendly notifications

## Usage

### GitHub Mode (Recommended)

1. **Configure Repository**: Use Command Palette → "Kiro Steering Loader: Configure GitHub Repository"
   - Enter repository owner (e.g., `microsoft`)
   - Enter repository name (e.g., `vscode`)
   - Optionally specify a subdirectory path (e.g., `templates/steering`)
   - Optionally specify a branch (default: `main`)

2. **Configure Token (Optional)**: For private repositories or higher rate limits
   - Use Command Palette → "Kiro Steering Loader: Configure GitHub Token"
   - Enter your GitHub Personal Access Token
   - Token is stored securely in VS Code's secret storage

3. **Browse Templates**: Click the Kiro Steering icon in the activity bar to view available templates

4. **Load Templates**: Click on any template to load it into your workspace's `.kiro/steering/` directory

### Local Mode (Legacy)

1. **Set Templates Path**: Settings → Extensions → Kiro Steering Loader
   - Set to a local directory containing steering templates
   - Can also be set via Command Palette → "Kiro Steering Loader: Set Templates Path"

2. **Browse and Load**: Same as GitHub mode

### Switching Between Modes

- **Switch to Local Mode**: Command Palette → "Kiro Steering Loader: Switch to Local Mode"
- **Switch to GitHub Mode**: Configure a GitHub repository (see above)

## Configuration

### GitHub Repository Configuration

Configure via VS Code settings or `settings.json`:

```json
{
  "kiroSteeringLoader.repository": {
    "owner": "your-org",
    "repo": "your-repo",
    "path": "templates/steering",
    "branch": "main"
  }
}
```

**Configuration Properties:**

- `kiroSteeringLoader.repository.owner` (required): GitHub repository owner or organization
- `kiroSteeringLoader.repository.repo` (required): GitHub repository name
- `kiroSteeringLoader.repository.path` (optional): Subdirectory path within the repository
- `kiroSteeringLoader.repository.branch` (optional): Branch name (default: `main`)

### Cache Configuration

```json
{
  "kiroSteeringLoader.cache.ttl": 300,
  "kiroSteeringLoader.cache.maxEntries": 100
}
```

- `kiroSteeringLoader.cache.ttl`: Cache time-to-live in seconds (60-3600, default: 300)
- `kiroSteeringLoader.cache.maxEntries`: Maximum cache entries (10-1000, default: 100)

### Legacy Local Mode Configuration

- `kiroSteeringLoader.templatesPath`: Path to local directory containing steering templates

## Authentication Setup

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Kiro Steering Loader")
4. Select scopes:
   - For public repositories: No scopes required
   - For private repositories: Select `repo` scope
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)
7. Configure in VS Code using Command Palette → "Kiro Steering Loader: Configure GitHub Token"

### Token Security

- Tokens are stored in VS Code's secure secret storage
- Tokens are never logged or displayed in plain text
- Use Command Palette → "Kiro Steering Loader: Clear GitHub Token" to remove stored tokens

## Rate Limiting and Caching

### GitHub API Rate Limits

- **Without authentication**: 60 requests per hour
- **With authentication**: 5,000 requests per hour

### Caching Behavior

- Templates are cached for 5 minutes (configurable)
- Cache is automatically invalidated when repository content changes (SHA-based)
- Use Command Palette → "Kiro Steering Loader: Clear Cache" to force refresh
- LRU eviction ensures cache stays within configured size limits

## Troubleshooting

### Common Errors

**"Repository not found or not accessible"**
- Verify repository owner and name are correct
- For private repositories, ensure you've configured a GitHub token with appropriate permissions
- Check that the specified branch exists

**"GitHub API rate limit exceeded"**
- Configure a GitHub Personal Access Token to increase rate limit from 60 to 5,000 requests/hour
- Wait for rate limit to reset (shown in error message)
- Cached templates will continue to work during rate limit

**"Failed to fetch templates from GitHub"**
- Check your internet connection
- Verify the repository path exists
- Check VS Code Output panel (View → Output → "Kiro Steering Loader") for detailed error logs

**"Permission denied when writing template"**
- Ensure you have write permissions to the workspace directory
- Check that the workspace folder is open in VS Code

**"Cache corrupted"**
- Use Command Palette → "Kiro Steering Loader: Clear Cache"
- Refresh the template list

### Viewing Detailed Logs

1. Open VS Code Output panel: View → Output
2. Select "Kiro Steering Loader" from the dropdown
3. All operations, errors, and API calls are logged here

### Migration from Local to GitHub Mode

1. **Backup existing templates**: Copy your `.kiro/steering/` directory
2. **Configure GitHub repository**: Follow GitHub Mode setup above
3. **Verify templates load**: Check that templates appear in the tree view
4. **Optional**: Remove local templates path configuration

## Repository URL Formats

The extension supports various GitHub repository URL formats:

- `owner/repo` - Root of repository
- `owner/repo/path/to/templates` - Subdirectory in repository
- Branch specification via configuration (not in URL)

**Examples:**

```json
// Root of repository
{
  "kiroSteeringLoader.repository": {
    "owner": "microsoft",
    "repo": "vscode"
  }
}

// Subdirectory
{
  "kiroSteeringLoader.repository": {
    "owner": "microsoft",
    "repo": "vscode",
    "path": "extensions/markdown-language-features/templates"
  }
}

// Specific branch
{
  "kiroSteeringLoader.repository": {
    "owner": "microsoft",
    "repo": "vscode",
    "branch": "release/1.85"
  }
}
```

## Requirements

- Visual Studio Code 1.74.0 or higher
- A workspace folder must be open to load templates

## Installation

1. npm install -g vsce
2. Package the extension: `vsce package`
3. Install the generated `.vsix` file in VS Code

## Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. npm install -g vsce

### Testing

This project includes comprehensive testing infrastructure:

```bash
# Run all tests
npm run test

# Run tests with coverage (85% threshold enforced)
npm run test:coverage

# Run integration tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run memory usage tests
npm run test:memory
```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs on every push and PR with cross-platform testing (Ubuntu, Windows, macOS)
- **PR Validation**: Automated code quality checks, coverage analysis, and performance regression detection
- **Nightly Tests**: Comprehensive testing including large dataset performance and security audits
- **Release Pipeline**: Automated packaging and publishing to VS Code Marketplace

See [.github/README.md](.github/README.md) for detailed CI/CD documentation.

### Quality Standards

- **Code Coverage**: Minimum 85% line coverage required
- **Performance**: Activation time <500ms, memory usage <50MB
- **Cross-Platform**: Full compatibility with Windows, macOS, and Linux
- **Security**: Regular vulnerability scanning and dependency auditing
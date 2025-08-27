# Changelog

All notable changes to the Kiro Steering Loader extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive testing infrastructure with 85%+ code coverage requirement
- GitHub Actions CI/CD pipeline with multi-platform testing
- Performance monitoring and regression detection
- Memory usage monitoring and leak detection
- Cross-platform compatibility testing (Windows, macOS, Linux)
- Automated security vulnerability scanning
- Local CI check script for developers (`npm run ci:check`)

### Testing
- Unit tests for all core components (SteeringTemplateProvider, TemplateItem, extension activation)
- Integration tests for VS Code extension functionality
- End-to-end tests using @vscode/test-electron
- Performance tests including large dataset scenarios (100-1000+ templates)
- Memory usage tests with garbage collection monitoring
- Cross-platform file system operation testing

### CI/CD
- Multi-platform testing matrix (Ubuntu, Windows, macOS with Node.js 18.x, 20.x)
- Coverage quality gates with 85% minimum threshold
- Performance regression detection with configurable thresholds
- Automated PR validation with test result comments
- Nightly comprehensive testing including security audits
- Automated release pipeline with VS Code Marketplace publishing

## [0.0.2] - 2024-01-XX

### Added
- Initial release of Kiro Steering Loader extension
- Activity bar integration for easy access
- Template browsing and loading functionality
- Automatic `.kiro/steering/` directory creation
- Configuration management for templates path
- Refresh functionality for template list updates

### Features
- Browse steering templates from configured directory
- One-click template loading into workspace
- Visual feedback for template operations
- Cross-platform file system operations
- VS Code workspace integration

### Requirements
- Visual Studio Code 1.74.0 or higher
- Active workspace folder for template loading

## [0.0.1] - Initial Development

### Added
- Basic extension structure
- Core template loading functionality
- VS Code extension manifest and configuration
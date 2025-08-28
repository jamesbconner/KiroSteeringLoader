# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for the Kiro Steering Loader extension. The CI/CD pipeline provides comprehensive testing, quality assurance, and automated deployment.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:** Push to `main`/`develop`, Pull Requests

**Jobs:**
- **Test Matrix:** Runs tests on Ubuntu, Windows, and macOS with Node.js 18.x and 20.x
- **Lint & Type Check:** TypeScript compilation and type checking
- **Package:** Creates VSIX package for distribution
- **Coverage Check:** Enforces 85% code coverage threshold
- **Performance Regression:** Detects performance degradation

**Test Coverage:**
- Unit tests for all core components
- Integration tests for VS Code extension functionality
- End-to-end tests using @vscode/test-electron
- Performance tests including memory usage monitoring

### 2. PR Validation (`pr-validation.yml`)

**Triggers:** Pull Request events (opened, synchronized, reopened)

**Features:**
- Coverage delta analysis (prevents >2% coverage decrease)
- Performance impact assessment
- Security vulnerability scanning
- Code quality checks
- Automated PR comments with test results

### 3. Nightly Tests (`nightly.yml`)

**Triggers:** Daily at 2 AM UTC, Manual dispatch

**Comprehensive Testing:**
- Large dataset performance testing (100-1000+ templates)
- Cross-platform compatibility matrix
- Memory leak detection
- Security auditing
- Dependency update checking

### 4. Release Pipeline (`release.yml`)

**Triggers:** Git tags (`v*`), Manual dispatch

**Release Process:**
1. Pre-release testing with full test suite
2. Coverage verification (≥85% required)
3. Extension packaging with vsce
4. GitHub release creation with artifacts
5. VS Code Marketplace publishing (requires `VSCE_PAT` secret)

## Configuration Requirements

### Secrets

The following secrets need to be configured in the repository:

- `VSCE_PAT`: Personal Access Token for VS Code Marketplace publishing
- `CODECOV_TOKEN`: (Optional) Token for Codecov integration

### Environment Protection

The `marketplace` environment should be configured with protection rules for the release workflow.

## Quality Gates

### Coverage Requirements
- **Minimum Coverage:** 85% line coverage
- **PR Coverage Delta:** Cannot decrease by more than 2%
- **Coverage Reporting:** Automated reports uploaded to Codecov

### Performance Thresholds
- **Activation Time:** <500ms baseline, <15% regression allowed
- **Memory Usage:** <50MB baseline, <20% increase allowed
- **Large Dataset:** Must handle 1000+ templates within performance bounds

### Security Requirements
- **Vulnerability Scanning:** No high or critical vulnerabilities allowed
- **Dependency Auditing:** Regular security audits in nightly builds
- **Automated Updates:** Dependency update notifications

## Test Execution

### Local Development
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run memory tests
npm run test:memory
```

### CI Environment Variables

The workflows use the following environment variables:

- `DISPLAY=:99.0`: For Linux E2E testing with virtual display
- `NODE_OPTIONS`: Memory and garbage collection settings for performance tests

## Artifacts

### Test Artifacts
- `test-results-{os}-{node-version}`: Test results and coverage reports
- `nightly-performance-results`: Comprehensive performance data
- `platform-results-{os}-node{version}`: Cross-platform compatibility results

### Release Artifacts
- `extension-package`: VSIX file for distribution
- `dependency-report`: Outdated dependency analysis

## Monitoring and Notifications

### Performance Monitoring
- Baseline performance metrics stored in `coverage/performance-baseline.json`
- Regression detection with configurable thresholds
- Performance trend tracking over time

### Test Result Reporting
- Automated PR comments with test summaries
- Coverage trend visualization
- Performance impact analysis

### Failure Handling
- Detailed error logs and stack traces
- Artifact preservation for debugging
- Notification integration (can be extended with Slack/Teams)

## Maintenance

### Regular Tasks
- Review and update Node.js versions in matrix
- Update performance baselines when legitimate improvements are made
- Monitor dependency security advisories
- Review and adjust coverage thresholds as codebase evolves

### Troubleshooting

**Common Issues:**
1. **E2E Test Failures:** Check display configuration for Linux runners
2. **Coverage Drops:** Ensure new code includes appropriate tests
3. **Performance Regression:** Review recent changes for optimization opportunities
4. **Security Vulnerabilities:** Update dependencies or apply patches

**Debug Commands:**
```bash
# Local E2E debugging
npm run test:e2e -- --reporter=verbose

# Performance profiling
npm run test:performance -- --reporter=verbose

# Memory analysis
npm run test:memory -- --expose-gc
```

## Extension and Customization

The workflows are designed to be extensible:

- Add new test categories by creating additional jobs
- Extend platform matrix for additional OS/Node.js combinations
- Integrate additional quality tools (ESLint, Prettier, etc.)
- Add deployment targets (Open VSX Registry, etc.)

For questions or issues with the CI/CD pipeline, please create an issue with the `ci/cd` label.
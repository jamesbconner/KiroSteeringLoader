# Test Maintenance Guide

## Overview

This guide provides comprehensive instructions for maintaining the test suite health, performance, and reliability over time. The maintenance system includes automated monitoring, reporting, and cleanup tools.

## Quick Start

### Daily Maintenance (Automated)

The system runs automated health checks daily via GitHub Actions:

```bash
# Manual health check
npm run test:health-check

# Full maintenance suite
npm run test:maintenance:full
```

### Weekly Maintenance (Manual)

```bash
# 1. Run comprehensive health check
npm run test:health-check

# 2. Review and clean up
npm run test:cleanup

# 3. Check dependencies
npm run test:dependency-check

# 4. Analyze performance trends
npm run test:performance-report
```

## Maintenance Components

### 1. Health Monitoring

**Purpose**: Track overall test suite health and identify issues early.

**Key Metrics**:
- Test pass rate (target: 100%)
- Coverage percentage (target: 85%+)
- Performance metrics (average duration, slow tests)
- Flaky test detection

**Commands**:
```bash
# Run complete health check
npm run test:health-check

# View health trends
cat tests/reports/health-summary.md
```

**Health Score Calculation**:
- **90-100**: Excellent health 🟢
- **70-89**: Good health, minor issues 🟡
- **Below 70**: Poor health, needs attention 🔴

### 2. Performance Monitoring

**Purpose**: Track test execution performance and identify bottlenecks.

**Metrics Tracked**:
- Average test duration
- Slowest tests
- Memory usage patterns
- Performance regressions

**Thresholds**:
- Unit tests: < 100ms
- Integration tests: < 500ms
- E2E tests: < 5000ms

**Commands**:
```bash
# Generate performance report
npm run test:performance-report

# View performance trends
cat tests/reports/performance-summary.md
```

### 3. Flaky Test Detection

**Purpose**: Identify unreliable tests that pass/fail inconsistently.

**Detection Criteria**:
- Pass rate between 20-80%
- High duration variance
- Multiple different failure reasons

**Commands**:
```bash
# Check for flaky tests
npm run test:flaky-check

# View flaky test report
cat tests/reports/flaky-tests-report.md
```

### 4. Dependency Management

**Purpose**: Monitor dependencies for updates and security vulnerabilities.

**Monitoring**:
- Available updates (major, minor, patch)
- Security vulnerabilities
- Testing-critical dependencies

**Commands**:
```bash
# Check dependencies
npm run test:dependency-check

# View update plan
cat tests/reports/dependency-update-plan.md
```

### 5. Cleanup and Structure Validation

**Purpose**: Maintain clean test structure and remove unnecessary files.

**Cleanup Tasks**:
- Remove old report files (30+ days)
- Clean temporary test files
- Validate test file structure
- Identify orphaned tests

**Commands**:
```bash
# Run cleanup
npm run test:cleanup

# View cleanup report
cat tests/reports/cleanup-report.md
```

## Automated Monitoring

### GitHub Actions Workflow

The system includes automated daily health checks via GitHub Actions:

**Workflow**: `.github/workflows/test-health-check.yml`

**Features**:
- Daily automated execution
- Multi-platform testing (optional)
- Automatic issue creation for critical problems
- Report artifact storage
- PR comment integration

**Manual Trigger**:
```bash
# Trigger via GitHub CLI
gh workflow run test-health-check.yml

# Or via GitHub web interface
```

### Health Check Notifications

**Critical Issues** (automatic GitHub issue creation):
- Security vulnerabilities (critical/high)
- Test failures
- Coverage drops below threshold
- Performance regressions

**Issue Labels**: `test-health`, `critical`, `maintenance`

## Maintenance Schedules

### Daily (Automated)
- ✅ Health check execution
- ✅ Report generation
- ✅ Critical issue detection
- ✅ Artifact storage

### Weekly (Manual Review)
- 📋 Review health trends
- 📋 Address flaky tests
- 📋 Update dependencies (non-critical)
- 📋 Performance optimization

### Monthly (Deep Maintenance)
- 🔧 Comprehensive cleanup
- 🔧 Test structure review
- 🔧 Dependency major updates
- 🔧 Performance baseline updates

## Troubleshooting Common Issues

### 1. Health Check Failures

**Symptoms**: Health check script exits with error code

**Common Causes**:
- Test failures
- Coverage below threshold
- Performance regressions
- Security vulnerabilities

**Resolution**:
```bash
# Check specific issues
npm run test:health-check

# Review detailed reports
ls tests/reports/

# Fix issues based on recommendations
```

### 2. Performance Degradation

**Symptoms**: Tests running slower than usual

**Investigation**:
```bash
# Generate performance report
npm run test:performance-report

# Check for slow tests
grep -A 5 "Slowest Tests" tests/reports/performance-summary.md

# Profile specific tests
npx vitest run --reporter=verbose tests/path/to/slow-test.ts
```

**Common Solutions**:
- Optimize test setup/teardown
- Reduce mock complexity
- Parallelize test execution
- Remove unnecessary async operations

### 3. Flaky Tests

**Symptoms**: Tests that sometimes pass, sometimes fail

**Investigation**:
```bash
# Check flaky test report
npm run test:flaky-check

# Run specific test multiple times
for i in {1..10}; do npm test -- tests/path/to/flaky-test.ts; done
```

**Common Solutions**:
- Add proper test isolation
- Fix timing-dependent logic
- Improve mock reliability
- Add retry mechanisms for external dependencies

### 4. Dependency Issues

**Symptoms**: Security warnings, outdated packages

**Investigation**:
```bash
# Check dependency status
npm run test:dependency-check

# Check for vulnerabilities
npm audit

# Check for updates
npm outdated
```

**Resolution Process**:
1. **Security updates**: Apply immediately
2. **Testing framework updates**: Test thoroughly
3. **Major updates**: Review changelogs, test in isolation
4. **Minor/patch updates**: Apply in batches

## Configuration

### Health Check Thresholds

Edit thresholds in `tests/maintenance/daily-health-check.ts`:

```typescript
// Coverage threshold
const coverageTarget = 85;

// Performance thresholds
const performanceThresholds = {
  unit: 100,      // ms
  integration: 500, // ms
  e2e: 5000,      // ms
};

// Flaky test detection
const flakyTestMinRuns = 5;
const flakyTestPassRateRange = [0.2, 0.8];
```

### Report Retention

Configure in `tests/maintenance/test-cleanup.ts`:

```typescript
private readonly maxReportAge = 30; // days
private readonly maxTempFileAge = 1; // days
```

### GitHub Actions Schedule

Modify in `.github/workflows/test-health-check.yml`:

```yaml
on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM UTC
```

## Best Practices

### 1. Regular Monitoring
- Review health reports weekly
- Address critical issues immediately
- Monitor trends over time
- Set up notifications for critical issues

### 2. Proactive Maintenance
- Update dependencies regularly
- Fix flaky tests promptly
- Optimize slow tests
- Clean up test structure

### 3. Documentation
- Document maintenance decisions
- Keep troubleshooting guides updated
- Share knowledge with team
- Update thresholds as needed

### 4. Automation
- Leverage automated health checks
- Set up proper notifications
- Use CI/CD integration
- Automate routine tasks

## Integration with Development Workflow

### Pre-commit Hooks
```bash
# Add to .husky/pre-commit or similar
npm run test:health-check --silent
```

### PR Checks
The health check workflow automatically comments on PRs with health issues.

### Release Process
```bash
# Before release
npm run test:maintenance:full

# Ensure health score > 90
# Address any critical issues
```

## Reporting and Analytics

### Available Reports

1. **Health Summary** (`health-summary.md`)
   - Overall health score
   - Key metrics
   - Recommendations

2. **Performance Summary** (`performance-summary.md`)
   - Execution times
   - Slow tests
   - Memory usage

3. **Flaky Test Report** (`flaky-tests-report.md`)
   - Unreliable tests
   - Pass rates
   - Failure patterns

4. **Dependency Summary** (`dependency-summary.md`)
   - Available updates
   - Security issues
   - Update priorities

5. **Cleanup Report** (`cleanup-report.md`)
   - Files cleaned
   - Structure issues
   - Space freed

### Trend Analysis

Reports include trend analysis when historical data is available:
- Health score changes
- Performance regressions
- Dependency update patterns
- Cleanup effectiveness

## Support and Troubleshooting

### Getting Help

1. **Check Reports**: Review generated reports in `tests/reports/`
2. **Run Diagnostics**: Use individual maintenance commands
3. **Review Logs**: Check GitHub Actions logs for automated runs
4. **Documentation**: Refer to this guide and tool-specific docs

### Common Commands Reference

```bash
# Health and monitoring
npm run test:health-check          # Complete health check
npm run test:performance-report    # Performance analysis
npm run test:flaky-check          # Flaky test detection

# Maintenance
npm run test:cleanup              # Clean up files
npm run test:dependency-check     # Check dependencies
npm run test:maintenance          # Basic maintenance
npm run test:maintenance:full     # Complete maintenance

# Individual tools
npx tsx tests/maintenance/cli-runners.ts cleanup
npx tsx tests/maintenance/cli-runners.ts dependencies
npx tsx tests/maintenance/cli-runners.ts performance
npx tsx tests/maintenance/cli-runners.ts flaky
```

This maintenance system ensures your test suite remains healthy, performant, and reliable over time through automated monitoring and proactive maintenance practices.
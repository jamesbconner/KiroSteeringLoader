# Coverage Reporting and Quality Gates

This document describes the comprehensive coverage reporting and quality gate system implemented for the Kiro Steering Loader extension.

## Overview

The coverage system provides:
- **Automated coverage report generation** in multiple formats (JSON, HTML, Markdown, LCOV)
- **Quality gate enforcement** with configurable thresholds
- **Coverage trend tracking** over time with regression detection
- **Interactive dashboard** for visualizing coverage metrics
- **CI/CD integration** with automated quality checks

## Components

### 1. Coverage Reporter (`scripts/coverage-reporter.ts`)

Generates comprehensive coverage reports and enforces quality gates.

**Features:**
- Parses Vitest coverage output
- Calculates coverage metrics (lines, functions, branches, statements)
- Enforces 85% coverage threshold
- Generates reports in JSON, HTML, and Markdown formats
- Tracks coverage trends over time

**Usage:**
```bash
# Check quality gates and generate reports
npm run coverage:check

# Generate reports only
npm run coverage:report

# Run full quality gate process
npm run coverage:quality-gate
```

### 2. Trend Analyzer (`scripts/coverage-trend-analyzer.ts`)

Analyzes coverage trends and detects regressions.

**Features:**
- Tracks coverage changes over time
- Detects significant regressions (>2% decrease)
- Provides trend analysis and recommendations
- Generates trend reports in JSON and Markdown

**Usage:**
```bash
# Analyze trends for last 30 days
npm run coverage:trends

# Analyze trends for specific period
npm run coverage:trends 7  # Last 7 days
```

### 3. Coverage Dashboard (`scripts/coverage-dashboard.ts`)

Generates an interactive HTML dashboard for coverage visualization.

**Features:**
- Real-time coverage metrics display
- Interactive trend charts using Chart.js
- Visual status indicators
- Responsive design

**Usage:**
```bash
# Generate coverage dashboard
npm run coverage:dashboard
```

### 4. Post-Test Coverage Processor (`scripts/post-test-coverage.ts`)

Automatically runs after tests to process coverage data.

**Features:**
- Orchestrates all coverage processing steps
- Handles errors gracefully in development
- Enforces quality gates in CI/CD
- Provides comprehensive summary

**Usage:**
```bash
# Run post-test coverage processing
npm run coverage:post-test
```

## Configuration

### Quality Gate Thresholds

Coverage thresholds are configured in `tests/config/coverage-quality-gate.config.ts`:

```typescript
export const defaultQualityGateConfig = {
  thresholds: {
    lines: 85,
    functions: 85,
    branches: 85,
    statements: 85
  },
  failOnLowCoverage: true,
  enableTrendTracking: true,
  // ... other options
};
```

### Environment-Specific Configuration

Different environments have different threshold requirements:

- **Development**: 80% threshold, non-blocking
- **CI**: 85% threshold, blocking
- **Production**: 90% threshold, blocking

### Vitest Integration

Coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'json', 'lcov', 'text-summary'],
  thresholds: {
    lines: 85,
    functions: 85,
    branches: 85,
    statements: 85,
    perFile: true
  },
  // ... other options
}
```

## CI/CD Integration

### GitHub Actions Workflow

The coverage system is integrated into the CI pipeline:

1. **Test Execution**: All test suites run with coverage collection
2. **Coverage Processing**: Post-test coverage processing runs automatically
3. **Quality Gate Check**: Build fails if coverage is below threshold
4. **Report Generation**: Coverage reports are generated and uploaded as artifacts
5. **PR Comments**: Coverage reports are automatically posted to pull requests

### Artifacts

The following artifacts are generated and stored:

- `coverage-report-*.json` - Detailed coverage data
- `coverage-report-*.html` - HTML coverage report
- `coverage-report-*.md` - Markdown coverage summary
- `coverage-trend-analysis-*.json` - Trend analysis data
- `coverage-trend-analysis-*.md` - Trend analysis report
- `coverage-dashboard.html` - Interactive dashboard
- `coverage-trends.json` - Historical trend data

## Usage Examples

### Running Coverage Locally

```bash
# Run tests with coverage
npm run test:coverage

# Run full coverage quality gate
npm run coverage:quality-gate

# Generate coverage dashboard
npm run coverage:dashboard

# View coverage trends
npm run coverage:trends
```

### Viewing Reports

After running coverage, several reports are available:

1. **HTML Report**: `coverage/index.html` - Detailed line-by-line coverage
2. **Dashboard**: `coverage/coverage-dashboard.html` - Interactive overview
3. **Markdown Report**: `coverage/coverage-report-*.md` - Summary for documentation

### Understanding Quality Gates

Quality gates enforce minimum coverage requirements:

- ✅ **PASSED**: All metrics meet 85% threshold
- ❌ **FAILED**: One or more metrics below threshold

When quality gates fail:
- **Development**: Warning displayed, build continues
- **CI/CD**: Build fails, merge blocked

### Trend Analysis

Coverage trends help identify:

- **Improvements**: Coverage increasing over time
- **Regressions**: Significant coverage decreases
- **Stability**: Consistent coverage levels

Trend analysis provides:
- Change detection (>1% change is significant)
- Regression alerts (>2% decrease)
- Recommendations for improvement

## Troubleshooting

### Common Issues

1. **No coverage data found**
   - Ensure tests are running with `--coverage` flag
   - Check that `coverage/coverage-final.json` exists

2. **Quality gate failures**
   - Review coverage report to identify uncovered code
   - Add tests for uncovered lines/functions
   - Consider adjusting thresholds if appropriate

3. **Trend analysis errors**
   - Ensure `coverage/coverage-trends.json` exists
   - Check that at least 2 trend data points are available

4. **Dashboard not loading**
   - Verify Chart.js CDN is accessible
   - Check browser console for JavaScript errors

### Debug Commands

```bash
# Check coverage file exists
ls -la coverage/coverage-final.json

# View raw coverage data
cat coverage/coverage-final.json | jq

# Check trend data
cat coverage/coverage-trends.json | jq

# Validate configuration
npx tsx -e "console.log(require('./tests/config/coverage-quality-gate.config.ts'))"
```

## Best Practices

### Writing Testable Code

1. **Keep functions small** - Easier to achieve 100% coverage
2. **Avoid complex conditionals** - Reduces branch coverage complexity
3. **Use dependency injection** - Makes mocking easier
4. **Separate concerns** - Isolate business logic from framework code

### Maintaining High Coverage

1. **Write tests first** - TDD approach ensures coverage
2. **Review coverage reports** - Identify gaps regularly
3. **Set up pre-commit hooks** - Prevent coverage regressions
4. **Monitor trends** - Track coverage over time

### CI/CD Best Practices

1. **Fail fast** - Stop builds early on coverage failures
2. **Cache dependencies** - Speed up CI runs
3. **Parallel execution** - Run tests concurrently when possible
4. **Artifact storage** - Preserve reports for analysis

## Future Enhancements

Potential improvements to the coverage system:

1. **Integration with external services** (Codecov, Coveralls)
2. **Slack/Teams notifications** for coverage changes
3. **Coverage badges** for README files
4. **Historical data visualization** with longer-term trends
5. **Per-file coverage tracking** with detailed analysis
6. **Coverage diff reporting** for pull requests
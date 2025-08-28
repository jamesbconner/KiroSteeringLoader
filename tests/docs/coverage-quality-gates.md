# Coverage Quality Gates Documentation

## Overview

The Kiro Steering Loader extension implements comprehensive coverage quality gates to ensure high code quality and prevent regressions. This document describes the coverage system, quality gates, and how to work with them.

## Coverage Requirements

### Minimum Thresholds

All code must meet the following minimum coverage thresholds:

- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 85%
- **Statements**: 85%

### Quality Gate Enforcement

Quality gates are enforced at multiple levels:

1. **Local Development**: Warnings displayed when coverage drops below threshold
2. **CI/CD Pipeline**: Build fails if coverage is below threshold
3. **Pull Requests**: Coverage reports posted as PR comments
4. **Merge Protection**: PRs cannot be merged if quality gates fail

## Coverage Reporting

### Generated Reports

The coverage system generates multiple report formats:

#### 1. HTML Reports
- **Location**: `coverage/index.html`
- **Description**: Interactive HTML report with detailed file-by-file coverage
- **Usage**: Open in browser for detailed analysis

#### 2. JSON Reports
- **Location**: `coverage/coverage-final.json`
- **Description**: Machine-readable coverage data
- **Usage**: Used by scripts and CI/CD for analysis

#### 3. LCOV Reports
- **Location**: `coverage/lcov.info`
- **Description**: Standard LCOV format for external tools
- **Usage**: Integration with Codecov, SonarQube, etc.

#### 4. Coverage Dashboard
- **Location**: `coverage/coverage-dashboard.html`
- **Description**: Interactive dashboard with trends and metrics
- **Features**:
  - Real-time coverage metrics
  - Historical trend charts
  - Quality gate status
  - Auto-refresh capability

### Trend Analysis

Coverage trends are tracked over time to identify:

- **Improvements**: Coverage increases over time
- **Regressions**: Coverage decreases that need attention
- **Stability**: Consistent coverage maintenance

#### Trend Reports
- **Location**: `coverage/coverage-trend-analysis-*.md`
- **Content**: 
  - Period analysis (last 7, 30 days)
  - Metric-by-metric trend analysis
  - Regression detection
  - Recommendations for improvement

## Working with Coverage

### Running Coverage Locally

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage reports
npm run coverage:report

# Check quality gates
npm run coverage:check

# Generate trend analysis
npm run coverage:trends

# Generate interactive dashboard
npm run coverage:dashboard

# Complete coverage workflow
npm run coverage:quality-gate
```

### Understanding Coverage Output

#### Console Output
```
📊 Coverage Quality Gate Report
===============================
Threshold: 85%
Status: ✅ PASSED

✅ lines        :  92.5% (185/200)
✅ functions    :  88.2% (45/51)
✅ branches     :  86.7% (26/30)
✅ statements   :  91.8% (183/199)

✅ Coverage quality gate passed. All metrics meet the required threshold.
```

#### Quality Gate Status
- ✅ **PASSED**: All metrics meet or exceed 85% threshold
- ❌ **FAILED**: One or more metrics below 85% threshold
- ⚠️ **WARNING**: Coverage close to threshold (within 2%)

### Improving Coverage

#### 1. Identify Uncovered Code
```bash
# Generate detailed HTML report
npm run test:coverage

# Open coverage/index.html in browser
# Red lines indicate uncovered code
```

#### 2. Add Missing Tests
Focus on:
- **Uncovered functions**: Add unit tests
- **Uncovered branches**: Add tests for different conditions
- **Uncovered lines**: Add tests for specific code paths

#### 3. Test Edge Cases
Ensure tests cover:
- Error conditions
- Boundary values
- Different input types
- Async operations

## CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline includes comprehensive coverage checking:

```yaml
- name: Run comprehensive coverage processing
  run: npm run coverage:quality-gate

- name: Check coverage quality gate
  run: |
    if npm run coverage:check; then
      echo "✅ Coverage quality gate passed"
    else
      echo "❌ Coverage quality gate failed"
      exit 1
    fi
```

### Artifacts Generated

The CI pipeline generates and stores:

1. **Coverage Reports**: HTML, JSON, LCOV formats
2. **Trend Analysis**: Historical coverage data
3. **Coverage Dashboard**: Interactive visualization
4. **Coverage Badge**: SVG badge for README
5. **Quality Gate Results**: Pass/fail status

### Pull Request Integration

For each PR, the system:

1. **Runs Coverage Analysis**: Calculates coverage for PR changes
2. **Compares with Base**: Identifies coverage changes
3. **Posts PR Comment**: Detailed coverage report
4. **Updates Status Checks**: Pass/fail status
5. **Blocks Merge**: If quality gates fail

#### Sample PR Comment
```markdown
## 📊 Coverage Quality Gate Report

**Status:** ✅ PASSED
**Threshold:** 85%

| Metric | Covered | Total | Percentage | Status |
|--------|---------|-------|------------|--------|
| Lines | 185 | 200 | 92.5% | ✅ |
| Functions | 45 | 51 | 88.2% | ✅ |
| Branches | 26 | 30 | 86.7% | ✅ |
| Statements | 183 | 199 | 91.8% | ✅ |

✅ **All coverage metrics meet the required threshold of 85%**

![Coverage Badge](https://img.shields.io/badge/coverage-92.5%25-brightgreen)

📈 **[View Detailed Coverage Dashboard](../coverage/coverage-dashboard.html)**
```

## Configuration

### Coverage Configuration File

Coverage settings are centralized in `coverage.config.js`:

```javascript
module.exports = {
  thresholds: {
    global: {
      lines: 85,
      functions: 85,
      branches: 85,
      statements: 85
    }
  },
  qualityGate: {
    enforceThresholds: true,
    strictMode: process.env.CI === 'true'
  }
  // ... additional configuration
};
```

### Environment Variables

- `COVERAGE_THRESHOLD`: Override default threshold (default: 85)
- `COVERAGE_DIR`: Coverage output directory (default: coverage)
- `CI`: Enable strict mode in CI environment
- `NODE_ENV`: Environment-specific behavior

## Troubleshooting

### Common Issues

#### 1. Coverage Below Threshold
```
❌ Coverage quality gate failed
Lines coverage (82.5%) is below threshold (85%)
```

**Solution**: Add tests to cover missing lines

#### 2. Flaky Coverage Results
**Symptoms**: Coverage varies between runs
**Solution**: Ensure deterministic test execution

#### 3. Excluded Files Not Working
**Symptoms**: Test files included in coverage
**Solution**: Check exclude patterns in `vitest.config.ts`

#### 4. Trend Analysis Fails
**Symptoms**: No trend data available
**Solution**: Run tests multiple times to build trend history

### Debug Commands

```bash
# Verbose coverage output
npm run test:coverage -- --reporter=verbose

# Coverage with specific files
npm run test:coverage -- src/specific-file.ts

# Debug coverage calculation
node -e "console.log(require('./coverage/coverage-final.json'))"
```

## Best Practices

### 1. Write Tests First
- Use TDD approach
- Write tests before implementation
- Ensure comprehensive test coverage

### 2. Focus on Quality
- Don't just aim for coverage percentage
- Ensure tests are meaningful
- Test edge cases and error conditions

### 3. Monitor Trends
- Review coverage trends regularly
- Address regressions quickly
- Celebrate improvements

### 4. Use Coverage Tools
- Leverage HTML reports for detailed analysis
- Use dashboard for trend monitoring
- Review PR comments for changes

### 5. Maintain Standards
- Keep thresholds consistent
- Don't lower standards without good reason
- Document any exceptions

## Integration with Development Workflow

### Pre-commit Hooks
Consider adding coverage checks to pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run coverage:check"
    }
  }
}
```

### IDE Integration
Most IDEs support coverage visualization:
- VS Code: Coverage Gutters extension
- WebStorm: Built-in coverage support
- Vim: Coverage plugins available

### Continuous Monitoring
Set up monitoring for:
- Coverage trend alerts
- Quality gate failures
- Regression notifications

## Conclusion

The coverage quality gate system ensures high code quality through:

1. **Automated Enforcement**: Quality gates prevent low-coverage code
2. **Comprehensive Reporting**: Multiple report formats for different needs
3. **Trend Analysis**: Historical tracking and regression detection
4. **CI/CD Integration**: Seamless integration with development workflow
5. **Developer Tools**: Interactive dashboards and detailed reports

By following these guidelines and using the provided tools, teams can maintain high code quality and prevent coverage regressions.
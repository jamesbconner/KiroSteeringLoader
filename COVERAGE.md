# Coverage Quality Gates

![Coverage Badge](https://img.shields.io/badge/coverage-85%25-brightgreen)

This project implements comprehensive coverage quality gates to ensure high code quality and prevent regressions.

## Quick Start

```bash
# Run tests with coverage
npm run test:coverage

# Check quality gates
npm run coverage:check

# Generate reports and dashboard
npm run coverage:quality-gate

# Validate coverage setup
npm run coverage:validate
```

## Coverage Requirements

- **Minimum Threshold**: 85% for all metrics (lines, functions, branches, statements)
- **Quality Gate Enforcement**: Build fails if coverage drops below threshold
- **Trend Monitoring**: Historical tracking and regression detection

## Reports and Dashboard

### Interactive Dashboard
Open `coverage/coverage-dashboard.html` for:
- Real-time coverage metrics
- Historical trend charts
- Quality gate status
- Auto-refresh capability

### Generated Reports
- **HTML Report**: `coverage/index.html` - Detailed file-by-file coverage
- **JSON Report**: `coverage/coverage-final.json` - Machine-readable data
- **LCOV Report**: `coverage/lcov.info` - Standard format for external tools

## CI/CD Integration

The coverage system is fully integrated with GitHub Actions:

- ✅ **Quality Gate Enforcement**: Build fails if coverage < 85%
- 📊 **PR Comments**: Detailed coverage reports on pull requests
- 📈 **Trend Analysis**: Historical coverage tracking
- 🎯 **Coverage Dashboard**: Interactive visualization
- 📋 **Artifact Storage**: Reports stored for 30 days

## Configuration

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
};
```

## Documentation

- 📖 **[Complete Coverage Guide](tests/docs/coverage-quality-gates.md)** - Comprehensive documentation
- 🔧 **[Coverage System Details](tests/docs/coverage-system.md)** - Technical implementation details

## Troubleshooting

### Coverage Below Threshold
```bash
❌ Coverage quality gate failed
Lines coverage (82.5%) is below threshold (85%)
```

**Solution**: Add tests to cover missing lines. Use the HTML report to identify uncovered code.

### Validate Setup
```bash
npm run coverage:validate
```

This command checks that all coverage components are properly configured.

## Best Practices

1. **Write Tests First**: Use TDD approach for new features
2. **Focus on Quality**: Ensure tests are meaningful, not just coverage-driven
3. **Monitor Trends**: Review coverage trends regularly
4. **Address Regressions**: Fix coverage drops quickly
5. **Use Tools**: Leverage HTML reports and dashboard for analysis

## Integration

### Pre-commit Hooks
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
- **VS Code**: Coverage Gutters extension
- **WebStorm**: Built-in coverage support
- **Other IDEs**: Most support LCOV format

---

For detailed information, see the [complete coverage documentation](tests/docs/coverage-quality-gates.md).
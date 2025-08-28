# Performance Test Runner

This directory contains the performance test runner for the project, designed to measure execution time, memory usage, and system performance.

## Usage

### Via npm scripts (recommended)
```bash
# Run performance tests once
npm run test:performance

# Run performance tests in watch mode
npm run test:performance:watch

# Run performance tests with the custom runner (with GC exposed)
npm run test:performance:runner
```

### Direct execution
```bash
# Compile first
npm run compile

# Run with garbage collection exposed (recommended)
node --expose-gc out/tests/performance/runPerformanceTests.js

# Run in watch mode
node --expose-gc out/tests/performance/runPerformanceTests.js --watch

# Run without memory monitoring
node out/tests/performance/runPerformanceTests.js --no-memory

# Run without performance reports
node out/tests/performance/runPerformanceTests.js --no-reports

# Set custom timeout (10 minutes)
node out/tests/performance/runPerformanceTests.js --timeout 600000

# Show help
node out/tests/performance/runPerformanceTests.js --help
```

## Features

- **Memory Monitoring**: Detailed memory usage tracking with GC support
- **Performance Reports**: Automatic generation of JSON and Markdown reports
- **Sequential Execution**: Tests run one at a time for accurate measurements
- **Test Isolation**: Each test runs in isolation to prevent interference
- **Extended Timeouts**: 5-minute default timeout for long-running performance tests
- **System Information**: Logs Node.js version, platform, and architecture
- **Garbage Collection**: Supports `--expose-gc` for accurate memory measurements

## Configuration

The runner focuses exclusively on performance tests in the `tests/performance/` directory. Coverage is disabled since the focus is on performance metrics rather than code coverage.

## Environment Variables

- **NODE_ENV**: Set to "test"
- **PERFORMANCE_TEST**: Set to "true"
- **ENABLE_MEMORY_MONITORING**: Enabled by default
- **GENERATE_PERFORMANCE_REPORTS**: Enabled by default

## Performance Reports

Reports are generated in the `coverage/` directory:

- **performance-results.json**: Raw test results from Vitest
- **performance-report.json**: Processed performance metrics
- **performance-report.md**: Human-readable Markdown report

### Report Contents

- Test execution summary (passed/failed/total)
- Total execution duration
- System information (Node.js version, platform)
- Memory usage breakdown (RSS, heap, external memory)
- Individual test performance metrics

## Memory Monitoring

For accurate memory measurements, run with the `--expose-gc` flag:

```bash
node --expose-gc out/tests/performance/runPerformanceTests.js
```

This enables:
- Forced garbage collection before and after tests
- Accurate heap usage measurements
- Memory leak detection capabilities

## Best Practices

1. **Use `--expose-gc`**: Always run with garbage collection exposed for accurate memory measurements
2. **Sequential Execution**: Performance tests run sequentially to avoid interference
3. **Baseline Comparisons**: Compare results against previous runs to detect regressions
4. **System Consistency**: Run on consistent hardware/environment for reliable results
5. **Warm-up Period**: The runner includes a 1-second warm-up period before tests begin
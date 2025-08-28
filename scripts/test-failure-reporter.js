#!/usr/bin/env node

/**
 * Test Failure Reporter
 * 
 * This script analyzes test results and generates detailed failure reports
 * for CI/CD pipelines and development workflows.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

class TestFailureReporter {
  constructor() {
    this.coverageDir = 'coverage';
    this.testResults = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null,
      memory: null
    };
  }

  /**
   * Load test results from JSON files
   */
  loadTestResults() {
    const resultFiles = {
      unit: 'unit-test-results.json',
      integration: 'integration-test-results.json',
      e2e: 'e2e-results.json',
      performance: 'performance-results.json',
      memory: 'memory-usage-report.json'
    };

    for (const [testType, filename] of Object.entries(resultFiles)) {
      const filePath = path.join(this.coverageDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          this.testResults[testType] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.warn(`Warning: Could not parse ${filename}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Generate detailed failure report
   */
  generateFailureReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0
      },
      failures: [],
      coverage: null,
      performance: null
    };

    // Analyze each test suite
    for (const [testType, results] of Object.entries(this.testResults)) {
      if (!results) continue;

      const suiteReport = this.analyzeTestSuite(testType, results);
      report.summary.totalTests += suiteReport.total;
      report.summary.passedTests += suiteReport.passed;
      report.summary.failedTests += suiteReport.failed;
      report.summary.skippedTests += suiteReport.skipped;

      if (suiteReport.failures.length > 0) {
        report.failures.push({
          suite: testType,
          failures: suiteReport.failures
        });
      }
    }

    // Add coverage information
    report.coverage = this.getCoverageInfo();
    
    // Add performance information
    report.performance = this.getPerformanceInfo();

    return report;
  }

  /**
   * Analyze individual test suite results
   */
  analyzeTestSuite(testType, results) {
    const suiteReport = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };

    // Handle different result formats
    if (results.testResults) {
      // Vitest format
      for (const testFile of results.testResults) {
        suiteReport.total += testFile.assertionResults?.length || 0;
        
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            switch (assertion.status) {
              case 'passed':
                suiteReport.passed++;
                break;
              case 'failed':
                suiteReport.failed++;
                suiteReport.failures.push({
                  testName: assertion.title,
                  testFile: testFile.name,
                  error: assertion.failureMessages?.[0] || 'Unknown error',
                  duration: assertion.duration
                });
                break;
              case 'skipped':
                suiteReport.skipped++;
                break;
            }
          }
        }
      }
    } else if (results.tests) {
      // Alternative format
      suiteReport.total = results.tests.length;
      suiteReport.passed = results.tests.filter(t => t.status === 'passed').length;
      suiteReport.failed = results.tests.filter(t => t.status === 'failed').length;
      suiteReport.skipped = results.tests.filter(t => t.status === 'skipped').length;

      suiteReport.failures = results.tests
        .filter(t => t.status === 'failed')
        .map(t => ({
          testName: t.name,
          testFile: t.file,
          error: t.error || 'Unknown error',
          duration: t.duration
        }));
    }

    return suiteReport;
  }

  /**
   * Get coverage information
   */
  getCoverageInfo() {
    const coverageFile = path.join(this.coverageDir, 'coverage-final.json');
    if (!fs.existsSync(coverageFile)) {
      return null;
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      const totals = this.calculateCoverageTotals(coverage);
      
      return {
        lines: {
          total: totals.lines.total,
          covered: totals.lines.covered,
          percentage: ((totals.lines.covered / totals.lines.total) * 100).toFixed(2)
        },
        functions: {
          total: totals.functions.total,
          covered: totals.functions.covered,
          percentage: ((totals.functions.covered / totals.functions.total) * 100).toFixed(2)
        },
        branches: {
          total: totals.branches.total,
          covered: totals.branches.covered,
          percentage: ((totals.branches.covered / totals.branches.total) * 100).toFixed(2)
        },
        statements: {
          total: totals.statements.total,
          covered: totals.statements.covered,
          percentage: ((totals.statements.covered / totals.statements.total) * 100).toFixed(2)
        }
      };
    } catch (error) {
      console.warn(`Warning: Could not parse coverage data: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate coverage totals from coverage data
   */
  calculateCoverageTotals(coverage) {
    const totals = {
      lines: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 }
    };

    for (const file of Object.values(coverage)) {
      if (file.path && !file.path.includes('node_modules') && !file.path.includes('tests/')) {
        ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
          if (file[metric]) {
            totals[metric].total += file[metric].total || 0;
            totals[metric].covered += file[metric].covered || 0;
          }
        });
      }
    }

    return totals;
  }

  /**
   * Get performance information
   */
  getPerformanceInfo() {
    if (!this.testResults.performance) {
      return null;
    }

    return {
      activationTime: this.testResults.performance.activationTime,
      memoryUsage: this.testResults.performance.memoryUsage,
      largeDatasetPerformance: this.testResults.performance.largeDatasetPerformance
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    let markdown = `# Test Failure Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${report.summary.totalTests} |\n`;
    markdown += `| Passed | ${report.summary.passedTests} |\n`;
    markdown += `| Failed | ${report.summary.failedTests} |\n`;
    markdown += `| Skipped | ${report.summary.skippedTests} |\n\n`;

    // Test Results
    if (report.summary.failedTests > 0) {
      markdown += `## Failed Tests\n\n`;
      
      for (const suiteFailure of report.failures) {
        markdown += `### ${suiteFailure.suite.charAt(0).toUpperCase() + suiteFailure.suite.slice(1)} Tests\n\n`;
        
        for (const failure of suiteFailure.failures) {
          markdown += `#### ${failure.testName}\n\n`;
          markdown += `**File:** \`${failure.testFile}\`\n\n`;
          if (failure.duration) {
            markdown += `**Duration:** ${failure.duration}ms\n\n`;
          }
          markdown += `**Error:**\n\`\`\`\n${failure.error}\n\`\`\`\n\n`;
        }
      }
    }

    // Coverage
    if (report.coverage) {
      markdown += `## Coverage Report\n\n`;
      markdown += `| Metric | Covered | Total | Percentage |\n`;
      markdown += `|--------|---------|-------|------------|\n`;
      markdown += `| Lines | ${report.coverage.lines.covered} | ${report.coverage.lines.total} | ${report.coverage.lines.percentage}% |\n`;
      markdown += `| Functions | ${report.coverage.functions.covered} | ${report.coverage.functions.total} | ${report.coverage.functions.percentage}% |\n`;
      markdown += `| Branches | ${report.coverage.branches.covered} | ${report.coverage.branches.total} | ${report.coverage.branches.percentage}% |\n`;
      markdown += `| Statements | ${report.coverage.statements.covered} | ${report.coverage.statements.total} | ${report.coverage.statements.percentage}% |\n\n`;

      // Coverage warnings
      const coverageThreshold = 85;
      const lowCoverage = [];
      
      ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
        if (parseFloat(report.coverage[metric].percentage) < coverageThreshold) {
          lowCoverage.push(`${metric}: ${report.coverage[metric].percentage}%`);
        }
      });

      if (lowCoverage.length > 0) {
        markdown += `### ⚠️ Coverage Warnings\n\n`;
        markdown += `The following metrics are below the ${coverageThreshold}% threshold:\n\n`;
        lowCoverage.forEach(warning => {
          markdown += `- ${warning}\n`;
        });
        markdown += `\n`;
      }
    }

    // Performance
    if (report.performance) {
      markdown += `## Performance Report\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| Activation Time | ${report.performance.activationTime}ms |\n`;
      markdown += `| Memory Usage | ${report.performance.memoryUsage}MB |\n`;
      if (report.performance.largeDatasetPerformance) {
        markdown += `| Large Dataset Performance | ${report.performance.largeDatasetPerformance}ms |\n`;
      }
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Save report to file
   */
  saveReport(report, format = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'json') {
      const filename = `test-failure-report-${timestamp}.json`;
      const filepath = path.join(this.coverageDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`Test failure report saved to: ${filepath}`);
      return filepath;
    } else if (format === 'markdown') {
      const markdown = this.generateMarkdownReport(report);
      const filename = `test-failure-report-${timestamp}.md`;
      const filepath = path.join(this.coverageDir, filename);
      fs.writeFileSync(filepath, markdown);
      console.log(`Test failure report saved to: ${filepath}`);
      return filepath;
    }
  }

  /**
   * Run the reporter
   */
  run() {
    console.log('🔍 Analyzing test results...');
    
    // Ensure coverage directory exists
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }

    this.loadTestResults();
    const report = this.generateFailureReport();

    // Save reports
    this.saveReport(report, 'json');
    this.saveReport(report, 'markdown');

    // Print summary to console
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Skipped: ${report.summary.skippedTests}`);

    if (report.summary.failedTests > 0) {
      console.log('\n❌ Test failures detected. Check the generated report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
    }
  }
}

// Run the reporter if called directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const reporter = new TestFailureReporter();
  reporter.run();
}

export default TestFailureReporter;
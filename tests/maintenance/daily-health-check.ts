import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { TestPerformanceMonitor } from './performance-monitor';
import { FlakyTestDetector } from './flaky-test-detector';
import { extractJsonFromOutput } from './utils/json-extractor';

interface HealthCheckReport {
  date: string;
  testsPassed: boolean;
  coverageThresholdMet: boolean;
  performanceWithinLimits: boolean;
  flakyTestsDetected: string[];
  recommendations: string[];
  metrics: {
    totalTests: number;
    passRate: number;
    averageDuration: number;
    coveragePercentage: number;
  };
}

interface HealthTrend {
  date: string;
  score: number;
  issues: string[];
}

/**
 * Performs comprehensive health checks on the test suite
 */
export class DailyHealthCheck {
  private readonly reportsDir = 'tests/reports';
  private readonly trendsFile = `${this.reportsDir}/health-trends.json`;

  /**
   * Run a complete health check of the test suite
   */
  async runHealthCheck(): Promise<HealthCheckReport> {
    const report: HealthCheckReport = {
      date: new Date().toISOString(),
      testsPassed: false,
      coverageThresholdMet: false,
      performanceWithinLimits: false,
      flakyTestsDetected: [],
      recommendations: [],
      metrics: {
        totalTests: 0,
        passRate: 0,
        averageDuration: 0,
        coveragePercentage: 0,
      },
    };

    try {
      // 1. Run tests and check results
      console.log('🧪 Running test suite...');
      const testResults = await this.runTests();
      report.testsPassed = testResults.passed;
      report.metrics.totalTests = testResults.totalTests;
      report.metrics.passRate = testResults.passRate;

      // 2. Check coverage
      console.log('📊 Checking coverage...');
      const coverageResults = await this.checkCoverage();
      report.coverageThresholdMet = coverageResults.thresholdMet;
      report.metrics.coveragePercentage = coverageResults.percentage;

      // 3. Check performance
      console.log('⚡ Analyzing performance...');
      const performanceResults = await this.checkPerformance();
      report.performanceWithinLimits = performanceResults.withinLimits;
      report.metrics.averageDuration = performanceResults.averageDuration;

      // 4. Detect flaky tests
      console.log('🔍 Detecting flaky tests...');
      const flakyDetector = new FlakyTestDetector();
      const flakyTests = flakyDetector.detectFlakyTests();
      report.flakyTestsDetected = flakyTests.map(t => t.testName);

      // 5. Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      // 6. Save report
      const reportPath = `${this.reportsDir}/health-check-${new Date().toISOString().split('T')[0]}.json`;
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // 7. Update health trends
      this.updateHealthTrends(report);

      console.log('✅ Health check completed');
      return report;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      report.recommendations.push(`Health check failed: ${error}`);
      return report;
    }
  }

  /**
   * Get health score (0-100) based on current metrics
   */
  calculateHealthScore(report: HealthCheckReport): number {
    let score = 100;

    // Test pass rate (40% of score)
    score -= (1 - report.metrics.passRate) * 40;

    // Coverage (25% of score)
    const coverageTarget = 85;
    if (report.metrics.coveragePercentage < coverageTarget) {
      score -= ((coverageTarget - report.metrics.coveragePercentage) / coverageTarget) * 25;
    }

    // Performance (20% of score)
    if (!report.performanceWithinLimits) {
      score -= 20;
    }

    // Flaky tests (15% of score)
    const flakyPenalty = Math.min(report.flakyTestsDetected.length * 3, 15);
    score -= flakyPenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate a human-readable health report
   */
  generateHealthSummary(report: HealthCheckReport): string {
    const score = this.calculateHealthScore(report);
    const scoreEmoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
    
    const lines = [
      '# Test Suite Health Report',
      '',
      `${scoreEmoji} **Overall Health Score:** ${score.toFixed(1)}/100`,
      `📅 **Report Date:** ${new Date(report.date).toLocaleDateString()}`,
      '',
      '## Metrics',
      `- **Tests Passed:** ${report.testsPassed ? '✅' : '❌'}`,
      `- **Total Tests:** ${report.metrics.totalTests}`,
      `- **Pass Rate:** ${(report.metrics.passRate * 100).toFixed(1)}%`,
      `- **Coverage:** ${report.metrics.coveragePercentage.toFixed(1)}% ${report.coverageThresholdMet ? '✅' : '❌'}`,
      `- **Average Duration:** ${report.metrics.averageDuration.toFixed(2)}ms`,
      `- **Performance:** ${report.performanceWithinLimits ? '✅' : '❌'}`,
      '',
    ];

    if (report.flakyTestsDetected.length > 0) {
      lines.push('## Flaky Tests Detected');
      report.flakyTestsDetected.forEach(test => {
        lines.push(`- ${test}`);
      });
      lines.push('');
    }

    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      report.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    // Add trend information if available
    const trends = this.getHealthTrends();
    if (trends.length > 1) {
      const latest = trends[trends.length - 1];
      const previous = trends[trends.length - 2];
      const trendChange = latest.score - previous.score;
      
      lines.push('## Trend');
      if (trendChange > 0) {
        lines.push(`📈 Health improved by ${trendChange.toFixed(1)} points`);
      } else if (trendChange < 0) {
        lines.push(`📉 Health declined by ${Math.abs(trendChange).toFixed(1)} points`);
      } else {
        lines.push(`➡️ Health remained stable`);
      }
    }

    return lines.join('\n');
  }

  private async runTests(): Promise<{ passed: boolean; totalTests: number; passRate: number }> {
    try {
      // Use unit tests only for health check to avoid VS Code extension hanging issues
      const result = execSync('npx vitest run --config vitest.unit.config.ts', { 
        encoding: 'utf8',
        timeout: 120000, // 2 minutes should be enough for unit tests
        stdio: ['pipe', 'pipe', 'pipe'], // Capture both stdout and stderr
      });
      
      // Combine stdout and stderr for parsing
      const output = result;
      
      // Parse the output for test results (vitest provides summary at the end)
      const lines = output.split('\n');
      let testsPassed = false;
      let totalTests = 0;
      let passedTests = 0;
      
      // Look for vitest summary lines like "Tests  575 passed (575)"
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Strip ANSI escape codes for proper parsing
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        
        // Match the final summary line: "Tests  575 passed (575)"
        const summaryMatch = cleanLine.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
        // Match individual test file results: "✓ tests/unit/file.test.ts (42 tests)"
        const fileMatch = cleanLine.match(/✓.*\((\d+)\s+tests?\)/);
        // Match failure patterns: "✗ 2 failed, 573 passed"
        const failedMatch = cleanLine.match(/✗\s+(\d+)\s+failed,?\s*(\d+)?\s*passed?/);
        
        if (summaryMatch) {
          // This is the final summary line - most reliable
          passedTests = parseInt(summaryMatch[1], 10);
          totalTests = parseInt(summaryMatch[2], 10);
          testsPassed = true;
          break; // This is the definitive result, stop parsing
        } else if (failedMatch) {
          const failed = parseInt(failedMatch[1], 10);
          const passed = failedMatch[2] ? parseInt(failedMatch[2], 10) : 0;
          passedTests = passed;
          totalTests = failed + passed;
          testsPassed = false;
        } else if (fileMatch && totalTests === 0) {
          // Accumulate test counts from individual files as fallback
          const fileTests = parseInt(fileMatch[1], 10);
          totalTests += fileTests;
          passedTests += fileTests; // Assume passed if file shows ✓
        }
      }
      
      // If we couldn't parse the output, check if the command succeeded
      if (totalTests === 0) {
        // Command succeeded if no error was thrown, assume basic success
        testsPassed = true;
        totalTests = 1;
        passedTests = 1;
      }
      
      return {
        passed: testsPassed,
        totalTests,
        passRate: totalTests > 0 ? passedTests / totalTests : 0,
      };
    } catch (error) {
      console.warn('Test execution failed:', error);
      return {
        passed: false,
        totalTests: 0,
        passRate: 0,
      };
    }
  }

  private async checkCoverage(): Promise<{ thresholdMet: boolean; percentage: number }> {
    try {
      // First try to generate coverage with unit tests
      console.log('📊 Generating coverage report...');
      const coverageOutput = execSync('npx vitest run --config vitest.unit.config.ts --coverage --reporter=json', { 
        encoding: 'utf8',
        timeout: 180000, // 3 minutes for coverage generation
      });
      
      // Parse the coverage percentage from vitest output
      const lines = coverageOutput.split('\n');
      let coveragePercentage = 0;
      
      // Look for coverage summary in the output
      for (const line of lines) {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        
        // Match patterns like "All files | 36.03 |" (statement coverage)
        const coverageMatch = cleanLine.match(/All files\s*\|\s*(\d+\.?\d*)\s*\|/);
        if (coverageMatch) {
          coveragePercentage = parseFloat(coverageMatch[1]);
          console.log(`📊 Detected coverage: ${coveragePercentage}%`);
          break;
        }
      }
      
      // If we couldn't parse from output, try to read existing coverage files
      if (coveragePercentage === 0) {
        const coverageFile = 'coverage/coverage-summary.json';
        if (existsSync(coverageFile)) {
          const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
          const totalCoverage = coverage.total;
          coveragePercentage = totalCoverage.lines.pct;
        }
      }
      
      return {
        thresholdMet: coveragePercentage >= 85,
        percentage: coveragePercentage,
      };
    } catch (error) {
      console.warn('Coverage check failed:', error);
      
      // Fallback: try to read existing coverage data
      try {
        const coverageFile = 'coverage/coverage-summary.json';
        if (existsSync(coverageFile)) {
          const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
          const totalCoverage = coverage.total;
          const linesCoverage = totalCoverage.lines.pct;
          
          return {
            thresholdMet: linesCoverage >= 85,
            percentage: linesCoverage,
          };
        }
      } catch (fallbackError) {
        console.warn('Fallback coverage check also failed:', fallbackError);
      }
      
      return { thresholdMet: false, percentage: 0 };
    }
  }

  private async checkPerformance(): Promise<{ withinLimits: boolean; averageDuration: number }> {
    try {
      const performanceMonitor = new TestPerformanceMonitor();
      const report = performanceMonitor.generateReport();
      
      // Check if performance is within acceptable limits
      const withinLimits = report.performanceThresholdViolations.length === 0 && 
                          report.averageDuration < 1000; // 1 second average
      
      return {
        withinLimits,
        averageDuration: report.averageDuration,
      };
    } catch (error) {
      console.warn('Performance check failed:', error);
      return { withinLimits: false, averageDuration: 0 };
    }
  }

  private generateRecommendations(report: HealthCheckReport): string[] {
    const recommendations: string[] = [];

    if (!report.testsPassed) {
      recommendations.push('🚨 Fix failing tests immediately');
      recommendations.push('📋 Review test logs for failure patterns');
    }

    if (!report.coverageThresholdMet) {
      recommendations.push('📈 Add tests to improve coverage to 85%+');
      recommendations.push('🔍 Review uncovered code paths in coverage report');
    }

    if (!report.performanceWithinLimits) {
      recommendations.push('⚡ Optimize slow tests');
      recommendations.push('🔧 Review test setup and teardown efficiency');
      recommendations.push('📊 Consider parallel test execution');
    }

    if (report.flakyTestsDetected.length > 0) {
      recommendations.push(`🎯 Fix ${report.flakyTestsDetected.length} flaky tests`);
      recommendations.push('🧹 Review test isolation and cleanup');
      recommendations.push('⏱️ Check for timing-dependent test logic');
    }

    if (report.metrics.passRate < 0.95) {
      recommendations.push('🎯 Improve test reliability');
      recommendations.push('🔄 Consider adding test retries for external dependencies');
    }

    // Add proactive recommendations
    if (recommendations.length === 0) {
      recommendations.push('✨ Test suite is healthy! Consider:');
      recommendations.push('📚 Adding more edge case tests');
      recommendations.push('🚀 Exploring property-based testing');
      recommendations.push('📈 Monitoring performance trends');
    }

    return recommendations;
  }

  private updateHealthTrends(report: HealthCheckReport): void {
    const trends = this.getHealthTrends();
    const score = this.calculateHealthScore(report);
    
    const newTrend: HealthTrend = {
      date: report.date,
      score,
      issues: report.recommendations.filter(r => r.includes('🚨') || r.includes('❌')),
    };
    
    trends.push(newTrend);
    
    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const filteredTrends = trends.filter(trend => new Date(trend.date) > cutoffDate);
    
    writeFileSync(this.trendsFile, JSON.stringify(filteredTrends, null, 2));
  }

  private getHealthTrends(): HealthTrend[] {
    if (!existsSync(this.trendsFile)) {
      return [];
    }
    
    try {
      return JSON.parse(readFileSync(this.trendsFile, 'utf8'));
    } catch (error) {
      console.warn('Failed to load health trends:', error);
      return [];
    }
  }
}
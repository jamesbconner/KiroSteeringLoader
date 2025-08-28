import { readFileSync, writeFileSync, existsSync } from 'fs';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  timestamp: Date;
  error?: string;
}

interface FlakyTestReport {
  testName: string;
  totalRuns: number;
  passRate: number;
  averageDuration: number;
  durationVariance: number;
  lastFailure?: Date;
  failureReasons: string[];
}

/**
 * Detects flaky tests by analyzing test result patterns over time
 */
export class FlakyTestDetector {
  private results: TestResult[] = [];
  private readonly resultsFile = 'tests/reports/test-results-history.json';
  private readonly maxHistoryDays = 30;

  constructor() {
    this.loadHistoricalResults();
  }

  /**
   * Record a test result
   */
  recordResult(testName: string, passed: boolean, duration: number, error?: string): void {
    const result: TestResult = {
      testName,
      passed,
      duration,
      timestamp: new Date(),
      error,
    };

    this.results.push(result);
    this.saveResults();
  }

  /**
   * Detect flaky tests based on historical data
   */
  detectFlakyTests(minRuns: number = 5): FlakyTestReport[] {
    const testGroups = this.groupResultsByTest();
    const flakyTests: FlakyTestReport[] = [];

    for (const [testName, results] of testGroups) {
      if (results.length < minRuns) continue;

      const report = this.analyzeTestResults(testName, results);
      
      // Flag as flaky if:
      // 1. Pass rate is between 20% and 80% (intermittent failures)
      // 2. High duration variance (inconsistent performance)
      // 3. Recent failures with different error messages
      if (this.isFlakyTest(report)) {
        flakyTests.push(report);
      }
    }

    // Sort by severity (lower pass rate = more flaky)
    return flakyTests.sort((a, b) => a.passRate - b.passRate);
  }

  /**
   * Generate a flaky test report
   */
  generateFlakyTestReport(): string {
    const flakyTests = this.detectFlakyTests();
    
    if (flakyTests.length === 0) {
      return '✅ No flaky tests detected';
    }

    const lines = [
      '# Flaky Test Report',
      '',
      `Found ${flakyTests.length} potentially flaky tests:`,
      '',
    ];

    flakyTests.forEach((test, index) => {
      lines.push(`## ${index + 1}. ${test.testName}`);
      lines.push(`- **Pass Rate:** ${(test.passRate * 100).toFixed(1)}%`);
      lines.push(`- **Total Runs:** ${test.totalRuns}`);
      lines.push(`- **Average Duration:** ${test.averageDuration.toFixed(2)}ms`);
      lines.push(`- **Duration Variance:** ${test.durationVariance.toFixed(2)}ms²`);
      
      if (test.lastFailure) {
        lines.push(`- **Last Failure:** ${test.lastFailure.toISOString()}`);
      }
      
      if (test.failureReasons.length > 0) {
        lines.push('- **Common Failure Reasons:**');
        test.failureReasons.forEach(reason => {
          lines.push(`  - ${reason}`);
        });
      }
      
      lines.push('');
    });

    lines.push('## Recommendations');
    lines.push('');
    lines.push('For flaky tests, consider:');
    lines.push('- Adding proper test isolation and cleanup');
    lines.push('- Increasing timeouts for async operations');
    lines.push('- Using more reliable test data and mocks');
    lines.push('- Adding retry mechanisms for external dependencies');
    lines.push('- Reviewing test environment setup and teardown');

    return lines.join('\n');
  }

  /**
   * Get stability score for a specific test (0-100, higher is more stable)
   */
  getTestStabilityScore(testName: string): number {
    const results = this.results.filter(r => r.testName === testName);
    
    if (results.length === 0) return 100; // No data, assume stable
    if (results.length < 3) return 90; // Too few runs to determine
    
    const report = this.analyzeTestResults(testName, results);
    
    // Base score on pass rate
    let score = report.passRate * 100;
    
    // Penalize high variance
    const normalizedVariance = Math.min(report.durationVariance / 1000, 20); // Cap at 20 points
    score -= normalizedVariance;
    
    // Penalize recent failures
    const recentFailures = results
      .filter(r => !r.passed)
      .filter(r => {
        const daysSince = (Date.now() - r.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });
    
    score -= recentFailures.length * 5; // 5 points per recent failure
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Clear old results beyond the retention period
   */
  cleanupOldResults(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    
    this.results = this.results.filter(result => result.timestamp > cutoffDate);
    this.saveResults();
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(): {
    totalTests: number;
    totalRuns: number;
    overallPassRate: number;
    flakyTestCount: number;
  } {
    const flakyTests = this.detectFlakyTests();
    const totalRuns = this.results.length;
    const passedRuns = this.results.filter(r => r.passed).length;
    
    return {
      totalTests: new Set(this.results.map(r => r.testName)).size,
      totalRuns,
      overallPassRate: totalRuns > 0 ? passedRuns / totalRuns : 1,
      flakyTestCount: flakyTests.length,
    };
  }

  private analyzeTestResults(testName: string, results: TestResult[]): FlakyTestReport {
    const passedResults = results.filter(r => r.passed);
    const failedResults = results.filter(r => !r.passed);
    
    const durations = results.map(r => r.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const durationVariance = this.calculateVariance(durations);
    
    const failureReasons = failedResults
      .map(r => r.error || 'Unknown error')
      .filter((reason, index, arr) => arr.indexOf(reason) === index) // Unique reasons
      .slice(0, 5); // Limit to top 5

    return {
      testName,
      totalRuns: results.length,
      passRate: passedResults.length / results.length,
      averageDuration,
      durationVariance,
      lastFailure: failedResults.length > 0 
        ? new Date(Math.max(...failedResults.map(r => r.timestamp.getTime())))
        : undefined,
      failureReasons,
    };
  }

  private isFlakyTest(report: FlakyTestReport): boolean {
    // Flaky if pass rate is between 20% and 80%
    if (report.passRate > 0.2 && report.passRate < 0.8) {
      return true;
    }
    
    // Flaky if high duration variance (indicates timing issues)
    if (report.durationVariance > 10000) { // 10 seconds variance
      return true;
    }
    
    // Flaky if multiple different failure reasons
    if (report.failureReasons.length > 2) {
      return true;
    }
    
    return false;
  }

  private groupResultsByTest(): Map<string, TestResult[]> {
    const groups = new Map<string, TestResult[]>();
    
    for (const result of this.results) {
      if (!groups.has(result.testName)) {
        groups.set(result.testName, []);
      }
      groups.get(result.testName)!.push(result);
    }

    return groups;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private loadHistoricalResults(): void {
    if (!existsSync(this.resultsFile)) {
      return;
    }

    try {
      const data = readFileSync(this.resultsFile, 'utf8');
      const parsed = JSON.parse(data);
      
      this.results = parsed.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      
      // Clean up old results on load
      this.cleanupOldResults();
    } catch (error) {
      console.warn('Failed to load historical test results:', error);
      this.results = [];
    }
  }

  private saveResults(): void {
    try {
      writeFileSync(this.resultsFile, JSON.stringify(this.results, null, 2));
    } catch (error) {
      console.warn('Failed to save test results:', error);
    }
  }
}

/**
 * Global flaky test detector instance
 */
export const flakyTestDetector = new FlakyTestDetector();
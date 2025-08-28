import { performance } from 'perf_hooks';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface TestPerformanceMetrics {
  testName: string;
  duration: number;
  memoryUsage: number;
  timestamp: Date;
}

interface PerformanceReport {
  totalTests: number;
  averageDuration: number;
  slowestTests: TestPerformanceMetrics[];
  memoryIntensiveTests: TestPerformanceMetrics[];
  performanceThresholdViolations: TestPerformanceMetrics[];
  generatedAt: Date;
}

/**
 * Monitors test performance metrics and generates reports
 */
export class TestPerformanceMonitor {
  private metrics: TestPerformanceMetrics[] = [];
  private readonly reportsDir = 'tests/reports';

  constructor() {
    this.ensureReportsDirectory();
  }

  /**
   * Start monitoring a test and return a function to end monitoring
   */
  startTest(testName: string): () => void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      this.metrics.push({
        testName,
        duration: endTime - startTime,
        memoryUsage: Math.max(0, endMemory - startMemory), // Ensure non-negative
        timestamp: new Date(),
      });
    };
  }

  /**
   * Record a completed test's metrics
   */
  recordTest(testName: string, duration: number, memoryUsage: number = 0): void {
    this.metrics.push({
      testName,
      duration,
      memoryUsage,
      timestamp: new Date(),
    });
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        totalTests: 0,
        averageDuration: 0,
        slowestTests: [],
        memoryIntensiveTests: [],
        performanceThresholdViolations: [],
        generatedAt: new Date(),
      };
    }

    const report: PerformanceReport = {
      totalTests: this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      slowestTests: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      memoryIntensiveTests: this.metrics
        .sort((a, b) => b.memoryUsage - a.memoryUsage)
        .slice(0, 10),
      performanceThresholdViolations: this.metrics.filter(m => 
        m.duration > this.getThresholdForTest(m.testName)
      ),
      generatedAt: new Date(),
    };

    // Save report to file
    const reportPath = `${this.reportsDir}/performance-report.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Get performance threshold for a specific test type
   */
  private getThresholdForTest(testName: string): number {
    const testPath = testName.toLowerCase();
    
    if (testPath.includes('unit') || testPath.includes('/unit/')) return 100;
    if (testPath.includes('integration') || testPath.includes('/integration/')) return 500;
    if (testPath.includes('e2e') || testPath.includes('/e2e/')) return 5000;
    
    return 1000; // default threshold
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get current metrics
   */
  getMetrics(): TestPerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Generate a human-readable performance summary
   */
  generateSummary(): string {
    if (this.metrics.length === 0) {
      return 'No performance data available';
    }

    const report = this.generateReport();
    const lines = [
      '# Test Performance Summary',
      '',
      `**Total Tests:** ${report.totalTests}`,
      `**Average Duration:** ${report.averageDuration.toFixed(2)}ms`,
      `**Generated:** ${report.generatedAt.toISOString()}`,
      '',
    ];

    if (report.slowestTests.length > 0) {
      lines.push('## Slowest Tests');
      report.slowestTests.slice(0, 5).forEach((test, index) => {
        lines.push(`${index + 1}. ${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
      lines.push('');
    }

    if (report.performanceThresholdViolations.length > 0) {
      lines.push('## Performance Threshold Violations');
      report.performanceThresholdViolations.forEach(test => {
        const threshold = this.getThresholdForTest(test.testName);
        lines.push(`- ${test.testName}: ${test.duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      });
      lines.push('');
    }

    if (report.memoryIntensiveTests.length > 0 && report.memoryIntensiveTests[0].memoryUsage > 0) {
      lines.push('## Memory Intensive Tests');
      report.memoryIntensiveTests.slice(0, 5).forEach((test, index) => {
        const memoryMB = (test.memoryUsage / 1024 / 1024).toFixed(2);
        lines.push(`${index + 1}. ${test.testName}: ${memoryMB}MB`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Ensure the reports directory exists
   */
  private ensureReportsDirectory(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new TestPerformanceMonitor();

/**
 * Vitest plugin to automatically monitor test performance
 */
export function createPerformancePlugin() {
  return {
    name: 'performance-monitor',
    configResolved() {
      // Clear metrics at start of test run
      performanceMonitor.clearMetrics();
    },
    onTaskUpdate(packs: any[]) {
      // Record metrics for completed tests
      packs.forEach(pack => {
        pack.tasks?.forEach((task: any) => {
          if (task.result?.state === 'pass' || task.result?.state === 'fail') {
            const duration = task.result.duration || 0;
            performanceMonitor.recordTest(task.name, duration);
          }
        });
      });
    },
    onFinished() {
      // Generate report when tests complete
      const report = performanceMonitor.generateReport();
      console.log('\n' + performanceMonitor.generateSummary());
      
      // Log warnings for performance issues
      if (report.performanceThresholdViolations.length > 0) {
        console.warn(`\n⚠️  ${report.performanceThresholdViolations.length} tests exceeded performance thresholds`);
      }
    },
  };
}
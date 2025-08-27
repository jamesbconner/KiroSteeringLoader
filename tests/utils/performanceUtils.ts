/**
 * Performance Testing Utilities
 * Provides utilities for measuring and analyzing extension performance
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance measurement result interface
 */
export interface PerformanceMeasurement {
  name: string;
  duration: number;
  timestamp: number;
  memoryBefore?: NodeJS.MemoryUsage;
  memoryAfter?: NodeJS.MemoryUsage;
  metadata?: Record<string, any>;
}

/**
 * Performance benchmark interface
 */
export interface PerformanceBenchmark {
  name: string;
  measurements: PerformanceMeasurement[];
  statistics: {
    min: number;
    max: number;
    average: number;
    median: number;
    standardDeviation: number;
  };
  thresholds?: {
    maxDuration?: number;
    maxMemoryUsage?: number;
  };
}

/**
 * Performance measurement class
 */
export class PerformanceMeasurer {
  private measurements: PerformanceMeasurement[] = [];
  private currentMeasurement: Partial<PerformanceMeasurement> | null = null;

  /**
   * Start measuring performance
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (this.currentMeasurement) {
      throw new Error('Performance measurement already in progress. Call end() first.');
    }

    this.currentMeasurement = {
      name,
      timestamp: Date.now(),
      memoryBefore: process.memoryUsage(),
      metadata
    };
  }

  /**
   * End measuring performance
   */
  end(): PerformanceMeasurement {
    if (!this.currentMeasurement) {
      throw new Error('No performance measurement in progress. Call start() first.');
    }

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage();

    const measurement: PerformanceMeasurement = {
      name: this.currentMeasurement.name!,
      duration: endTime - this.currentMeasurement.timestamp!,
      timestamp: this.currentMeasurement.timestamp!,
      memoryBefore: this.currentMeasurement.memoryBefore,
      memoryAfter,
      metadata: this.currentMeasurement.metadata
    };

    this.measurements.push(measurement);
    this.currentMeasurement = null;

    return measurement;
  }

  /**
   * Measure a function execution
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    this.start(name, metadata);
    
    try {
      const result = await fn();
      const measurement = this.end();
      return { result, measurement };
    } catch (error) {
      // End measurement even if function throws
      if (this.currentMeasurement) {
        this.end();
      }
      throw error;
    }
  }

  /**
   * Get all measurements
   */
  getMeasurements(): PerformanceMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get measurements by name
   */
  getMeasurementsByName(name: string): PerformanceMeasurement[] {
    return this.measurements.filter(m => m.name === name);
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements = [];
    this.currentMeasurement = null;
  }

  /**
   * Create benchmark from measurements
   */
  createBenchmark(name: string, measurementName?: string): PerformanceBenchmark {
    const measurements = measurementName 
      ? this.getMeasurementsByName(measurementName)
      : this.measurements;

    if (measurements.length === 0) {
      throw new Error('No measurements available for benchmark');
    }

    const durations = measurements.map(m => m.duration);
    const statistics = this.calculateStatistics(durations);

    return {
      name,
      measurements,
      statistics
    };
  }

  /**
   * Calculate statistics for a set of durations
   */
  private calculateStatistics(durations: number[]): PerformanceBenchmark['statistics'] {
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const average = sum / durations.length;

    const variance = durations.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);

    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      average,
      median,
      standardDeviation
    };
  }
}

/**
 * Performance reporter class
 */
export class PerformanceReporter {
  /**
   * Generate performance report
   */
  static generateReport(benchmarks: PerformanceBenchmark[]): string {
    const report = [
      '# Performance Test Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `Total benchmarks: ${benchmarks.length}`,
      `Total measurements: ${benchmarks.reduce((sum, b) => sum + b.measurements.length, 0)}`,
      ''
    ];

    benchmarks.forEach(benchmark => {
      report.push(`## ${benchmark.name}`);
      report.push('');
      report.push('### Statistics');
      report.push(`- Measurements: ${benchmark.measurements.length}`);
      report.push(`- Average: ${benchmark.statistics.average.toFixed(2)}ms`);
      report.push(`- Median: ${benchmark.statistics.median.toFixed(2)}ms`);
      report.push(`- Min: ${benchmark.statistics.min}ms`);
      report.push(`- Max: ${benchmark.statistics.max}ms`);
      report.push(`- Standard Deviation: ${benchmark.statistics.standardDeviation.toFixed(2)}ms`);
      
      if (benchmark.thresholds) {
        report.push('');
        report.push('### Thresholds');
        if (benchmark.thresholds.maxDuration) {
          const passed = benchmark.statistics.max <= benchmark.thresholds.maxDuration;
          report.push(`- Max Duration: ${benchmark.thresholds.maxDuration}ms ${passed ? '✅' : '❌'}`);
        }
        if (benchmark.thresholds.maxMemoryUsage) {
          report.push(`- Max Memory Usage: ${benchmark.thresholds.maxMemoryUsage}MB`);
        }
      }

      if (benchmark.measurements.length > 0) {
        report.push('');
        report.push('### Measurements');
        report.push('| # | Duration (ms) | Memory Delta (MB) | Metadata |');
        report.push('|---|---------------|-------------------|----------|');
        
        benchmark.measurements.forEach((measurement, index) => {
          const memoryDelta = measurement.memoryAfter && measurement.memoryBefore
            ? ((measurement.memoryAfter.heapUsed - measurement.memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)
            : 'N/A';
          
          const metadata = measurement.metadata 
            ? Object.entries(measurement.metadata).map(([k, v]) => `${k}:${v}`).join(', ')
            : '';
          
          report.push(`| ${index + 1} | ${measurement.duration} | ${memoryDelta} | ${metadata} |`);
        });
      }

      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Save report to file
   */
  static saveReport(benchmarks: PerformanceBenchmark[], filePath: string): void {
    const report = this.generateReport(benchmarks);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, report);
  }

  /**
   * Save benchmark data as JSON
   */
  static saveBenchmarkData(benchmarks: PerformanceBenchmark[], filePath: string): void {
    const data = {
      timestamp: new Date().toISOString(),
      benchmarks,
      summary: {
        totalBenchmarks: benchmarks.length,
        totalMeasurements: benchmarks.reduce((sum, b) => sum + b.measurements.length, 0),
        averagePerformance: benchmarks.reduce((sum, b) => sum + b.statistics.average, 0) / benchmarks.length
      }
    };

    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

/**
 * Memory usage utilities
 */
export class MemoryProfiler {
  private snapshots: Array<{ name: string; usage: NodeJS.MemoryUsage; timestamp: number }> = [];

  /**
   * Take a memory snapshot
   */
  snapshot(name: string): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    this.snapshots.push({
      name,
      usage,
      timestamp: Date.now()
    });
    return usage;
  }

  /**
   * Get memory usage difference between two snapshots
   */
  getDifference(fromSnapshot: string, toSnapshot: string): NodeJS.MemoryUsage | null {
    const from = this.snapshots.find(s => s.name === fromSnapshot);
    const to = this.snapshots.find(s => s.name === toSnapshot);

    if (!from || !to) {
      return null;
    }

    return {
      rss: to.usage.rss - from.usage.rss,
      heapTotal: to.usage.heapTotal - from.usage.heapTotal,
      heapUsed: to.usage.heapUsed - from.usage.heapUsed,
      external: to.usage.external - from.usage.external,
      arrayBuffers: to.usage.arrayBuffers - from.usage.arrayBuffers
    };
  }

  /**
   * Format memory usage for display
   */
  static formatMemoryUsage(usage: NodeJS.MemoryUsage): Record<string, string> {
    return {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(usage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): Array<{ name: string; usage: NodeJS.MemoryUsage; timestamp: number }> {
    return [...this.snapshots];
  }
}

/**
 * Performance threshold checker
 */
export class PerformanceThresholdChecker {
  /**
   * Check if measurement passes thresholds
   */
  static checkMeasurement(
    measurement: PerformanceMeasurement,
    thresholds: { maxDuration?: number; maxMemoryUsage?: number }
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (thresholds.maxDuration && measurement.duration > thresholds.maxDuration) {
      violations.push(`Duration ${measurement.duration}ms exceeds threshold ${thresholds.maxDuration}ms`);
    }

    if (thresholds.maxMemoryUsage && measurement.memoryAfter && measurement.memoryBefore) {
      const memoryUsageMB = (measurement.memoryAfter.heapUsed - measurement.memoryBefore.heapUsed) / 1024 / 1024;
      if (memoryUsageMB > thresholds.maxMemoryUsage) {
        violations.push(`Memory usage ${memoryUsageMB.toFixed(2)}MB exceeds threshold ${thresholds.maxMemoryUsage}MB`);
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Check if benchmark passes thresholds
   */
  static checkBenchmark(
    benchmark: PerformanceBenchmark,
    thresholds: { maxDuration?: number; maxMemoryUsage?: number }
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (thresholds.maxDuration && benchmark.statistics.max > thresholds.maxDuration) {
      violations.push(`Max duration ${benchmark.statistics.max}ms exceeds threshold ${thresholds.maxDuration}ms`);
    }

    if (thresholds.maxDuration && benchmark.statistics.average > thresholds.maxDuration * 0.8) {
      violations.push(`Average duration ${benchmark.statistics.average.toFixed(2)}ms exceeds 80% of threshold ${thresholds.maxDuration}ms`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}

/**
 * Create a new performance measurer
 */
export function createPerformanceMeasurer(): PerformanceMeasurer {
  return new PerformanceMeasurer();
}

/**
 * Create a new memory profiler
 */
export function createMemoryProfiler(): MemoryProfiler {
  return new MemoryProfiler();
}
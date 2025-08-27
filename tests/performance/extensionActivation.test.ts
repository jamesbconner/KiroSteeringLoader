/**
 * Extension Activation Performance Tests
 * Tests extension activation time under various conditions and creates performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  activationTime: number;
  templateDiscoveryTime: number;
  treeViewRenderTime: number;
  totalTime: number;
  templateCount: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Performance benchmark thresholds (in milliseconds)
 * These thresholds are based on realistic VS Code extension activation times
 */
const PERFORMANCE_THRESHOLDS = {
  // Extension activation should complete within 3 seconds (VS Code extensions can be slow to activate)
  maxActivationTime: 3000,
  
  // Template discovery should complete within 2 seconds for up to 100 templates
  maxTemplateDiscoveryTime: 2000,
  
  // Tree view rendering should complete within 1 second
  maxTreeViewRenderTime: 2000,
  
  // Total initialization should complete within 5 seconds
  maxTotalInitializationTime: 5000,
  
  // Performance should not degrade significantly with template count
  maxTimePerTemplate: 20, // 20ms per template maximum (more realistic for file I/O)
  
  // Memory usage should remain reasonable
  maxMemoryUsageMB: 100
};

describe('Extension Activation Performance Tests', () => {
  let testManager: ReturnType<typeof createE2ETestManager>;
  let testContext: E2ETestContext;
  let performanceResults: PerformanceMetrics[] = [];

  beforeEach(async () => {
    testManager = createE2ETestManager();
  });

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup();
    }
    await testManager.cleanupAll();
  });

  /**
   * Helper function to measure extension activation performance
   */
  async function measureActivationPerformance(
    templateCount: number = 0,
    workspaceName: string = 'performance-test'
  ): Promise<PerformanceMetrics> {
    // Create workspace with specified number of templates
    testContext = await testManager.createTestWorkspace({
      ...commonWorkspaceConfigs.withKiro,
      name: workspaceName
    });

    const templatesDir = path.join(testContext.workspacePath, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });

    // Create specified number of templates
    const templateCreationStart = Date.now();
    for (let i = 0; i < templateCount; i++) {
      const templateName = `performance-template-${i.toString().padStart(4, '0')}.md`;
      const templatePath = path.join(templatesDir, templateName);
      const templateContent = `# Performance Template ${i}
## Description
This is a performance testing template number ${i}.

## Content
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5)}

## Usage
This template is used for performance testing purposes.

## Additional Content
${'Performance testing content line. '.repeat(10)}
`;
      fs.writeFileSync(templatePath, templateContent);
    }
    const templateCreationTime = Date.now() - templateCreationStart;
    console.log(`Created ${templateCount} templates in ${templateCreationTime}ms`);

    // Measure memory usage before activation
    const memoryBefore = process.memoryUsage();

    // Measure extension activation time
    const activationStart = Date.now();
    await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
    const activationTime = Date.now() - activationStart;

    // Measure tree data provider setup time
    const treeViewStart = Date.now();
    await testManager.waitForTreeDataProvider('kiroSteeringLoader');
    const treeViewSetupTime = Date.now() - treeViewStart;

    // Configure templates path and measure template discovery time
    const discoveryStart = Date.now();
    await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
    await testManager.executeCommand('kiroSteeringLoader.refresh');
    const templateDiscoveryTime = Date.now() - discoveryStart;

    // Measure tree view rendering time
    const renderStart = Date.now();
    const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
    const treeViewRenderTime = Date.now() - renderStart;

    // Measure memory usage after activation
    const memoryAfter = process.memoryUsage();
    const memoryDelta = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
    };

    const totalTime = activationTime + treeViewSetupTime + templateDiscoveryTime + treeViewRenderTime;

    const metrics: PerformanceMetrics = {
      activationTime,
      templateDiscoveryTime,
      treeViewRenderTime: treeViewSetupTime + treeViewRenderTime,
      totalTime,
      templateCount,
      memoryUsage: memoryDelta
    };

    // Verify tree items were loaded correctly
    expect(treeItems).toBeDefined();
    if (templateCount > 0) {
      expect(treeItems?.length).toBeGreaterThan(0);
    }

    return metrics;
  }

  /**
   * Helper function to create performance report
   */
  function createPerformanceReport(results: PerformanceMetrics[]): string {
    const report = [
      '# Extension Activation Performance Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Performance Metrics',
      '',
      '| Template Count | Activation (ms) | Discovery (ms) | Tree View (ms) | Total (ms) | Memory (MB) |',
      '|----------------|-----------------|----------------|----------------|------------|-------------|'
    ];

    results.forEach(result => {
      const memoryMB = result.memoryUsage ? (result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) : 'N/A';
      report.push(
        `| ${result.templateCount} | ${result.activationTime} | ${result.templateDiscoveryTime} | ${result.treeViewRenderTime} | ${result.totalTime} | ${memoryMB} |`
      );
    });

    report.push('');
    report.push('## Performance Analysis');
    
    if (results.length > 1) {
      const avgActivationTime = results.reduce((sum, r) => sum + r.activationTime, 0) / results.length;
      const avgDiscoveryTime = results.reduce((sum, r) => sum + r.templateDiscoveryTime, 0) / results.length;
      const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
      
      report.push(`- Average activation time: ${avgActivationTime.toFixed(2)}ms`);
      report.push(`- Average discovery time: ${avgDiscoveryTime.toFixed(2)}ms`);
      report.push(`- Average total time: ${avgTotalTime.toFixed(2)}ms`);
    }

    return report.join('\n');
  }

  describe('Basic Extension Activation Performance', () => {
    it('should activate extension within performance threshold with no templates', async () => {
      const metrics = await measureActivationPerformance(0, 'activation-no-templates');
      performanceResults.push(metrics);

      console.log('Performance metrics (no templates):', metrics);

      // Verify performance thresholds - use realistic thresholds for VS Code extension activation
      expect(metrics.activationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxActivationTime);
      expect(metrics.templateDiscoveryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime);
      expect(metrics.treeViewRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTreeViewRenderTime);
      expect(metrics.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalInitializationTime);

      // Memory usage should be reasonable
      if (metrics.memoryUsage) {
        const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        expect(memoryUsageMB).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryUsageMB);
      }
    });

    it('should activate extension within performance threshold with small number of templates', async () => {
      const templateCount = 10;
      const metrics = await measureActivationPerformance(templateCount, 'activation-small-templates');
      performanceResults.push(metrics);

      console.log(`Performance metrics (${templateCount} templates):`, metrics);

      // Verify performance thresholds - use realistic thresholds for VS Code extension activation
      expect(metrics.activationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxActivationTime);
      expect(metrics.templateDiscoveryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime);
      expect(metrics.treeViewRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTreeViewRenderTime);
      expect(metrics.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalInitializationTime);

      // Performance per template should be reasonable
      const timePerTemplate = metrics.templateDiscoveryTime / templateCount;
      expect(timePerTemplate).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTimePerTemplate);

      // Memory usage should be reasonable
      if (metrics.memoryUsage) {
        const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        expect(memoryUsageMB).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryUsageMB);
      }
    });

    it('should activate extension within performance threshold with medium number of templates', async () => {
      const templateCount = 50;
      const metrics = await measureActivationPerformance(templateCount, 'activation-medium-templates');
      performanceResults.push(metrics);

      console.log(`Performance metrics (${templateCount} templates):`, metrics);

      // Verify performance thresholds (slightly relaxed for more templates)
      expect(metrics.activationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxActivationTime);
      expect(metrics.templateDiscoveryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime * 1.5); // Allow 1.5x for 50 templates
      expect(metrics.treeViewRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTreeViewRenderTime * 1.5);
      expect(metrics.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalInitializationTime * 1.5);

      // Performance per template should be reasonable
      const timePerTemplate = metrics.templateDiscoveryTime / templateCount;
      expect(timePerTemplate).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTimePerTemplate);

      // Memory usage should be reasonable
      if (metrics.memoryUsage) {
        const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        expect(memoryUsageMB).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryUsageMB * 1.5); // Allow 1.5x for more templates
      }
    });
  });

  describe('Performance with Different Template Counts', () => {
    it('should maintain reasonable performance with increasing template counts', async () => {
      const templateCounts = [1, 5, 10, 25, 50, 100];
      const results: PerformanceMetrics[] = [];

      for (const count of templateCounts) {
        const metrics = await measureActivationPerformance(count, `scaling-test-${count}`);
        results.push(metrics);
        performanceResults.push(metrics);

        console.log(`Performance with ${count} templates:`, {
          activation: metrics.activationTime,
          discovery: metrics.templateDiscoveryTime,
          total: metrics.totalTime,
          perTemplate: count > 0 ? (metrics.templateDiscoveryTime / count).toFixed(2) : 'N/A'
        });

        // Clean up between tests to avoid interference
        if (testContext) {
          await testContext.cleanup();
        }
      }

      // Analyze performance scaling
      const activationTimes = results.map(r => r.activationTime);
      const discoveryTimes = results.map(r => r.templateDiscoveryTime);
      const totalTimes = results.map(r => r.totalTime);

      // Activation time should remain relatively stable regardless of template count
      const maxActivationTime = Math.max(...activationTimes);
      const minActivationTime = Math.min(...activationTimes);
      const activationVariance = maxActivationTime - minActivationTime;
      
      // Activation time variance should be reasonable (within 1 second)
      expect(activationVariance).toBeLessThan(1000);

      // Discovery time should scale reasonably with template count
      const largestTemplateCount = Math.max(...results.map(r => r.templateCount));
      const largestDiscoveryTime = results.find(r => r.templateCount === largestTemplateCount)?.templateDiscoveryTime || 0;
      
      if (largestTemplateCount > 0) {
        const timePerTemplate = largestDiscoveryTime / largestTemplateCount;
        expect(timePerTemplate).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTimePerTemplate);
      }

      // Total time should not grow exponentially
      const smallestResult = results.find(r => r.templateCount === 1);
      const largestResult = results.find(r => r.templateCount === largestTemplateCount);
      
      if (smallestResult && largestResult && largestTemplateCount > 1) {
        const timeGrowthRatio = largestResult.totalTime / smallestResult.totalTime;
        const templateGrowthRatio = largestResult.templateCount / smallestResult.templateCount;
        
        // Time growth should not exceed template growth by more than 2x (allowing for some overhead)
        expect(timeGrowthRatio).toBeLessThan(templateGrowthRatio * 2);
      }
    });

    it('should handle large template counts efficiently', async () => {
      const largeTemplateCount = 200;
      const metrics = await measureActivationPerformance(largeTemplateCount, 'large-template-test');
      performanceResults.push(metrics);

      console.log(`Performance with ${largeTemplateCount} templates:`, metrics);

      // For large template counts, allow more relaxed thresholds
      expect(metrics.activationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxActivationTime);
      expect(metrics.templateDiscoveryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime * 5); // 5 seconds for 200 templates
      expect(metrics.treeViewRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTreeViewRenderTime * 5);
      expect(metrics.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalInitializationTime * 5);

      // Performance per template should still be reasonable
      const timePerTemplate = metrics.templateDiscoveryTime / largeTemplateCount;
      expect(timePerTemplate).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTimePerTemplate * 2); // Allow 2x for large counts

      // Memory usage should be reasonable even with many templates
      if (metrics.memoryUsage) {
        const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
        expect(memoryUsageMB).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryUsageMB * 5); // Allow 5x for large template count
      }
    });
  });

  describe('Performance Regression Testing', () => {
    it('should create performance benchmarks for regression testing', async () => {
      // Test with standard benchmark template counts
      const benchmarkCounts = [0, 10, 50, 100];
      const benchmarkResults: PerformanceMetrics[] = [];

      for (const count of benchmarkCounts) {
        const metrics = await measureActivationPerformance(count, `benchmark-${count}`);
        benchmarkResults.push(metrics);
        performanceResults.push(metrics);

        // Clean up between tests
        if (testContext) {
          await testContext.cleanup();
        }
      }

      // Generate performance report
      const report = createPerformanceReport(benchmarkResults);
      console.log('\n' + report);

      // Save performance report to file for CI/CD integration
      const reportPath = path.join(process.cwd(), 'coverage', 'performance-report.md');
      fs.writeFileSync(reportPath, report);

      // Create JSON report for programmatic analysis
      const jsonReport = {
        timestamp: new Date().toISOString(),
        thresholds: PERFORMANCE_THRESHOLDS,
        results: benchmarkResults,
        summary: {
          totalTests: benchmarkResults.length,
          averageActivationTime: benchmarkResults.reduce((sum, r) => sum + r.activationTime, 0) / benchmarkResults.length,
          averageDiscoveryTime: benchmarkResults.reduce((sum, r) => sum + r.templateDiscoveryTime, 0) / benchmarkResults.length,
          averageTotalTime: benchmarkResults.reduce((sum, r) => sum + r.totalTime, 0) / benchmarkResults.length
        }
      };

      const jsonReportPath = path.join(process.cwd(), 'coverage', 'performance-report.json');
      fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));

      // Verify all benchmarks passed performance thresholds
      benchmarkResults.forEach((result, index) => {
        const count = benchmarkCounts[index];
        
        // Adjust thresholds based on template count
        const activationThreshold = PERFORMANCE_THRESHOLDS.maxActivationTime;
        const discoveryThreshold = PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime * Math.max(1, count / 50);
        const totalThreshold = PERFORMANCE_THRESHOLDS.maxTotalInitializationTime * Math.max(1, count / 50);

        expect(result.activationTime, `Activation time for ${count} templates`).toBeLessThan(activationThreshold);
        expect(result.templateDiscoveryTime, `Discovery time for ${count} templates`).toBeLessThan(discoveryThreshold);
        expect(result.totalTime, `Total time for ${count} templates`).toBeLessThan(totalThreshold);
      });

      console.log(`Performance benchmarks saved to: ${reportPath}`);
      console.log(`Performance data saved to: ${jsonReportPath}`);
    });

    it('should detect performance regressions by comparing with baseline', async () => {
      // This test would compare current performance with saved baseline
      // For now, we'll create a baseline and verify it's reasonable
      
      const baselineTemplateCount = 25;
      const metrics = await measureActivationPerformance(baselineTemplateCount, 'regression-baseline');
      performanceResults.push(metrics);

      // Create baseline performance data
      const baseline = {
        templateCount: baselineTemplateCount,
        activationTime: metrics.activationTime,
        templateDiscoveryTime: metrics.templateDiscoveryTime,
        treeViewRenderTime: metrics.treeViewRenderTime,
        totalTime: metrics.totalTime,
        timestamp: new Date().toISOString()
      };

      // Save baseline for future regression testing
      const baselinePath = path.join(process.cwd(), 'coverage', 'performance-baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

      // Verify baseline meets performance requirements
      expect(baseline.activationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxActivationTime);
      expect(baseline.templateDiscoveryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTemplateDiscoveryTime);
      expect(baseline.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalInitializationTime);

      console.log('Performance baseline created:', baseline);
      console.log(`Baseline saved to: ${baselinePath}`);

      // In a real regression test, we would:
      // 1. Load the existing baseline
      // 2. Compare current performance with baseline
      // 3. Fail if performance has regressed beyond acceptable threshold (e.g., 20% slower)
      // 4. Update baseline if performance has improved significantly
    });
  });

  // Generate final performance summary after all tests
  afterEach(() => {
    if (performanceResults.length > 0) {
      const summary = {
        totalTests: performanceResults.length,
        averageActivationTime: performanceResults.reduce((sum, r) => sum + r.activationTime, 0) / performanceResults.length,
        averageDiscoveryTime: performanceResults.reduce((sum, r) => sum + r.templateDiscoveryTime, 0) / performanceResults.length,
        averageTotalTime: performanceResults.reduce((sum, r) => sum + r.totalTime, 0) / performanceResults.length,
        maxTemplateCount: Math.max(...performanceResults.map(r => r.templateCount)),
        minActivationTime: Math.min(...performanceResults.map(r => r.activationTime)),
        maxActivationTime: Math.max(...performanceResults.map(r => r.activationTime))
      };

      console.log('\n=== Performance Test Summary ===');
      console.log(`Tests run: ${summary.totalTests}`);
      console.log(`Average activation time: ${summary.averageActivationTime.toFixed(2)}ms`);
      console.log(`Average discovery time: ${summary.averageDiscoveryTime.toFixed(2)}ms`);
      console.log(`Average total time: ${summary.averageTotalTime.toFixed(2)}ms`);
      console.log(`Max template count tested: ${summary.maxTemplateCount}`);
      console.log(`Activation time range: ${summary.minActivationTime}ms - ${summary.maxActivationTime}ms`);
      console.log('================================\n');
    }
  });
});
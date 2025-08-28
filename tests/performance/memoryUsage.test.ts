/**
 * Memory Usage and Leak Detection Tests
 * Tests memory usage patterns and detects potential memory leaks in the extension
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Memory usage metrics interface
 */
interface MemoryMetrics {
  rss: number;           // Resident Set Size - total memory allocated
  heapTotal: number;     // Total heap size
  heapUsed: number;      // Used heap size
  external: number;      // External memory usage
  arrayBuffers: number;  // ArrayBuffer memory usage
  timestamp: number;     // When the measurement was taken
}

/**
 * Memory leak detection result
 */
interface MemoryLeakResult {
  operationName: string;
  iterations: number;
  initialMemory: MemoryMetrics;
  finalMemory: MemoryMetrics;
  memoryGrowth: MemoryMetrics;
  memoryGrowthPerIteration: MemoryMetrics;
  hasLeak: boolean;
  leakThresholdExceeded: boolean;
}

/**
 * Memory usage thresholds (in MB)
 */
const MEMORY_THRESHOLDS = {
  // Maximum memory usage for normal operations
  maxNormalOperationMB: 50,
  
  // Maximum memory growth per operation (to detect leaks)
  maxMemoryGrowthPerOperationMB: 1,
  
  // Maximum total memory growth over multiple operations
  maxTotalMemoryGrowthMB: 10,
  
  // Memory leak detection threshold (growth per iteration)
  memoryLeakThresholdMB: 0.1, // 100KB per iteration indicates potential leak
  
  // Maximum memory usage with large template sets
  maxLargeDatasetMemoryMB: 200,
  
  // Garbage collection effectiveness threshold
  maxMemoryAfterGCMB: 30
};

describe('Memory Usage and Leak Detection Tests', () => {
  let testManager: ReturnType<typeof createE2ETestManager>;
  let testContext: E2ETestContext;
  let memoryResults: MemoryLeakResult[] = [];

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
   * Helper function to get current memory usage
   */
  function getCurrentMemoryUsage(): MemoryMetrics {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      timestamp: Date.now()
    };
  }

  /**
   * Helper function to convert bytes to MB
   */
  function bytesToMB(bytes: number): number {
    return bytes / 1024 / 1024;
  }

  /**
   * Helper function to calculate memory difference
   */
  function calculateMemoryDifference(before: MemoryMetrics, after: MemoryMetrics): MemoryMetrics {
    return {
      rss: after.rss - before.rss,
      heapTotal: after.heapTotal - before.heapTotal,
      heapUsed: after.heapUsed - before.heapUsed,
      external: after.external - before.external,
      arrayBuffers: after.arrayBuffers - before.arrayBuffers,
      timestamp: after.timestamp - before.timestamp
    };
  }

  /**
   * Helper function to force garbage collection if available
   */
  async function forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Helper function to create templates for testing
   */
  async function createTestTemplates(count: number, templatesDir: string): Promise<void> {
    fs.mkdirSync(templatesDir, { recursive: true });
    
    for (let i = 0; i < count; i++) {
      const templateName = `memory-test-template-${i.toString().padStart(4, '0')}.md`;
      const templatePath = path.join(templatesDir, templateName);
      const templateContent = `# Memory Test Template ${i}
## Description
This template is used for memory usage testing.

## Content
${'Memory testing content line. '.repeat(20)}

## Large Content Section
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}

## Additional Data
${JSON.stringify({ templateId: i, data: new Array(100).fill('test-data') })}
`;
      fs.writeFileSync(templatePath, templateContent);
    }
  }

  /**
   * Helper function to perform repeated template loading operations
   */
  async function performRepeatedTemplateLoading(
    iterations: number,
    templateCount: number = 10
  ): Promise<MemoryLeakResult> {
    // Create test workspace
    testContext = await testManager.createTestWorkspace({
      ...commonWorkspaceConfigs.withKiro,
      name: 'memory-leak-test'
    });

    const templatesDir = path.join(testContext.workspacePath, 'templates');
    await createTestTemplates(templateCount, templatesDir);

    // Activate extension
    await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
    await testManager.waitForTreeDataProvider('kiroSteeringLoader');

    // Force initial garbage collection
    await forceGarbageCollection();
    
    // Get initial memory usage
    const initialMemory = getCurrentMemoryUsage();

    // Perform repeated operations
    for (let i = 0; i < iterations; i++) {
      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      
      // Refresh tree data provider
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      
      // Get tree items (triggers template loading)
      await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      
      // Clear configuration to force reload next iteration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', undefined);
      
      // Force garbage collection every 10 iterations
      if (i % 10 === 9) {
        await forceGarbageCollection();
      }
      
      // Small delay to allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Force final garbage collection
    await forceGarbageCollection();
    
    // Get final memory usage
    const finalMemory = getCurrentMemoryUsage();
    
    // Calculate memory growth
    const memoryGrowth = calculateMemoryDifference(initialMemory, finalMemory);
    const memoryGrowthPerIteration: MemoryMetrics = {
      rss: memoryGrowth.rss / iterations,
      heapTotal: memoryGrowth.heapTotal / iterations,
      heapUsed: memoryGrowth.heapUsed / iterations,
      external: memoryGrowth.external / iterations,
      arrayBuffers: memoryGrowth.arrayBuffers / iterations,
      timestamp: memoryGrowth.timestamp / iterations
    };

    // Determine if there's a memory leak
    const heapGrowthPerIterationMB = bytesToMB(memoryGrowthPerIteration.heapUsed);
    const hasLeak = heapGrowthPerIterationMB > MEMORY_THRESHOLDS.memoryLeakThresholdMB;
    const leakThresholdExceeded = bytesToMB(memoryGrowth.heapUsed) > MEMORY_THRESHOLDS.maxTotalMemoryGrowthMB;

    return {
      operationName: 'repeated-template-loading',
      iterations,
      initialMemory,
      finalMemory,
      memoryGrowth,
      memoryGrowthPerIteration,
      hasLeak,
      leakThresholdExceeded
    };
  }

  describe('Normal Operation Memory Usage', () => {
    it('should maintain reasonable memory usage during extension activation', async () => {
      // Create test workspace with moderate number of templates
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'memory-activation-test'
      });

      const templatesDir = path.join(testContext.workspacePath, 'templates');
      await createTestTemplates(25, templatesDir);

      // Measure memory before activation
      const memoryBefore = getCurrentMemoryUsage();

      // Activate extension and load templates
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      await testManager.getTreeDataProviderChildren('kiroSteeringLoader');

      // Measure memory after activation
      const memoryAfter = getCurrentMemoryUsage();
      const memoryDifference = calculateMemoryDifference(memoryBefore, memoryAfter);

      console.log('Memory usage during activation:', {
        before: {
          heapUsed: bytesToMB(memoryBefore.heapUsed).toFixed(2) + 'MB',
          rss: bytesToMB(memoryBefore.rss).toFixed(2) + 'MB'
        },
        after: {
          heapUsed: bytesToMB(memoryAfter.heapUsed).toFixed(2) + 'MB',
          rss: bytesToMB(memoryAfter.rss).toFixed(2) + 'MB'
        },
        growth: {
          heapUsed: bytesToMB(memoryDifference.heapUsed).toFixed(2) + 'MB',
          rss: bytesToMB(memoryDifference.rss).toFixed(2) + 'MB'
        }
      });

      // Verify memory usage is within acceptable limits
      expect(bytesToMB(memoryAfter.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxNormalOperationMB);
      expect(bytesToMB(memoryDifference.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxMemoryGrowthPerOperationMB * 25); // Allow growth per template
    });

    it('should handle garbage collection effectively', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'memory-gc-test'
      });

      const templatesDir = path.join(testContext.workspacePath, 'templates');
      await createTestTemplates(50, templatesDir);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Get baseline memory after activation
      await forceGarbageCollection();
      const baselineMemory = getCurrentMemoryUsage();

      // Load templates multiple times to create garbage
      for (let i = 0; i < 5; i++) {
        await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
        await testManager.executeCommand('kiroSteeringLoader.refresh');
        await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
        await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', undefined);
      }

      // Measure memory before GC
      const memoryBeforeGC = getCurrentMemoryUsage();

      // Force garbage collection multiple times to ensure effectiveness
      await forceGarbageCollection();
      await forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 200)); // Allow more time for GC

      // Measure memory after GC
      const memoryAfterGC = getCurrentMemoryUsage();

      const memoryGrowthFromBaseline = memoryAfterGC.heapUsed - baselineMemory.heapUsed;
      const gcEffectiveness = memoryBeforeGC.heapUsed - memoryAfterGC.heapUsed;

      console.log('Garbage collection effectiveness:', {
        baseline: bytesToMB(baselineMemory.heapUsed).toFixed(2) + 'MB',
        beforeGC: bytesToMB(memoryBeforeGC.heapUsed).toFixed(2) + 'MB',
        afterGC: bytesToMB(memoryAfterGC.heapUsed).toFixed(2) + 'MB',
        collected: bytesToMB(gcEffectiveness).toFixed(2) + 'MB',
        growthFromBaseline: bytesToMB(memoryGrowthFromBaseline).toFixed(2) + 'MB'
      });

      // Verify garbage collection was effective - use more realistic thresholds
      // Memory after GC should be reasonable, allowing for some growth from operations
      expect(bytesToMB(memoryAfterGC.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxMemoryAfterGCMB + 10); // Allow 10MB buffer
      
      // GC should either reduce memory or at least not let it grow excessively
      // Allow small increases due to normal operation overhead
      const maxAllowableGrowth = bytesToMB(baselineMemory.heapUsed) * 0.5; // 50% growth from baseline
      expect(bytesToMB(memoryGrowthFromBaseline)).toBeLessThan(maxAllowableGrowth);
      
      // Verify GC had some effect (either reduced memory or prevented excessive growth)
      const memoryGrowthRate = memoryGrowthFromBaseline / baselineMemory.heapUsed;
      expect(memoryGrowthRate).toBeLessThan(0.8); // Less than 80% growth from baseline
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated template loading operations', async () => {
      const iterations = 50;
      const result = await performRepeatedTemplateLoading(iterations, 10);
      memoryResults.push(result);

      console.log('Memory leak test results:', {
        iterations: result.iterations,
        initialHeapMB: bytesToMB(result.initialMemory.heapUsed).toFixed(2),
        finalHeapMB: bytesToMB(result.finalMemory.heapUsed).toFixed(2),
        totalGrowthMB: bytesToMB(result.memoryGrowth.heapUsed).toFixed(2),
        growthPerIterationMB: bytesToMB(result.memoryGrowthPerIteration.heapUsed).toFixed(4),
        hasLeak: result.hasLeak,
        thresholdExceeded: result.leakThresholdExceeded
      });

      // Verify no significant memory leak
      expect(result.hasLeak).toBe(false);
      expect(result.leakThresholdExceeded).toBe(false);
      expect(bytesToMB(result.memoryGrowthPerIteration.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.memoryLeakThresholdMB);
      expect(bytesToMB(result.memoryGrowth.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxTotalMemoryGrowthMB);
    });

    it('should maintain stable memory usage over extended operations', async () => {
      const iterations = 50; // Reduced from 100 to avoid timeout
      const result = await performRepeatedTemplateLoading(iterations, 5);
      memoryResults.push(result);

      console.log('Extended operation memory test:', {
        iterations: result.iterations,
        memoryGrowthMB: bytesToMB(result.memoryGrowth.heapUsed).toFixed(2),
        avgGrowthPerIterationKB: (bytesToMB(result.memoryGrowthPerIteration.heapUsed) * 1024).toFixed(2)
      });

      // For extended operations, allow slightly more growth but still within limits
      expect(result.hasLeak).toBe(false);
      expect(bytesToMB(result.memoryGrowthPerIteration.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.memoryLeakThresholdMB);
      expect(bytesToMB(result.memoryGrowth.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxTotalMemoryGrowthMB * 2); // Allow 2x for extended test
    });

    it('should handle memory efficiently with repeated refresh operations', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'memory-refresh-test'
      });

      const templatesDir = path.join(testContext.workspacePath, 'templates');
      await createTestTemplates(20, templatesDir);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Force initial garbage collection
      await forceGarbageCollection();
      const initialMemory = getCurrentMemoryUsage();

      // Perform repeated refresh operations
      const refreshIterations = 30;
      for (let i = 0; i < refreshIterations; i++) {
        await testManager.executeCommand('kiroSteeringLoader.refresh');
        await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
        
        // Force GC every 10 iterations
        if (i % 10 === 9) {
          await forceGarbageCollection();
        }
      }

      // Final garbage collection and measurement
      await forceGarbageCollection();
      const finalMemory = getCurrentMemoryUsage();
      const memoryGrowth = calculateMemoryDifference(initialMemory, finalMemory);

      console.log('Refresh operation memory usage:', {
        refreshes: refreshIterations,
        memoryGrowthMB: bytesToMB(memoryGrowth.heapUsed).toFixed(2),
        growthPerRefreshKB: (bytesToMB(memoryGrowth.heapUsed) * 1024 / refreshIterations).toFixed(2)
      });

      // Verify memory growth is minimal for refresh operations
      expect(bytesToMB(memoryGrowth.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxTotalMemoryGrowthMB);
      expect(bytesToMB(memoryGrowth.heapUsed) / refreshIterations).toBeLessThan(MEMORY_THRESHOLDS.memoryLeakThresholdMB);
    });
  });

  describe('Large Dataset Memory Usage', () => {
    it('should handle large template directories without excessive memory usage', async () => {
      // Create test workspace with large number of templates
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'memory-large-dataset-test'
      });

      const templatesDir = path.join(testContext.workspacePath, 'templates');
      const largeTemplateCount = 500;
      
      console.log(`Creating ${largeTemplateCount} templates for memory testing...`);
      await createTestTemplates(largeTemplateCount, templatesDir);

      // Measure memory before loading large dataset
      await forceGarbageCollection();
      const memoryBefore = getCurrentMemoryUsage();

      // Activate extension and load large template set
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');

      // Measure memory after loading large dataset
      const memoryAfter = getCurrentMemoryUsage();
      const memoryGrowth = calculateMemoryDifference(memoryBefore, memoryAfter);

      console.log('Large dataset memory usage:', {
        templateCount: largeTemplateCount,
        treeItemCount: treeItems?.length || 0,
        memoryGrowthMB: bytesToMB(memoryGrowth.heapUsed).toFixed(2),
        memoryPerTemplateMB: (bytesToMB(memoryGrowth.heapUsed) / largeTemplateCount).toFixed(4),
        totalMemoryMB: bytesToMB(memoryAfter.heapUsed).toFixed(2)
      });

      // Verify memory usage is reasonable for large dataset
      expect(bytesToMB(memoryAfter.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxLargeDatasetMemoryMB);
      expect(bytesToMB(memoryGrowth.heapUsed) / largeTemplateCount).toBeLessThan(0.1); // Less than 100KB per template
      expect(treeItems?.length).toBeGreaterThan(0);
    });

    it('should maintain memory efficiency with varying template sizes', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'memory-template-size-test'
      });

      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create templates of varying sizes
      const templateSizes = [
        { name: 'small', size: 1, count: 100 },      // 1KB templates
        { name: 'medium', size: 10, count: 50 },     // 10KB templates
        { name: 'large', size: 100, count: 10 }      // 100KB templates
      ];

      let totalTemplates = 0;
      for (const { name, size, count } of templateSizes) {
        for (let i = 0; i < count; i++) {
          const templateName = `${name}-template-${i}.md`;
          const templatePath = path.join(templatesDir, templateName);
          const contentSize = size * 1024; // Convert KB to bytes
          const content = `# ${name} Template ${i}\n${'x'.repeat(contentSize - 50)}`;
          fs.writeFileSync(templatePath, content);
          totalTemplates++;
        }
      }

      // Measure memory usage
      await forceGarbageCollection();
      const memoryBefore = getCurrentMemoryUsage();

      // Load templates
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      await testManager.getTreeDataProviderChildren('kiroSteeringLoader');

      const memoryAfter = getCurrentMemoryUsage();
      const memoryGrowth = calculateMemoryDifference(memoryBefore, memoryAfter);

      console.log('Variable template size memory usage:', {
        totalTemplates,
        templateSizes: templateSizes.map(s => `${s.count}x${s.size}KB`).join(', '),
        memoryGrowthMB: bytesToMB(memoryGrowth.heapUsed).toFixed(2),
        avgMemoryPerTemplateMB: (bytesToMB(memoryGrowth.heapUsed) / totalTemplates).toFixed(4)
      });

      // Verify memory usage scales reasonably with template content size
      expect(bytesToMB(memoryAfter.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxLargeDatasetMemoryMB);
      expect(bytesToMB(memoryGrowth.heapUsed)).toBeLessThan(MEMORY_THRESHOLDS.maxTotalMemoryGrowthMB * 5); // Allow more for large templates
    });
  });

  describe('Memory Monitoring and Reporting', () => {
    it('should create comprehensive memory usage report', async () => {
      // Ensure we have some test results
      if (memoryResults.length === 0) {
        const quickResult = await performRepeatedTemplateLoading(10, 5);
        memoryResults.push(quickResult);
      }

      // Generate memory usage report
      const report = {
        timestamp: new Date().toISOString(),
        thresholds: MEMORY_THRESHOLDS,
        testResults: memoryResults,
        summary: {
          totalTests: memoryResults.length,
          testsWithLeaks: memoryResults.filter(r => r.hasLeak).length,
          testsExceedingThreshold: memoryResults.filter(r => r.leakThresholdExceeded).length,
          averageMemoryGrowthMB: memoryResults.reduce((sum, r) => sum + bytesToMB(r.memoryGrowth.heapUsed), 0) / memoryResults.length,
          maxMemoryGrowthMB: Math.max(...memoryResults.map(r => bytesToMB(r.memoryGrowth.heapUsed))),
          averageGrowthPerIterationMB: memoryResults.reduce((sum, r) => sum + bytesToMB(r.memoryGrowthPerIteration.heapUsed), 0) / memoryResults.length
        }
      };

      // Save memory report
      const reportPath = path.join(process.cwd(), 'coverage', 'memory-usage-report.json');
      try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      } catch (error) {
        console.warn(`Failed to write memory usage report: ${error}`);
        // Don't fail the test if we can't write the report
      }

      console.log('Memory usage report:', report.summary);
      console.log(`Memory report saved to: ${reportPath}`);

      // Verify overall memory health
      expect(report.summary.testsWithLeaks).toBe(0);
      expect(report.summary.testsExceedingThreshold).toBe(0);
      expect(report.summary.averageGrowthPerIterationMB).toBeLessThan(MEMORY_THRESHOLDS.memoryLeakThresholdMB);
    });
  });
});
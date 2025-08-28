#!/usr/bin/env node

/**
 * CLI runners for individual maintenance tools
 * These can be run independently for specific maintenance tasks
 */

import { TestCleanup } from './test-cleanup';
import { DependencyMonitor } from './dependency-monitor';
import { performanceMonitor } from './performance-monitor';
import { flakyTestDetector } from './flaky-test-detector';

// Cleanup CLI
export async function runCleanupCLI(): Promise<void> {
  console.log('🧹 Running test cleanup...\n');
  
  const cleanup = new TestCleanup();
  const report = cleanup.performFullCleanup();
  const summary = cleanup.generateCleanupReport();
  
  console.log(summary);
  console.log(`\n✅ Cleanup completed: ${report.filesRemoved} files removed`);
}

// Dependency check CLI
export async function runDependencyCheckCLI(): Promise<void> {
  console.log('📦 Checking dependencies...\n');
  
  const monitor = new DependencyMonitor();
  const report = await monitor.generateDependencyReport();
  const summary = monitor.generateDependencySummary(report);
  const updatePlan = monitor.generateUpdatePlan(report.updates);
  
  console.log(summary);
  console.log('\n' + updatePlan);
}

// Performance report CLI
export async function runPerformanceReportCLI(): Promise<void> {
  console.log('📊 Generating performance report...\n');
  
  const summary = performanceMonitor.generateSummary();
  console.log(summary);
}

// Flaky test check CLI
export async function runFlakyTestCheckCLI(): Promise<void> {
  console.log('🎯 Checking for flaky tests...\n');
  
  const report = flakyTestDetector.generateFlakyTestReport();
  const stats = flakyTestDetector.getSummaryStats();
  
  console.log(`📊 Test Statistics:`);
  console.log(`- Total Tests: ${stats.totalTests}`);
  console.log(`- Total Runs: ${stats.totalRuns}`);
  console.log(`- Overall Pass Rate: ${(stats.overallPassRate * 100).toFixed(1)}%`);
  console.log(`- Flaky Tests: ${stats.flakyTestCount}\n`);
  
  console.log(report);
}

// Main CLI handler
async function main(): Promise<void> {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'cleanup':
        await runCleanupCLI();
        break;
      case 'dependencies':
        await runDependencyCheckCLI();
        break;
      case 'performance':
        await runPerformanceReportCLI();
        break;
      case 'flaky':
        await runFlakyTestCheckCLI();
        break;
      default:
        console.log('Usage: npx tsx tests/maintenance/cli-runners.ts <command>');
        console.log('');
        console.log('Commands:');
        console.log('  cleanup      - Clean up old files and validate structure');
        console.log('  dependencies - Check for dependency updates and security issues');
        console.log('  performance  - Generate performance report');
        console.log('  flaky        - Check for flaky tests');
        console.log('');
        console.log('Or use the npm scripts:');
        console.log('  npm run test:cleanup');
        console.log('  npm run test:dependency-check');
        console.log('  npm run test:performance-report');
        console.log('  npm run test:flaky-check');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Command failed:`, error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}
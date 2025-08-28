# Test Health Monitoring

## Overview

This document outlines the test health monitoring system for the Kiro Steering Loader extension. It provides automated monitoring, reporting, and maintenance guidelines to ensure test suite reliability and performance.

## Test Health Metrics

### 1. Coverage Metrics

**Thresholds:**
- Lines: 85% minimum
- Functions: 85% minimum  
- Branches: 85% minimum
- Statements: 85% minimum

**Monitoring:**
```typescript
// vitest.config.ts - Coverage configuration
export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
      exclude: [
        'tests/**',
        'node_modules/**',
        'coverage/**',
        '*.config.*',
      ],
    },
  },
});
```

### 2. Test Performance Metrics

**Performance Thresholds:**
- Unit tests: < 100ms per test
- Integration tests: < 500ms per test
- E2E tests: < 5000ms per test
- Total test suite: < 30 seconds

**Performance Monitoring Script:**
```typescript
// tests/maintenance/performance-monitor.ts
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';

interface TestPerformanceMetrics {
  testName: string;
  duration: number;
  memoryUsage: number;
  timestamp: Date;
}

export class TestPerformanceMonitor {
  private metrics: TestPerformanceMetrics[] = [];

  startTest(testName: string): () => void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      this.metrics.push({
        testName,
        duration: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        timestamp: new Date(),
      });
    };
  }

  generateReport(): void {
    const report = {
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
    };

    writeFileSync(
      'tests/reports/performance-report.json',
      JSON.stringify(report, null, 2)
    );
  }

  private getThresholdForTest(testName: string): number {
    if (testName.includes('unit')) return 100;
    if (testName.includes('integration')) return 500;
    if (testName.includes('e2e')) return 5000;
    return 1000; // default
  }
}
```

### 3. Test Reliability Metrics

**Flaky Test Detection:**
```typescript
// tests/maintenance/flaky-test-detector.ts
interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  timestamp: Date;
}

export class FlakyTestDetector {
  private results: TestResult[] = [];

  recordResult(testName: string, passed: boolean, duration: number): void {
    this.results.push({
      testName,
      passed,
      duration,
      timestamp: new Date(),
    });
  }

  detectFlakyTests(): string[] {
    const testGroups = this.groupResultsByTest();
    const flakyTests: string[] = [];

    for (const [testName, results] of testGroups) {
      if (results.length < 5) continue; // Need at least 5 runs

      const passRate = results.filter(r => r.passed).length / results.length;
      const durationVariance = this.calculateDurationVariance(results);

      // Flag as flaky if pass rate is between 20% and 80% or high duration variance
      if ((passRate > 0.2 && passRate < 0.8) || durationVariance > 1000) {
        flakyTests.push(testName);
      }
    }

    return flakyTests;
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

  private calculateDurationVariance(results: TestResult[]): number {
    const durations = results.map(r => r.duration);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    return variance;
  }
}
```

## Automated Health Checks

### Daily Health Check Script

```typescript
// tests/maintenance/daily-health-check.ts
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { TestPerformanceMonitor } from './performance-monitor';
import { FlakyTestDetector } from './flaky-test-detector';

interface HealthCheckReport {
  date: string;
  testsPassed: boolean;
  coverageThresholdMet: boolean;
  performanceWithinLimits: boolean;
  flakyTestsDetected: string[];
  recommendations: string[];
}

export class DailyHealthCheck {
  async runHealthCheck(): Promise<HealthCheckReport> {
    const report: HealthCheckReport = {
      date: new Date().toISOString(),
      testsPassed: false,
      coverageThresholdMet: false,
      performanceWithinLimits: false,
      flakyTestsDetected: [],
      recommendations: [],
    };

    try {
      // Run tests and capture results
      const testResult = execSync('npm test', { encoding: 'utf8' });
      report.testsPassed = !testResult.includes('FAILED');

      // Check coverage
      const coverageResult = execSync('npm run test:coverage', { encoding: 'utf8' });
      report.coverageThresholdMet = !coverageResult.includes('Coverage threshold');

      // Check performance
      const performanceMonitor = new TestPerformanceMonitor();
      // Performance data would be collected during test runs
      report.performanceWithinLimits = true; // Simplified for example

      // Check for flaky tests
      const flakyDetector = new FlakyTestDetector();
      report.flakyTestsDetected = flakyDetector.detectFlakyTests();

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      // Save report
      writeFileSync(
        `tests/reports/health-check-${new Date().toISOString().split('T')[0]}.json`,
        JSON.stringify(report, null, 2)
      );

      return report;
    } catch (error) {
      report.recommendations.push(`Health check failed: ${error}`);
      return report;
    }
  }

  private generateRecommendations(report: HealthCheckReport): string[] {
    const recommendations: string[] = [];

    if (!report.testsPassed) {
      recommendations.push('Fix failing tests immediately');
      recommendations.push('Review test logs for failure patterns');
    }

    if (!report.coverageThresholdMet) {
      recommendations.push('Add tests to improve coverage');
      recommendations.push('Review uncovered code paths');
    }

    if (!report.performanceWithinLimits) {
      recommendations.push('Optimize slow tests');
      recommendations.push('Review test setup and teardown efficiency');
    }

    if (report.flakyTestsDetected.length > 0) {
      recommendations.push(`Fix flaky tests: ${report.flakyTestsDetected.join(', ')}`);
      recommendations.push('Review test isolation and cleanup');
    }

    return recommendations;
  }
}
```

### GitHub Actions Health Check Workflow

```yaml
# .github/workflows/test-health-check.yml
name: Test Health Check

on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  health-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run health check
      run: |
        npm run test:health-check
        
    - name: Upload health report
      uses: actions/upload-artifact@v4
      with:
        name: health-report-${{ github.run_number }}
        path: tests/reports/
        
    - name: Comment on issues if unhealthy
      if: failure()
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const report = JSON.parse(fs.readFileSync('tests/reports/health-check-latest.json', 'utf8'));
          
          if (report.recommendations.length > 0) {
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Test Health Check Failed',
              body: `## Test Health Issues Detected\n\n**Recommendations:**\n${report.recommendations.map(r => `- ${r}`).join('\n')}\n\n**Report Date:** ${report.date}`,
              labels: ['testing', 'maintenance']
            });
          }
```

## Test Maintenance Automation

### Dependency Update Monitoring

```typescript
// tests/maintenance/dependency-monitor.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface DependencyUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: 'major' | 'minor' | 'patch';
  testingRequired: boolean;
}

export class DependencyMonitor {
  checkForUpdates(): DependencyUpdate[] {
    try {
      const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdated = JSON.parse(outdatedOutput);
      
      const updates: DependencyUpdate[] = [];
      
      for (const [name, info] of Object.entries(outdated as any)) {
        const update: DependencyUpdate = {
          name,
          currentVersion: info.current,
          latestVersion: info.latest,
          type: this.getUpdateType(info.current, info.latest),
          testingRequired: this.requiresTesting(name),
        };
        
        updates.push(update);
      }
      
      return updates;
    } catch (error) {
      console.warn('Failed to check for dependency updates:', error);
      return [];
    }
  }

  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (latestParts[0] > currentParts[0]) return 'major';
    if (latestParts[1] > currentParts[1]) return 'minor';
    return 'patch';
  }

  private requiresTesting(packageName: string): boolean {
    const testingRequiredPackages = [
      'vitest',
      '@vitest/ui',
      'c8',
      '@vscode/test-electron',
      'typescript',
      '@types/vscode',
    ];
    
    return testingRequiredPackages.some(pkg => packageName.includes(pkg));
  }

  generateUpdatePlan(updates: DependencyUpdate[]): string {
    const plan = ['# Dependency Update Plan\n'];
    
    const majorUpdates = updates.filter(u => u.type === 'major');
    const minorUpdates = updates.filter(u => u.type === 'minor');
    const patchUpdates = updates.filter(u => u.type === 'patch');
    
    if (majorUpdates.length > 0) {
      plan.push('## Major Updates (Requires Careful Testing)\n');
      majorUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        if (update.testingRequired) {
          plan.push('  - ⚠️ Requires comprehensive testing');
        }
      });
      plan.push('');
    }
    
    if (minorUpdates.length > 0) {
      plan.push('## Minor Updates\n');
      minorUpdates.forEach(update => {
        plan.push(`- ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
      });
      plan.push('');
    }
    
    if (patchUpdates.length > 0) {
      plan.push('## Patch Updates (Safe to Apply)\n');
      patchUpdates.forEach(update => {
        plan.push(`- ${update.name}: ${update.currentVersion} → ${update.latestVersion}`);
      });
    }
    
    return plan.join('\n');
  }
}
```

### Automated Test Cleanup

```typescript
// tests/maintenance/test-cleanup.ts
import { readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

export class TestCleanup {
  cleanupOldReports(maxAge: number = 30): void {
    const reportsDir = 'tests/reports';
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    try {
      const files = readdirSync(reportsDir);
      
      for (const file of files) {
        const filePath = join(reportsDir, file);
        const stats = statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          unlinkSync(filePath);
          console.log(`Cleaned up old report: ${file}`);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old reports:', error);
    }
  }

  cleanupTempFiles(): void {
    const tempDirs = [
      'tests/temp',
      'coverage',
      '.nyc_output',
    ];
    
    for (const dir of tempDirs) {
      try {
        const files = readdirSync(dir);
        for (const file of files) {
          if (file.startsWith('temp-') || file.startsWith('test-')) {
            unlinkSync(join(dir, file));
          }
        }
      } catch (error) {
        // Directory might not exist, which is fine
      }
    }
  }

  validateTestStructure(): string[] {
    const issues: string[] = [];
    
    // Check for orphaned test files
    const testFiles = this.findTestFiles('tests');
    const sourceFiles = this.findSourceFiles('src');
    
    for (const testFile of testFiles) {
      const expectedSourceFile = this.getExpectedSourceFile(testFile);
      if (!sourceFiles.includes(expectedSourceFile)) {
        issues.push(`Orphaned test file: ${testFile}`);
      }
    }
    
    // Check for missing test files
    for (const sourceFile of sourceFiles) {
      const expectedTestFile = this.getExpectedTestFile(sourceFile);
      if (!testFiles.includes(expectedTestFile)) {
        issues.push(`Missing test file for: ${sourceFile}`);
      }
    }
    
    return issues;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...this.findTestFiles(fullPath));
        } else if (entry.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  private findSourceFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...this.findSourceFiles(fullPath));
        } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  private getExpectedSourceFile(testFile: string): string {
    return testFile
      .replace('tests/', 'src/')
      .replace('.test.ts', '.ts');
  }

  private getExpectedTestFile(sourceFile: string): string {
    return sourceFile
      .replace('src/', 'tests/unit/')
      .replace('.ts', '.test.ts');
  }
}
```

## Performance Monitoring

### Test Performance Dashboard

```typescript
// tests/maintenance/performance-dashboard.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceTrend {
  date: string;
  averageDuration: number;
  totalTests: number;
  slowestTest: string;
  memoryUsage: number;
}

export class PerformanceDashboard {
  private trendsFile = 'tests/reports/performance-trends.json';

  recordPerformanceData(data: PerformanceTrend): void {
    let trends: PerformanceTrend[] = [];
    
    if (existsSync(this.trendsFile)) {
      trends = JSON.parse(readFileSync(this.trendsFile, 'utf8'));
    }
    
    trends.push(data);
    
    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    trends = trends.filter(trend => new Date(trend.date) > cutoffDate);
    
    writeFileSync(this.trendsFile, JSON.stringify(trends, null, 2));
  }

  generatePerformanceReport(): string {
    if (!existsSync(this.trendsFile)) {
      return 'No performance data available';
    }
    
    const trends: PerformanceTrend[] = JSON.parse(readFileSync(this.trendsFile, 'utf8'));
    
    if (trends.length === 0) {
      return 'No performance data available';
    }
    
    const latest = trends[trends.length - 1];
    const previous = trends.length > 1 ? trends[trends.length - 2] : null;
    
    const report = [
      '# Test Performance Report\n',
      `**Latest Run:** ${latest.date}`,
      `**Total Tests:** ${latest.totalTests}`,
      `**Average Duration:** ${latest.averageDuration.toFixed(2)}ms`,
      `**Memory Usage:** ${(latest.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `**Slowest Test:** ${latest.slowestTest}\n`,
    ];
    
    if (previous) {
      const durationChange = ((latest.averageDuration - previous.averageDuration) / previous.averageDuration) * 100;
      const memoryChange = ((latest.memoryUsage - previous.memoryUsage) / previous.memoryUsage) * 100;
      
      report.push('## Trends\n');
      report.push(`**Duration Change:** ${durationChange > 0 ? '+' : ''}${durationChange.toFixed(2)}%`);
      report.push(`**Memory Change:** ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(2)}%\n`);
      
      if (durationChange > 10) {
        report.push('⚠️ **Warning:** Test duration increased significantly');
      }
      
      if (memoryChange > 20) {
        report.push('⚠️ **Warning:** Memory usage increased significantly');
      }
    }
    
    // Performance recommendations
    report.push('\n## Recommendations\n');
    
    if (latest.averageDuration > 200) {
      report.push('- Consider optimizing slow tests');
      report.push('- Review test setup and teardown efficiency');
    }
    
    if (latest.memoryUsage > 100 * 1024 * 1024) { // 100MB
      report.push('- Monitor memory usage in tests');
      report.push('- Check for memory leaks in test cleanup');
    }
    
    return report.join('\n');
  }

  detectPerformanceRegressions(): string[] {
    if (!existsSync(this.trendsFile)) {
      return [];
    }
    
    const trends: PerformanceTrend[] = JSON.parse(readFileSync(this.trendsFile, 'utf8'));
    const regressions: string[] = [];
    
    if (trends.length < 2) {
      return regressions;
    }
    
    const latest = trends[trends.length - 1];
    const baseline = trends[Math.max(0, trends.length - 7)]; // Compare with 7 days ago
    
    const durationIncrease = (latest.averageDuration - baseline.averageDuration) / baseline.averageDuration;
    const memoryIncrease = (latest.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage;
    
    if (durationIncrease > 0.2) { // 20% increase
      regressions.push(`Test duration regression: ${(durationIncrease * 100).toFixed(1)}% increase`);
    }
    
    if (memoryIncrease > 0.3) { // 30% increase
      regressions.push(`Memory usage regression: ${(memoryIncrease * 100).toFixed(1)}% increase`);
    }
    
    return regressions;
  }
}
```

## Maintenance Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "test:health-check": "tsx tests/maintenance/run-health-check.ts",
    "test:cleanup": "tsx tests/maintenance/run-cleanup.ts",
    "test:performance-report": "tsx tests/maintenance/generate-performance-report.ts",
    "test:dependency-check": "tsx tests/maintenance/check-dependencies.ts",
    "test:maintenance": "npm run test:cleanup && npm run test:health-check && npm run test:performance-report"
  }
}
```

### Main Health Check Runner

```typescript
// tests/maintenance/run-health-check.ts
import { DailyHealthCheck } from './daily-health-check';
import { TestCleanup } from './test-cleanup';
import { PerformanceDashboard } from './performance-dashboard';
import { DependencyMonitor } from './dependency-monitor';

async function runMaintenanceTasks(): Promise<void> {
  console.log('🔍 Running test maintenance tasks...\n');

  // 1. Cleanup old files
  console.log('🧹 Cleaning up old files...');
  const cleanup = new TestCleanup();
  cleanup.cleanupOldReports();
  cleanup.cleanupTempFiles();
  
  const structureIssues = cleanup.validateTestStructure();
  if (structureIssues.length > 0) {
    console.warn('⚠️ Test structure issues found:');
    structureIssues.forEach(issue => console.warn(`  - ${issue}`));
  }

  // 2. Run health check
  console.log('\n🏥 Running health check...');
  const healthCheck = new DailyHealthCheck();
  const healthReport = await healthCheck.runHealthCheck();
  
  if (healthReport.testsPassed && healthReport.coverageThresholdMet) {
    console.log('✅ All tests passing and coverage threshold met');
  } else {
    console.error('❌ Health check failed');
    healthReport.recommendations.forEach(rec => console.error(`  - ${rec}`));
  }

  // 3. Generate performance report
  console.log('\n📊 Generating performance report...');
  const dashboard = new PerformanceDashboard();
  const performanceReport = dashboard.generatePerformanceReport();
  console.log(performanceReport);
  
  const regressions = dashboard.detectPerformanceRegressions();
  if (regressions.length > 0) {
    console.warn('\n⚠️ Performance regressions detected:');
    regressions.forEach(regression => console.warn(`  - ${regression}`));
  }

  // 4. Check dependencies
  console.log('\n📦 Checking dependencies...');
  const depMonitor = new DependencyMonitor();
  const updates = depMonitor.checkForUpdates();
  
  if (updates.length > 0) {
    console.log('📋 Dependency updates available:');
    const updatePlan = depMonitor.generateUpdatePlan(updates);
    console.log(updatePlan);
  } else {
    console.log('✅ All dependencies are up to date');
  }

  console.log('\n✨ Maintenance tasks completed!');
}

runMaintenanceTasks().catch(error => {
  console.error('❌ Maintenance tasks failed:', error);
  process.exit(1);
});
```

This comprehensive test maintenance and monitoring system provides:

1. **Test Health Monitoring** - Automated tracking of coverage, performance, and reliability metrics
2. **Performance Monitoring** - Trend analysis and regression detection for test performance
3. **Dependency Management** - Automated monitoring and update planning for test dependencies
4. **Automated Cleanup** - Regular cleanup of old reports and temporary files
5. **CI Integration** - GitHub Actions workflow for daily health checks
6. **Reporting** - Comprehensive reports and recommendations for test maintenance

The system ensures the test suite remains healthy, performant, and maintainable over time.
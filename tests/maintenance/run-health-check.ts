#!/usr/bin/env node

import { DailyHealthCheck } from './daily-health-check';
import { TestCleanup } from './test-cleanup';
import { DependencyMonitor } from './dependency-monitor';
import { performanceMonitor } from './performance-monitor';
import { flakyTestDetector } from './flaky-test-detector';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

/**
 * Main test maintenance runner
 * Performs comprehensive health checks, cleanup, and monitoring
 */
async function runMaintenanceTasks(): Promise<void> {
  console.log('🔍 Starting test maintenance tasks...\n');

  // Ensure reports directory exists
  const reportsDir = 'tests/reports';
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  let exitCode = 0;

  try {
    // 1. Cleanup old files and validate structure
    console.log('🧹 Performing cleanup tasks...');
    const cleanup = new TestCleanup();
    const cleanupReport = cleanup.performFullCleanup();
    
    const structureIssues = cleanup.validateTestStructure();
    if (structureIssues.length > 0) {
      console.warn(`⚠️ Found ${structureIssues.length} test structure issues`);
      structureIssues.slice(0, 5).forEach(issue => {
        console.warn(`  - ${issue.file}: ${issue.description}`);
      });
      if (structureIssues.length > 5) {
        console.warn(`  ... and ${structureIssues.length - 5} more issues`);
      }
    }

    // Save cleanup report
    const cleanupSummary = cleanup.generateCleanupReport();
    writeFileSync(`${reportsDir}/cleanup-report.md`, cleanupSummary);

    // 2. Run comprehensive health check
    console.log('\n🏥 Running health check...');
    const healthCheck = new DailyHealthCheck();
    const healthReport = await healthCheck.runHealthCheck();
    
    const healthScore = healthCheck.calculateHealthScore(healthReport);
    console.log(`📊 Health Score: ${healthScore.toFixed(1)}/100`);
    
    if (healthReport.testsPassed && healthReport.coverageThresholdMet) {
      console.log('✅ Tests passing and coverage threshold met');
    } else {
      console.error('❌ Health check issues detected:');
      healthReport.recommendations.forEach(rec => console.error(`  - ${rec}`));
      exitCode = 1;
    }

    // Save health summary
    const healthSummary = healthCheck.generateHealthSummary(healthReport);
    writeFileSync(`${reportsDir}/health-summary.md`, healthSummary);

    // 3. Generate performance report
    console.log('\n📊 Analyzing performance...');
    const performanceSummary = performanceMonitor.generateSummary();
    console.log(performanceSummary);
    
    writeFileSync(`${reportsDir}/performance-summary.md`, performanceSummary);

    // 4. Check for flaky tests
    console.log('\n🎯 Checking for flaky tests...');
    const flakyReport = flakyTestDetector.generateFlakyTestReport();
    const flakyTests = flakyTestDetector.detectFlakyTests();
    
    if (flakyTests.length > 0) {
      console.warn(`⚠️ Found ${flakyTests.length} potentially flaky tests`);
      flakyTests.slice(0, 3).forEach(test => {
        console.warn(`  - ${test.testName} (${(test.passRate * 100).toFixed(1)}% pass rate)`);
      });
    } else {
      console.log('✅ No flaky tests detected');
    }
    
    writeFileSync(`${reportsDir}/flaky-tests-report.md`, flakyReport);

    // 5. Check dependencies
    console.log('\n📦 Checking dependencies...');
    const depMonitor = new DependencyMonitor();
    const depReport = await depMonitor.generateDependencyReport();
    
    if (depReport.vulnerabilities.length > 0) {
      const critical = depReport.vulnerabilities.filter(v => v.severity === 'critical').length;
      const high = depReport.vulnerabilities.filter(v => v.severity === 'high').length;
      
      if (critical > 0 || high > 0) {
        console.error(`🚨 Security vulnerabilities found: ${critical} critical, ${high} high`);
        exitCode = 1;
      } else {
        console.warn(`⚠️ ${depReport.vulnerabilities.length} low/moderate security issues found`);
      }
    }
    
    if (depReport.updates.length > 0) {
      const securityUpdates = depReport.updates.filter(u => u.securityUpdate).length;
      const majorUpdates = depReport.updates.filter(u => u.type === 'major').length;
      
      console.log(`📋 ${depReport.updates.length} dependency updates available`);
      if (securityUpdates > 0) {
        console.warn(`  - ${securityUpdates} security updates`);
      }
      if (majorUpdates > 0) {
        console.log(`  - ${majorUpdates} major updates`);
      }
    } else {
      console.log('✅ All dependencies are up to date');
    }

    const depSummary = depMonitor.generateDependencySummary(depReport);
    const updatePlan = depMonitor.generateUpdatePlan(depReport.updates);
    
    writeFileSync(`${reportsDir}/dependency-summary.md`, depSummary);
    writeFileSync(`${reportsDir}/dependency-update-plan.md`, updatePlan);

    // 6. Generate overall summary
    console.log('\n📋 Generating maintenance summary...');
    const overallSummary = generateOverallSummary({
      healthScore,
      healthReport,
      cleanupReport,
      structureIssues: structureIssues.length,
      flakyTests: flakyTests.length,
      securityIssues: depReport.vulnerabilities.length,
      availableUpdates: depReport.updates.length,
    });
    
    writeFileSync(`${reportsDir}/maintenance-summary.md`, overallSummary);
    console.log(overallSummary);

  } catch (error) {
    console.error('❌ Maintenance tasks failed:', error);
    exitCode = 1;
  }

  console.log('\n✨ Maintenance tasks completed!');
  console.log(`📁 Reports saved to: ${reportsDir}/`);
  
  if (exitCode !== 0) {
    console.log('\n⚠️ Some issues were detected. Please review the reports and take appropriate action.');
  }

  process.exit(exitCode);
}

interface MaintenanceSummaryData {
  healthScore: number;
  healthReport: any;
  cleanupReport: any;
  structureIssues: number;
  flakyTests: number;
  securityIssues: number;
  availableUpdates: number;
}

function generateOverallSummary(data: MaintenanceSummaryData): string {
  const { healthScore, structureIssues, flakyTests, securityIssues, availableUpdates } = data;
  
  const scoreEmoji = healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🔴';
  const statusEmoji = securityIssues === 0 && flakyTests === 0 ? '✅' : '⚠️';
  
  const lines = [
    '# Test Maintenance Summary',
    '',
    `${scoreEmoji} **Overall Health Score:** ${healthScore.toFixed(1)}/100`,
    `${statusEmoji} **Status:** ${securityIssues === 0 && flakyTests === 0 ? 'Healthy' : 'Needs Attention'}`,
    `📅 **Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## Key Metrics',
    `- **Test Structure Issues:** ${structureIssues}`,
    `- **Flaky Tests:** ${flakyTests}`,
    `- **Security Issues:** ${securityIssues}`,
    `- **Available Updates:** ${availableUpdates}`,
    '',
    '## Priority Actions',
  ];

  // Add priority actions based on findings
  const actions: string[] = [];
  
  if (securityIssues > 0) {
    actions.push(`🚨 **URGENT:** Address ${securityIssues} security vulnerabilities`);
  }
  
  if (flakyTests > 0) {
    actions.push(`🎯 **HIGH:** Fix ${flakyTests} flaky tests`);
  }
  
  if (structureIssues > 5) {
    actions.push(`🔧 **MEDIUM:** Clean up ${structureIssues} test structure issues`);
  }
  
  if (availableUpdates > 10) {
    actions.push(`📦 **LOW:** Review ${availableUpdates} dependency updates`);
  }
  
  if (actions.length === 0) {
    actions.push('✅ **No immediate actions required** - test suite is healthy!');
  }
  
  actions.forEach(action => lines.push(`- ${action}`));
  
  lines.push('');
  lines.push('## Reports Generated');
  lines.push('- `health-summary.md` - Detailed health analysis');
  lines.push('- `performance-summary.md` - Performance metrics and trends');
  lines.push('- `flaky-tests-report.md` - Flaky test analysis');
  lines.push('- `dependency-summary.md` - Dependency status');
  lines.push('- `dependency-update-plan.md` - Update recommendations');
  lines.push('- `cleanup-report.md` - Cleanup and structure analysis');
  
  lines.push('');
  lines.push('## Next Steps');
  lines.push('1. Review priority actions above');
  lines.push('2. Check individual reports for detailed information');
  lines.push('3. Schedule regular maintenance (weekly recommended)');
  lines.push('4. Monitor trends over time for continuous improvement');

  return lines.join('\n');
}

// Run maintenance if this script is executed directly
if (require.main === module) {
  runMaintenanceTasks().catch(error => {
    console.error('Fatal error in maintenance tasks:', error);
    process.exit(1);
  });
}

export { runMaintenanceTasks };
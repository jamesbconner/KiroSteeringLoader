#!/usr/bin/env node

/**
 * Coverage Reporter and Quality Gate Checker
 * 
 * This script provides comprehensive coverage reporting and quality gate enforcement
 * for the Kiro Steering Loader extension testing framework.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

interface CoverageData {
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  statements: CoverageMetric;
}

interface CoverageReport {
  timestamp: string;
  coverage: CoverageData;
  threshold: number;
  passed: boolean;
  warnings: string[];
  trends: CoverageTrend[];
}

interface CoverageTrend {
  date: string;
  coverage: CoverageData;
  commit?: string;
  branch?: string;
}

/**
 * Coverage Reporter class for generating reports and enforcing quality gates
 */
class CoverageReporter {
  private coverageDir: string;
  private threshold: number;
  private trendsFile: string;

  constructor(coverageDir = 'coverage', threshold = 85) {
    this.coverageDir = coverageDir;
    this.threshold = threshold;
    this.trendsFile = path.join(coverageDir, 'coverage-trends.json');
  }

  /**
   * Generate comprehensive coverage report
   */
  async generateReport(): Promise<CoverageReport> {
    const coverageData = this.loadCoverageData();
    const trends = this.loadCoverageTrends();
    
    const report: CoverageReport = {
      timestamp: new Date().toISOString(),
      coverage: coverageData,
      threshold: this.threshold,
      passed: this.checkCoverageThreshold(coverageData),
      warnings: this.generateWarnings(coverageData),
      trends: trends.slice(-10) // Keep last 10 entries
    };

    // Save current coverage to trends
    this.saveCoverageTrend(coverageData);
    
    // Generate reports in multiple formats
    await this.saveReport(report, 'json');
    await this.saveReport(report, 'html');
    await this.saveReport(report, 'markdown');
    
    return report;
  } 
 /**
   * Load coverage data from Vitest coverage output
   */
  private loadCoverageData(): CoverageData {
    const coverageFile = path.join(this.coverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(coverageFile)) {
      throw new Error(`Coverage file not found: ${coverageFile}`);
    }

    try {
      const rawCoverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      return this.calculateCoverageTotals(rawCoverage);
    } catch (error) {
      throw new Error(`Failed to parse coverage data: ${error.message}`);
    }
  }

  /**
   * Calculate coverage totals from raw coverage data
   */
  private calculateCoverageTotals(rawCoverage: any): CoverageData {
    const totals = {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 }
    };

    // Process each file in the coverage report
    for (const file of Object.values(rawCoverage)) {
      const fileData = file as any;
      
      // Skip test files and node_modules
      if (fileData.path && 
          !fileData.path.includes('node_modules') && 
          !fileData.path.includes('tests/') &&
          !fileData.path.includes('.test.') &&
          !fileData.path.includes('.spec.')) {
        
        ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
          if (fileData[metric]) {
            totals[metric].total += fileData[metric].total || 0;
            totals[metric].covered += fileData[metric].covered || 0;
          }
        });
      }
    }

    // Calculate percentages
    Object.keys(totals).forEach(metric => {
      const total = totals[metric].total;
      const covered = totals[metric].covered;
      totals[metric].percentage = total > 0 ? Math.round((covered / total) * 10000) / 100 : 100;
    });

    return totals;
  }

  /**
   * Check if coverage meets quality gate requirements
   */
  private checkCoverageThreshold(coverage: CoverageData): boolean {
    return Object.values(coverage).every(metric => metric.percentage >= this.threshold);
  }

  /**
   * Generate warnings for coverage metrics below threshold
   */
  private generateWarnings(coverage: CoverageData): string[] {
    const warnings: string[] = [];
    
    Object.entries(coverage).forEach(([metric, data]) => {
      if (data.percentage < this.threshold) {
        warnings.push(
          `${metric.charAt(0).toUpperCase() + metric.slice(1)} coverage (${data.percentage}%) is below threshold (${this.threshold}%)`
        );
      }
    });

    return warnings;
  }  /**
   * 
Load coverage trends from historical data
   */
  private loadCoverageTrends(): CoverageTrend[] {
    if (!fs.existsSync(this.trendsFile)) {
      return [];
    }

    try {
      return JSON.parse(fs.readFileSync(this.trendsFile, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not load coverage trends: ${error.message}`);
      return [];
    }
  }

  /**
   * Save current coverage data to trends
   */
  private saveCoverageTrend(coverage: CoverageData): void {
    const trends = this.loadCoverageTrends();
    
    const newTrend: CoverageTrend = {
      date: new Date().toISOString(),
      coverage,
      commit: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA,
      branch: process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME
    };

    trends.push(newTrend);
    
    // Keep only last 50 entries to prevent file from growing too large
    const recentTrends = trends.slice(-50);
    
    // Ensure coverage directory exists
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }

    fs.writeFileSync(this.trendsFile, JSON.stringify(recentTrends, null, 2));
  }

  /**
   * Save coverage report in specified format
   */
  private async saveReport(report: CoverageReport, format: 'json' | 'html' | 'markdown'): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `coverage-report-${timestamp}.${format === 'html' ? 'html' : format === 'json' ? 'json' : 'md'}`;
    const filepath = path.join(this.coverageDir, filename);

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'html':
        content = this.generateHtmlReport(report);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(report);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    fs.writeFileSync(filepath, content);
    console.log(`Coverage report saved: ${filepath}`);
  }

  /**
   * Generate HTML coverage report
   */
  private generateHtmlReport(report: CoverageReport): string {
    const { coverage, threshold, passed, warnings, trends } = report;
    
    const statusColor = passed ? '#28a745' : '#dc3545';
    const statusText = passed ? 'PASSED' : 'FAILED';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report - ${report.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #666; font-size: 14px; }
        .warnings { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .trends { margin-top: 40px; }
        .trend-chart { height: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Coverage Quality Gate Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <div class="status">Status: ${statusText}</div>
        <p>Threshold: ${threshold}%</p>
    </div>

    <div class="metrics">
        ${Object.entries(coverage).map(([metric, data]) => `
            <div class="metric">
                <div class="metric-label">${metric.toUpperCase()}</div>
                <div class="metric-value ${data.percentage >= threshold ? 'pass' : 'fail'}">${data.percentage}%</div>
                <div>${data.covered} / ${data.total}</div>
            </div>
        `).join('')}
    </div>

    ${warnings.length > 0 ? `
        <div class="warnings">
            <h3>⚠️ Coverage Warnings</h3>
            <ul>
                ${warnings.map(warning => `<li>${warning}</li>`).join('')}
            </ul>
        </div>
    ` : ''}

    <div class="trends">
        <h3>Coverage Trends (Last ${trends.length} Runs)</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Lines</th>
                    <th>Functions</th>
                    <th>Branches</th>
                    <th>Statements</th>
                    <th>Commit</th>
                </tr>
            </thead>
            <tbody>
                ${trends.slice(-10).reverse().map(trend => `
                    <tr>
                        <td>${new Date(trend.date).toLocaleDateString()}</td>
                        <td>${trend.coverage.lines.percentage}%</td>
                        <td>${trend.coverage.functions.percentage}%</td>
                        <td>${trend.coverage.branches.percentage}%</td>
                        <td>${trend.coverage.statements.percentage}%</td>
                        <td>${trend.commit ? trend.commit.substring(0, 8) : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  }  
/**
   * Generate Markdown coverage report
   */
  private generateMarkdownReport(report: CoverageReport): string {
    const { coverage, threshold, passed, warnings, trends } = report;
    
    const statusEmoji = passed ? '✅' : '❌';
    const statusText = passed ? 'PASSED' : 'FAILED';
    
    let markdown = `# Coverage Quality Gate Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    markdown += `**Status:** ${statusEmoji} ${statusText}\n`;
    markdown += `**Threshold:** ${threshold}%\n\n`;

    // Coverage metrics table
    markdown += `## Coverage Metrics\n\n`;
    markdown += `| Metric | Covered | Total | Percentage | Status |\n`;
    markdown += `|--------|---------|-------|------------|--------|\n`;
    
    Object.entries(coverage).forEach(([metric, data]) => {
      const status = data.percentage >= threshold ? '✅' : '❌';
      markdown += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${data.covered} | ${data.total} | ${data.percentage}% | ${status} |\n`;
    });

    // Warnings section
    if (warnings.length > 0) {
      markdown += `\n## ⚠️ Coverage Warnings\n\n`;
      warnings.forEach(warning => {
        markdown += `- ${warning}\n`;
      });
    }

    // Quality gate summary
    markdown += `\n## Quality Gate Summary\n\n`;
    if (passed) {
      markdown += `✅ **All coverage metrics meet the required threshold of ${threshold}%**\n\n`;
      markdown += `The code coverage is sufficient for merging. Great job maintaining high code quality!\n`;
    } else {
      markdown += `❌ **Coverage quality gate failed**\n\n`;
      markdown += `Some coverage metrics are below the required threshold of ${threshold}%. `;
      markdown += `Please add more tests to improve coverage before merging.\n`;
    }

    // Trends section
    if (trends.length > 0) {
      markdown += `\n## Coverage Trends\n\n`;
      markdown += `| Date | Lines | Functions | Branches | Statements | Commit |\n`;
      markdown += `|------|-------|-----------|----------|------------|--------|\n`;
      
      trends.slice(-10).reverse().forEach(trend => {
        const date = new Date(trend.date).toLocaleDateString();
        const commit = trend.commit ? trend.commit.substring(0, 8) : 'N/A';
        markdown += `| ${date} | ${trend.coverage.lines.percentage}% | ${trend.coverage.functions.percentage}% | ${trend.coverage.branches.percentage}% | ${trend.coverage.statements.percentage}% | ${commit} |\n`;
      });

      // Trend analysis
      if (trends.length >= 2) {
        const current = trends[trends.length - 1];
        const previous = trends[trends.length - 2];
        
        markdown += `\n### Trend Analysis\n\n`;
        
        Object.entries(current.coverage).forEach(([metric, currentData]) => {
          const previousData = previous.coverage[metric];
          const change = currentData.percentage - previousData.percentage;
          
          if (Math.abs(change) >= 0.1) { // Only show significant changes
            const direction = change > 0 ? '📈' : '📉';
            const changeText = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
            markdown += `- ${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${direction} ${changeText}\n`;
          }
        });
      }
    }

    return markdown;
  }

  /**
   * Check quality gate and exit with appropriate code
   */
  public async checkQualityGate(): Promise<void> {
    try {
      const report = await this.generateReport();
      
      console.log(`\n📊 Coverage Quality Gate Report`);
      console.log(`===============================`);
      console.log(`Threshold: ${report.threshold}%`);
      console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`);

      // Display coverage metrics
      Object.entries(report.coverage).forEach(([metric, data]) => {
        const status = data.percentage >= report.threshold ? '✅' : '❌';
        console.log(`${status} ${metric.padEnd(12)}: ${data.percentage.toString().padStart(6)}% (${data.covered}/${data.total})`);
      });

      // Display warnings
      if (report.warnings.length > 0) {
        console.log(`\n⚠️  Coverage Warnings:`);
        report.warnings.forEach(warning => console.log(`   ${warning}`));
      }

      // Exit with appropriate code
      if (!report.passed) {
        console.log(`\n❌ Coverage quality gate failed. Please improve test coverage before merging.`);
        process.exit(1);
      } else {
        console.log(`\n✅ Coverage quality gate passed. All metrics meet the required threshold.`);
        process.exit(0);
      }
    } catch (error) {
      console.error(`❌ Coverage quality gate check failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  const coverageDir = process.env.COVERAGE_DIR || 'coverage';
  const threshold = parseInt(process.env.COVERAGE_THRESHOLD || '85', 10);
  
  const reporter = new CoverageReporter(coverageDir, threshold);

  switch (command) {
    case 'check':
      await reporter.checkQualityGate();
      break;
    case 'report':
      const report = await reporter.generateReport();
      console.log(`Coverage report generated: ${JSON.stringify(report, null, 2)}`);
      break;
    case 'help':
      console.log(`
Coverage Reporter and Quality Gate Checker

Usage:
  npm run coverage:check     - Check quality gate and generate reports
  npm run coverage:report    - Generate coverage reports only

Environment Variables:
  COVERAGE_DIR              - Coverage directory (default: coverage)
  COVERAGE_THRESHOLD        - Coverage threshold percentage (default: 85)
      `);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

export { CoverageReporter, CoverageReport, CoverageData, CoverageTrend };
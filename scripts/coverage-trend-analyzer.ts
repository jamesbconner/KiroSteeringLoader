#!/usr/bin/env node

/**
 * Coverage Trend Analyzer
 * 
 * Analyzes coverage trends over time and provides insights into
 * coverage improvements or regressions.
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

interface CoverageTrend {
  date: string;
  coverage: CoverageData;
  commit?: string;
  branch?: string;
}

interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  significance: 'major' | 'minor' | 'negligible';
}

interface TrendReport {
  period: string;
  totalRuns: number;
  analysis: TrendAnalysis[];
  summary: {
    overallTrend: 'improving' | 'declining' | 'stable';
    significantChanges: number;
    recommendations: string[];
  };
  regressions: {
    metric: string;
    from: number;
    to: number;
    date: string;
    commit?: string;
  }[];
}

/**
 * Coverage Trend Analyzer class
 */
class CoverageTrendAnalyzer {
  private coverageDir: string;
  private trendsFile: string;

  constructor(coverageDir = 'coverage') {
    this.coverageDir = coverageDir;
    this.trendsFile = path.join(coverageDir, 'coverage-trends.json');
  }

  /**
   * Analyze coverage trends and generate report
   */
  async analyzeTrends(days = 30): Promise<TrendReport> {
    const trends = this.loadTrends();
    
    if (trends.length < 2) {
      throw new Error('Insufficient trend data. Need at least 2 data points for analysis.');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentTrends = trends.filter(trend => 
      new Date(trend.date) >= cutoffDate
    );

    if (recentTrends.length < 2) {
      throw new Error(`Insufficient recent trend data. Found ${recentTrends.length} entries in last ${days} days.`);
    }

    const analysis = this.performTrendAnalysis(recentTrends);
    const regressions = this.detectRegressions(recentTrends);
    const summary = this.generateSummary(analysis, regressions);

    const report: TrendReport = {
      period: `Last ${days} days`,
      totalRuns: recentTrends.length,
      analysis,
      summary,
      regressions
    };

    // Save trend analysis report
    await this.saveTrendReport(report);
    
    return report;
  }

  /**
   * Load coverage trends from file
   */
  private loadTrends(): CoverageTrend[] {
    if (!fs.existsSync(this.trendsFile)) {
      return [];
    }

    try {
      return JSON.parse(fs.readFileSync(this.trendsFile, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to load trends: ${error.message}`);
    }
  }

  /**
   * Perform trend analysis on coverage data
   */
  private performTrendAnalysis(trends: CoverageTrend[]): TrendAnalysis[] {
    const current = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    
    const analysis: TrendAnalysis[] = [];
    
    Object.entries(current.coverage).forEach(([metric, currentData]) => {
      const previousData = previous.coverage[metric];
      const change = currentData.percentage - previousData.percentage;
      const changePercent = previousData.percentage > 0 
        ? (change / previousData.percentage) * 100 
        : 0;

      let trend: 'improving' | 'declining' | 'stable';
      let significance: 'major' | 'minor' | 'negligible';

      // Determine trend direction
      if (Math.abs(change) < 0.1) {
        trend = 'stable';
      } else if (change > 0) {
        trend = 'improving';
      } else {
        trend = 'declining';
      }

      // Determine significance
      if (Math.abs(change) >= 5) {
        significance = 'major';
      } else if (Math.abs(change) >= 1) {
        significance = 'minor';
      } else {
        significance = 'negligible';
      }

      analysis.push({
        metric,
        currentValue: currentData.percentage,
        previousValue: previousData.percentage,
        change,
        changePercent,
        trend,
        significance
      });
    });

    return analysis;
  }  /**

   * Detect coverage regressions in trend data
   */
  private detectRegressions(trends: CoverageTrend[], threshold = 2): any[] {
    const regressions: any[] = [];
    
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i];
      const previous = trends[i - 1];
      
      Object.entries(current.coverage).forEach(([metric, currentData]) => {
        const previousData = previous.coverage[metric];
        const change = currentData.percentage - previousData.percentage;
        
        // Detect significant regression
        if (change <= -threshold) {
          regressions.push({
            metric,
            from: previousData.percentage,
            to: currentData.percentage,
            date: current.date,
            commit: current.commit
          });
        }
      });
    }
    
    return regressions;
  }

  /**
   * Generate summary and recommendations
   */
  private generateSummary(analysis: TrendAnalysis[], regressions: any[]): any {
    const significantChanges = analysis.filter(a => a.significance !== 'negligible').length;
    const improvingMetrics = analysis.filter(a => a.trend === 'improving').length;
    const decliningMetrics = analysis.filter(a => a.trend === 'declining').length;
    
    let overallTrend: 'improving' | 'declining' | 'stable';
    if (improvingMetrics > decliningMetrics) {
      overallTrend = 'improving';
    } else if (decliningMetrics > improvingMetrics) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    const recommendations: string[] = [];
    
    // Generate recommendations based on analysis
    if (regressions.length > 0) {
      recommendations.push(`Address ${regressions.length} coverage regression(s) detected`);
    }
    
    const lowCoverageMetrics = analysis.filter(a => a.currentValue < 85);
    if (lowCoverageMetrics.length > 0) {
      recommendations.push(`Improve coverage for: ${lowCoverageMetrics.map(m => m.metric).join(', ')}`);
    }
    
    const decliningSignificant = analysis.filter(a => 
      a.trend === 'declining' && a.significance !== 'negligible'
    );
    if (decliningSignificant.length > 0) {
      recommendations.push(`Focus on declining metrics: ${decliningSignificant.map(m => m.metric).join(', ')}`);
    }
    
    if (overallTrend === 'improving') {
      recommendations.push('Great job! Coverage is trending upward. Keep up the good work.');
    } else if (overallTrend === 'stable') {
      recommendations.push('Coverage is stable. Consider adding tests for new features.');
    }

    return {
      overallTrend,
      significantChanges,
      recommendations
    };
  }

  /**
   * Save trend analysis report
   */
  private async saveTrendReport(report: TrendReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `coverage-trend-analysis-${timestamp}.json`;
    const filepath = path.join(this.coverageDir, filename);

    // Ensure coverage directory exists
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Also save as markdown for easy reading
    const markdownReport = this.generateMarkdownReport(report);
    const markdownFilename = `coverage-trend-analysis-${timestamp}.md`;
    const markdownFilepath = path.join(this.coverageDir, markdownFilename);
    
    fs.writeFileSync(markdownFilepath, markdownReport);
    
    console.log(`Trend analysis saved: ${filepath}`);
    console.log(`Markdown report saved: ${markdownFilepath}`);
  }

  /**
   * Generate markdown trend report
   */
  private generateMarkdownReport(report: TrendReport): string {
    let markdown = `# Coverage Trend Analysis\n\n`;
    markdown += `**Period:** ${report.period}\n`;
    markdown += `**Total Runs:** ${report.totalRuns}\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

    // Overall summary
    const trendEmoji = {
      improving: '📈',
      declining: '📉',
      stable: '📊'
    };
    
    markdown += `## Summary\n\n`;
    markdown += `**Overall Trend:** ${trendEmoji[report.summary.overallTrend]} ${report.summary.overallTrend.toUpperCase()}\n`;
    markdown += `**Significant Changes:** ${report.summary.significantChanges}\n\n`;

    // Detailed analysis
    markdown += `## Detailed Analysis\n\n`;
    markdown += `| Metric | Current | Previous | Change | Trend | Significance |\n`;
    markdown += `|--------|---------|----------|--------|-------|-------------|\n`;
    
    report.analysis.forEach(analysis => {
      const trendIcon = analysis.trend === 'improving' ? '📈' : 
                       analysis.trend === 'declining' ? '📉' : '➡️';
      const changeText = analysis.change > 0 ? `+${analysis.change.toFixed(2)}%` : `${analysis.change.toFixed(2)}%`;
      
      markdown += `| ${analysis.metric} | ${analysis.currentValue.toFixed(2)}% | ${analysis.previousValue.toFixed(2)}% | ${changeText} | ${trendIcon} ${analysis.trend} | ${analysis.significance} |\n`;
    });

    // Regressions
    if (report.regressions.length > 0) {
      markdown += `\n## 🚨 Coverage Regressions\n\n`;
      markdown += `| Metric | From | To | Change | Date | Commit |\n`;
      markdown += `|--------|------|----|---------|----|--------|\n`;
      
      report.regressions.forEach(regression => {
        const change = regression.to - regression.from;
        const date = new Date(regression.date).toLocaleDateString();
        const commit = regression.commit ? regression.commit.substring(0, 8) : 'N/A';
        
        markdown += `| ${regression.metric} | ${regression.from.toFixed(2)}% | ${regression.to.toFixed(2)}% | ${change.toFixed(2)}% | ${date} | ${commit} |\n`;
      });
    }

    // Recommendations
    if (report.summary.recommendations.length > 0) {
      markdown += `\n## 💡 Recommendations\n\n`;
      report.summary.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
    }

    return markdown;
  }

  /**
   * Display trend analysis in console
   */
  displayTrendAnalysis(report: TrendReport): void {
    console.log(`\n📊 Coverage Trend Analysis`);
    console.log(`==========================`);
    console.log(`Period: ${report.period}`);
    console.log(`Total Runs: ${report.totalRuns}`);
    
    const trendEmoji = {
      improving: '📈',
      declining: '📉',
      stable: '📊'
    };
    
    console.log(`Overall Trend: ${trendEmoji[report.summary.overallTrend]} ${report.summary.overallTrend.toUpperCase()}\n`);

    // Display analysis
    console.log(`Metric Analysis:`);
    report.analysis.forEach(analysis => {
      const trendIcon = analysis.trend === 'improving' ? '📈' : 
                       analysis.trend === 'declining' ? '📉' : '➡️';
      const changeText = analysis.change > 0 ? `+${analysis.change.toFixed(2)}%` : `${analysis.change.toFixed(2)}%`;
      
      console.log(`  ${trendIcon} ${analysis.metric.padEnd(12)}: ${analysis.currentValue.toFixed(2)}% (${changeText})`);
    });

    // Display regressions
    if (report.regressions.length > 0) {
      console.log(`\n🚨 Coverage Regressions:`);
      report.regressions.forEach(regression => {
        const change = regression.to - regression.from;
        console.log(`  ❌ ${regression.metric}: ${regression.from.toFixed(2)}% → ${regression.to.toFixed(2)}% (${change.toFixed(2)}%)`);
      });
    }

    // Display recommendations
    if (report.summary.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.summary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const days = parseInt(args[1] || '30', 10);
  
  const analyzer = new CoverageTrendAnalyzer();

  try {
    switch (command) {
      case 'analyze':
        const report = await analyzer.analyzeTrends(days);
        analyzer.displayTrendAnalysis(report);
        break;
      case 'help':
        console.log(`
Coverage Trend Analyzer

Usage:
  npm run coverage:trends [days]    - Analyze trends for specified days (default: 30)

Examples:
  npm run coverage:trends           - Analyze last 30 days
  npm run coverage:trends 7         - Analyze last 7 days
        `);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Trend analysis failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CoverageTrendAnalyzer, TrendReport, TrendAnalysis };
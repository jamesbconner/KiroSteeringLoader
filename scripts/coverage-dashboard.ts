#!/usr/bin/env node

/**
 * Coverage Dashboard Generator
 * 
 * Generates an interactive HTML dashboard for coverage reporting and trend analysis
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

/**
 * Coverage Dashboard Generator class
 */
class CoverageDashboard {
  private coverageDir: string;
  private trendsFile: string;

  constructor(coverageDir = 'coverage') {
    this.coverageDir = coverageDir;
    this.trendsFile = path.join(coverageDir, 'coverage-trends.json');
  }

  /**
   * Generate interactive coverage dashboard
   */
  async generateDashboard(): Promise<void> {
    const trends = this.loadTrends();
    const currentCoverage = trends.length > 0 ? trends[trends.length - 1].coverage : null;
    
    const dashboardHtml = this.generateDashboardHtml(currentCoverage, trends);
    
    const dashboardPath = path.join(this.coverageDir, 'coverage-dashboard.html');
    fs.writeFileSync(dashboardPath, dashboardHtml);
    
    console.log(`Coverage dashboard generated: ${dashboardPath}`);
  }

  /**
   * Load coverage trends
   */
  private loadTrends(): CoverageTrend[] {
    if (!fs.existsSync(this.trendsFile)) {
      return [];
    }

    try {
      return JSON.parse(fs.readFileSync(this.trendsFile, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not load trends: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate dashboard HTML
   */
  private generateDashboardHtml(currentCoverage: CoverageData | null, trends: CoverageTrend[]): string {
    const chartData = this.prepareChartData(trends);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Dashboard - Kiro Steering Loader</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: #f8f9fa; 
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: white; 
            border-radius: 12px; 
            padding: 30px; 
            margin-bottom: 30px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header p { color: #7f8c8d; font-size: 16px; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .metric-card { 
            background: white; 
            border-radius: 12px; 
            padding: 25px; 
            text-align: center; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-value { 
            font-size: 48px; 
            font-weight: bold; 
            margin: 15px 0; 
        }
        .metric-label { 
            color: #7f8c8d; 
            font-size: 14px; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
        }
        .metric-details { 
            color: #95a5a6; 
            font-size: 14px; 
            margin-top: 10px; 
        }
        .chart-container { 
            background: white; 
            border-radius: 12px; 
            padding: 30px; 
            margin-bottom: 30px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .chart-title { 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 20px; 
            color: #2c3e50; 
        }
        .chart-wrapper { 
            position: relative; 
            height: 400px; 
        }
        .status-indicator { 
            display: inline-block; 
            width: 12px; 
            height: 12px; 
            border-radius: 50%; 
            margin-right: 8px; 
        }
        .status-pass { background-color: #27ae60; }
        .status-fail { background-color: #e74c3c; }
        .status-warning { background-color: #f39c12; }
        .footer { 
            text-align: center; 
            color: #7f8c8d; 
            font-size: 14px; 
            margin-top: 40px; 
        }
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 20px;
        }
        .refresh-btn:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Coverage Dashboard</h1>
            <p>Real-time coverage metrics and trends for Kiro Steering Loader
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
            </p>
            <p style="margin-top: 10px; font-size: 14px;">
                Last updated: ${new Date().toLocaleString()}
            </p>
        </div>

        ${currentCoverage ? this.generateMetricsSection(currentCoverage) : '<p>No coverage data available</p>'}

        ${trends.length > 1 ? this.generateChartsSection(chartData) : '<p>Insufficient data for trend charts</p>'}

        <div class="footer">
            <p>Generated by Kiro Steering Loader Coverage Dashboard</p>
        </div>
    </div>

    <script>
        ${this.generateChartScript(chartData)}
    </script>
</body>
</html>`;
  }  /*
*
   * Generate metrics section HTML
   */
  private generateMetricsSection(coverage: CoverageData): string {
    const threshold = 85;
    
    return `
        <div class="metrics-grid">
            ${Object.entries(coverage).map(([metric, data]) => {
              const status = data.percentage >= threshold ? 'pass' : 'fail';
              const statusClass = `status-${status}`;
              
              return `
                <div class="metric-card">
                    <div class="metric-label">
                        <span class="status-indicator ${statusClass}"></span>
                        ${metric.toUpperCase()}
                    </div>
                    <div class="metric-value" style="color: ${data.percentage >= threshold ? '#27ae60' : '#e74c3c'}">
                        ${data.percentage.toFixed(1)}%
                    </div>
                    <div class="metric-details">
                        ${data.covered} / ${data.total} covered
                    </div>
                </div>
              `;
            }).join('')}
        </div>
    `;
  }

  /**
   * Generate charts section HTML
   */
  private generateChartsSection(chartData: any): string {
    return `
        <div class="chart-container">
            <div class="chart-title">Coverage Trends Over Time</div>
            <div class="chart-wrapper">
                <canvas id="coverageChart"></canvas>
            </div>
        </div>
    `;
  }

  /**
   * Prepare chart data for visualization
   */
  private prepareChartData(trends: CoverageTrend[]): any {
    const labels = trends.map(trend => 
      new Date(trend.date).toLocaleDateString()
    );

    const datasets = [
      {
        label: 'Lines',
        data: trends.map(trend => trend.coverage.lines.percentage),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4
      },
      {
        label: 'Functions',
        data: trends.map(trend => trend.coverage.functions.percentage),
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        tension: 0.4
      },
      {
        label: 'Branches',
        data: trends.map(trend => trend.coverage.branches.percentage),
        borderColor: '#f39c12',
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
        tension: 0.4
      },
      {
        label: 'Statements',
        data: trends.map(trend => trend.coverage.statements.percentage),
        borderColor: '#9b59b6',
        backgroundColor: 'rgba(155, 89, 182, 0.1)',
        tension: 0.4
      }
    ];

    return { labels, datasets };
  }

  /**
   * Generate Chart.js script
   */
  private generateChartScript(chartData: any): string {
    return `
        const ctx = document.getElementById('coverageChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: ${JSON.stringify(chartData)},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 4,
                            hoverRadius: 6
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
    `;
  }
}

// CLI interface
async function main() {
  const dashboard = new CoverageDashboard();
  
  try {
    await dashboard.generateDashboard();
    console.log('✅ Coverage dashboard generated successfully');
  } catch (error) {
    console.error(`❌ Dashboard generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CoverageDashboard };
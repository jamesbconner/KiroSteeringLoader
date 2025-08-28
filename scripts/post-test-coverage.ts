#!/usr/bin/env node

/**
 * Post-Test Coverage Hook
 * 
 * Automatically runs after tests to generate comprehensive coverage reports,
 * check quality gates, and update trend data.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Post-test coverage processing
 */
class PostTestCoverage {
  private coverageDir: string;

  constructor(coverageDir = 'coverage') {
    this.coverageDir = coverageDir;
  }

  /**
   * Run post-test coverage processing
   */
  async run(): Promise<void> {
    console.log('🔄 Running post-test coverage processing...\n');

    try {
      // Ensure coverage directory exists
      if (!fs.existsSync(this.coverageDir)) {
        fs.mkdirSync(this.coverageDir, { recursive: true });
      }

      // Check if coverage data exists
      const coverageFinalPath = path.join(this.coverageDir, 'coverage-final.json');
      if (!fs.existsSync(coverageFinalPath)) {
        console.log('⚠️  No coverage data found. Skipping coverage processing.');
        return;
      }

      // Generate coverage reports
      console.log('📊 Generating coverage reports...');
      await this.generateReports();

      // Check quality gates
      console.log('🚪 Checking coverage quality gates...');
      await this.checkQualityGates();

      // Update trend data
      console.log('📈 Updating coverage trends...');
      await this.updateTrends();

      // Generate dashboard
      console.log('🎯 Generating coverage dashboard...');
      await this.generateDashboard();

      console.log('\n✅ Post-test coverage processing completed successfully!');
      
      // Display summary
      this.displaySummary();

    } catch (error) {
      console.error(`❌ Post-test coverage processing failed: ${error.message}`);
      
      // Don't fail the build for coverage processing errors in development
      if (process.env.NODE_ENV !== 'production' && process.env.CI !== 'true') {
        console.log('⚠️  Continuing despite coverage processing errors (development mode)');
        return;
      }
      
      process.exit(1);
    }
  }

  /**
   * Generate coverage reports
   */
  private async generateReports(): Promise<void> {
    try {
      execSync('npx tsx scripts/coverage-reporter.ts report', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('  ✅ Coverage reports generated');
    } catch (error) {
      console.log('  ⚠️  Coverage report generation failed (non-critical)');
    }
  }

  /**
   * Check quality gates
   */
  private async checkQualityGates(): Promise<void> {
    try {
      execSync('npx tsx scripts/coverage-reporter.ts check', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('  ✅ Quality gates passed');
    } catch (error) {
      console.log('  ❌ Quality gates failed');
      
      // In CI or production, fail the build
      if (process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
        throw new Error('Coverage quality gates failed');
      }
    }
  }

  /**
   * Update trend data
   */
  private async updateTrends(): Promise<void> {
    try {
      execSync('npx tsx scripts/coverage-trend-analyzer.ts analyze 7', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('  ✅ Coverage trends updated');
    } catch (error) {
      console.log('  ⚠️  Trend analysis failed (non-critical)');
    }
  }

  /**
   * Generate dashboard
   */
  private async generateDashboard(): Promise<void> {
    try {
      execSync('npx tsx scripts/coverage-dashboard.ts', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('  ✅ Coverage dashboard generated');
    } catch (error) {
      console.log('  ⚠️  Dashboard generation failed (non-critical)');
    }
  }

  /**
   * Display coverage summary
   */
  private displaySummary(): void {
    try {
      const coverageFinalPath = path.join(this.coverageDir, 'coverage-final.json');
      const rawCoverage = JSON.parse(fs.readFileSync(coverageFinalPath, 'utf8'));
      
      // Calculate totals
      const totals = {
        lines: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
        branches: { total: 0, covered: 0 },
        statements: { total: 0, covered: 0 }
      };

      Object.values(rawCoverage).forEach((file: any) => {
        if (file.path && 
            !file.path.includes('node_modules') && 
            !file.path.includes('tests/') &&
            !file.path.includes('.test.') &&
            !file.path.includes('.spec.')) {
          
          ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
            if (file[metric]) {
              totals[metric].total += file[metric].total || 0;
              totals[metric].covered += file[metric].covered || 0;
            }
          });
        }
      });

      console.log('\n📊 Coverage Summary:');
      console.log('==================');
      
      Object.entries(totals).forEach(([metric, data]) => {
        const percentage = data.total > 0 ? (data.covered / data.total) * 100 : 100;
        const status = percentage >= 85 ? '✅' : '❌';
        console.log(`${status} ${metric.padEnd(12)}: ${percentage.toFixed(2).padStart(6)}% (${data.covered}/${data.total})`);
      });

      // Show available reports
      console.log('\n📁 Generated Reports:');
      console.log('====================');
      
      const reportFiles = [
        'coverage-dashboard.html',
        'index.html',
        'lcov.info'
      ];

      reportFiles.forEach(file => {
        const filePath = path.join(this.coverageDir, file);
        if (fs.existsSync(filePath)) {
          console.log(`  📄 ${file}`);
        }
      });

      // Show latest trend analysis
      const trendFiles = fs.readdirSync(this.coverageDir)
        .filter(f => f.startsWith('coverage-trend-analysis-') && f.endsWith('.md'))
        .sort()
        .pop();

      if (trendFiles) {
        console.log(`  📈 ${trendFiles}`);
      }

    } catch (error) {
      console.log('⚠️  Could not display coverage summary');
    }
  }
}

// CLI interface
async function main() {
  const processor = new PostTestCoverage();
  await processor.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PostTestCoverage };
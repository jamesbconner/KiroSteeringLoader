import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface DependencyUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  wantedVersion: string;
  type: 'major' | 'minor' | 'patch';
  testingRequired: boolean;
  securityUpdate: boolean;
  category: 'production' | 'development' | 'testing';
}

interface SecurityVulnerability {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  url: string;
  fixAvailable: boolean;
}

interface DependencyReport {
  date: string;
  updates: DependencyUpdate[];
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
}

/**
 * Monitors dependencies for updates and security vulnerabilities
 */
export class DependencyMonitor {
  private readonly reportsDir = 'tests/reports';

  /**
   * Check for available dependency updates
   */
  checkForUpdates(): DependencyUpdate[] {
    try {
      console.log('📦 Checking for dependency updates...');
      
      const outdatedOutput = execSync('npm outdated --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr warnings
      });
      
      if (!outdatedOutput.trim()) {
        return [];
      }
      
      const outdated = JSON.parse(outdatedOutput);
      const updates: DependencyUpdate[] = [];
      
      for (const [name, info] of Object.entries(outdated as any)) {
        const update: DependencyUpdate = {
          name,
          currentVersion: info.current,
          latestVersion: info.latest,
          wantedVersion: info.wanted,
          type: this.getUpdateType(info.current, info.latest),
          testingRequired: this.requiresTesting(name),
          securityUpdate: false, // Will be updated by security check
          category: this.getDependencyCategory(name),
        };
        
        updates.push(update);
      }
      
      return updates;
    } catch (error) {
      console.warn('Failed to check for dependency updates. This is normal if all dependencies are up to date.');
      return [];
    }
  }

  /**
   * Check for security vulnerabilities
   */
  async checkSecurityVulnerabilities(): Promise<SecurityVulnerability[]> {
    try {
      console.log('🔒 Checking for security vulnerabilities...');
      
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      
      const audit = JSON.parse(auditOutput);
      const vulnerabilities: SecurityVulnerability[] = [];
      
      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries(audit.vulnerabilities as any)) {
          vulnerabilities.push({
            name,
            severity: vuln.severity,
            title: vuln.title || 'Security vulnerability',
            url: vuln.url || '',
            fixAvailable: vuln.fixAvailable || false,
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      console.warn('Security audit check completed with warnings (this is often normal)');
      return [];
    }
  }

  /**
   * Generate a comprehensive dependency report
   */
  async generateDependencyReport(): Promise<DependencyReport> {
    const updates = this.checkForUpdates();
    const vulnerabilities = await this.checkSecurityVulnerabilities();
    
    // Mark security-related updates
    for (const update of updates) {
      update.securityUpdate = vulnerabilities.some(v => v.name === update.name);
    }
    
    const report: DependencyReport = {
      date: new Date().toISOString(),
      updates,
      vulnerabilities,
      recommendations: this.generateRecommendations(updates, vulnerabilities),
    };
    
    // Save report
    const reportPath = `${this.reportsDir}/dependency-report-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  /**
   * Generate an update plan with prioritization
   */
  generateUpdatePlan(updates: DependencyUpdate[]): string {
    if (updates.length === 0) {
      return '✅ All dependencies are up to date!';
    }

    const plan = ['# Dependency Update Plan\n'];
    
    // Group updates by priority
    const securityUpdates = updates.filter(u => u.securityUpdate);
    const testingUpdates = updates.filter(u => u.testingRequired && !u.securityUpdate);
    const majorUpdates = updates.filter(u => u.type === 'major' && !u.securityUpdate && !u.testingRequired);
    const minorUpdates = updates.filter(u => u.type === 'minor' && !u.securityUpdate && !u.testingRequired);
    const patchUpdates = updates.filter(u => u.type === 'patch' && !u.securityUpdate && !u.testingRequired);
    
    if (securityUpdates.length > 0) {
      plan.push('## 🚨 Security Updates (URGENT)');
      plan.push('These updates address security vulnerabilities and should be applied immediately.\n');
      securityUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        plan.push(`  - Category: ${update.category}`);
        plan.push(`  - Update type: ${update.type}`);
        plan.push(`  - Command: \`npm install ${update.name}@${update.latestVersion}\``);
      });
      plan.push('');
    }
    
    if (testingUpdates.length > 0) {
      plan.push('## 🧪 Testing Framework Updates (High Priority)');
      plan.push('These updates affect the testing infrastructure and require careful validation.\n');
      testingUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        plan.push(`  - Update type: ${update.type}`);
        plan.push(`  - ⚠️ Requires comprehensive testing after update`);
        plan.push(`  - Command: \`npm install ${update.name}@${update.latestVersion}\``);
      });
      plan.push('');
    }
    
    if (majorUpdates.length > 0) {
      plan.push('## 🔄 Major Updates (Requires Careful Testing)');
      plan.push('These updates may include breaking changes. Review changelogs before updating.\n');
      majorUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        plan.push(`  - Category: ${update.category}`);
        plan.push(`  - ⚠️ May include breaking changes`);
        plan.push(`  - Review changelog before updating`);
      });
      plan.push('');
    }
    
    if (minorUpdates.length > 0) {
      plan.push('## ⬆️ Minor Updates (Medium Priority)');
      plan.push('These updates add new features and improvements.\n');
      minorUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        plan.push(`  - Category: ${update.category}`);
      });
      plan.push('');
    }
    
    if (patchUpdates.length > 0) {
      plan.push('## 🔧 Patch Updates (Low Priority)');
      plan.push('These updates include bug fixes and are generally safe to apply.\n');
      patchUpdates.forEach(update => {
        plan.push(`- **${update.name}**: ${update.currentVersion} → ${update.latestVersion}`);
        plan.push(`  - Category: ${update.category}`);
      });
      plan.push('');
    }
    
    // Add update commands
    plan.push('## Update Commands\n');
    plan.push('### Update all patch versions (safest):');
    plan.push('```bash');
    plan.push('npm update');
    plan.push('```\n');
    
    plan.push('### Update specific packages:');
    plan.push('```bash');
    updates.slice(0, 5).forEach(update => {
      plan.push(`npm install ${update.name}@${update.latestVersion}`);
    });
    plan.push('```\n');
    
    plan.push('### After updating, always run:');
    plan.push('```bash');
    plan.push('npm test');
    plan.push('npm run test:coverage');
    plan.push('npm audit');
    plan.push('```');
    
    return plan.join('\n');
  }

  /**
   * Generate human-readable dependency summary
   */
  generateDependencySummary(report: DependencyReport): string {
    const lines = [
      '# Dependency Status Report',
      '',
      `📅 **Report Date:** ${new Date(report.date).toLocaleDateString()}`,
      `📦 **Updates Available:** ${report.updates.length}`,
      `🔒 **Security Issues:** ${report.vulnerabilities.length}`,
      '',
    ];

    if (report.vulnerabilities.length > 0) {
      lines.push('## 🚨 Security Vulnerabilities');
      const critical = report.vulnerabilities.filter(v => v.severity === 'critical');
      const high = report.vulnerabilities.filter(v => v.severity === 'high');
      const moderate = report.vulnerabilities.filter(v => v.severity === 'moderate');
      const low = report.vulnerabilities.filter(v => v.severity === 'low');
      
      if (critical.length > 0) lines.push(`- **Critical:** ${critical.length}`);
      if (high.length > 0) lines.push(`- **High:** ${high.length}`);
      if (moderate.length > 0) lines.push(`- **Moderate:** ${moderate.length}`);
      if (low.length > 0) lines.push(`- **Low:** ${low.length}`);
      lines.push('');
    }

    if (report.updates.length > 0) {
      lines.push('## 📊 Update Breakdown');
      const major = report.updates.filter(u => u.type === 'major').length;
      const minor = report.updates.filter(u => u.type === 'minor').length;
      const patch = report.updates.filter(u => u.type === 'patch').length;
      const security = report.updates.filter(u => u.securityUpdate).length;
      
      lines.push(`- **Major:** ${major}`);
      lines.push(`- **Minor:** ${minor}`);
      lines.push(`- **Patch:** ${patch}`);
      if (security > 0) lines.push(`- **Security:** ${security}`);
      lines.push('');
    }

    if (report.recommendations.length > 0) {
      lines.push('## 💡 Recommendations');
      report.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
    }

    return lines.join('\n');
  }

  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
    try {
      const currentParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);
      const latestParts = latest.replace(/[^0-9.]/g, '').split('.').map(Number);
      
      if (latestParts[0] > currentParts[0]) return 'major';
      if (latestParts[1] > currentParts[1]) return 'minor';
      return 'patch';
    } catch (error) {
      return 'patch'; // Default to patch if parsing fails
    }
  }

  private requiresTesting(packageName: string): boolean {
    const testingPackages = [
      'vitest',
      '@vitest/ui',
      'c8',
      '@vscode/test-electron',
      'typescript',
      '@types/vscode',
      '@types/node',
      'eslint',
      'prettier',
    ];
    
    return testingPackages.some(pkg => packageName.includes(pkg));
  }

  private getDependencyCategory(packageName: string): 'production' | 'development' | 'testing' {
    // Read package.json to determine category
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      
      if (packageJson.dependencies && packageJson.dependencies[packageName]) {
        return 'production';
      }
      
      if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
        // Check if it's testing-related
        const testingPackages = ['vitest', 'test', 'jest', 'mocha', 'chai', 'coverage'];
        if (testingPackages.some(pkg => packageName.includes(pkg))) {
          return 'testing';
        }
        return 'development';
      }
      
      return 'development';
    } catch (error) {
      return 'development';
    }
  }

  private generateRecommendations(updates: DependencyUpdate[], vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    
    if (criticalVulns.length > 0) {
      recommendations.push(`🚨 Address ${criticalVulns.length} critical security vulnerabilities immediately`);
    }
    
    if (highVulns.length > 0) {
      recommendations.push(`⚠️ Address ${highVulns.length} high-severity security vulnerabilities`);
    }

    // Update recommendations
    const securityUpdates = updates.filter(u => u.securityUpdate);
    const majorUpdates = updates.filter(u => u.type === 'major');
    const testingUpdates = updates.filter(u => u.testingRequired);
    
    if (securityUpdates.length > 0) {
      recommendations.push(`🔒 Apply ${securityUpdates.length} security updates`);
    }
    
    if (testingUpdates.length > 0) {
      recommendations.push(`🧪 Carefully test ${testingUpdates.length} testing framework updates`);
    }
    
    if (majorUpdates.length > 0) {
      recommendations.push(`📋 Review changelogs for ${majorUpdates.length} major updates`);
    }

    // General recommendations
    if (updates.length > 20) {
      recommendations.push('📦 Consider updating dependencies in smaller batches');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Dependencies are up to date and secure');
      recommendations.push('🔄 Continue monitoring for updates weekly');
    }

    return recommendations;
  }
}
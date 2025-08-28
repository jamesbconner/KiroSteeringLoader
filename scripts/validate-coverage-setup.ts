#!/usr/bin/env node

/**
 * Coverage Setup Validator
 * 
 * Validates that the coverage system is properly configured and all
 * required components are in place.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

/**
 * Coverage Setup Validator class
 */
class CoverageSetupValidator {
  private results: ValidationResult[] = [];

  /**
   * Run complete validation
   */
  async validate(): Promise<boolean> {
    console.log('🔍 Validating coverage setup...\n');

    // Validate configuration files
    this.validateConfigFiles();
    
    // Validate scripts
    this.validateScripts();
    
    // Validate package.json scripts
    this.validatePackageScripts();
    
    // Validate CI configuration
    this.validateCIConfiguration();
    
    // Validate directory structure
    this.validateDirectoryStructure();
    
    // Validate dependencies
    this.validateDependencies();

    // Display results
    this.displayResults();
    
    // Return overall status
    const hasFailures = this.results.some(r => r.status === 'fail');
    return !hasFailures;
  }

  /**
   * Validate configuration files
   */
  private validateConfigFiles(): void {
    const configFiles = [
      {
        path: 'vitest.config.ts',
        description: 'Vitest configuration with coverage settings'
      },
      {
        path: 'coverage.config.js',
        description: 'Centralized coverage configuration'
      }
    ];

    configFiles.forEach(({ path: filePath, description }) => {
      if (fs.existsSync(filePath)) {
        this.addResult('pass', `Configuration: ${filePath}`, `✅ ${description} exists`);
        
        // Validate content
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (filePath === 'vitest.config.ts') {
            if (content.includes('coverage') && content.includes('thresholds')) {
              this.addResult('pass', `Coverage config in ${filePath}`, 'Coverage configuration found');
            } else {
              this.addResult('warning', `Coverage config in ${filePath}`, 'Coverage configuration may be incomplete');
            }
          }
          
          if (filePath === 'coverage.config.js') {
            if (content.includes('thresholds') && content.includes('qualityGate')) {
              this.addResult('pass', `Quality gates in ${filePath}`, 'Quality gate configuration found');
            } else {
              this.addResult('warning', `Quality gates in ${filePath}`, 'Quality gate configuration may be incomplete');
            }
          }
        } catch (error) {
          this.addResult('warning', `Configuration: ${filePath}`, `Could not validate content: ${error.message}`);
        }
      } else {
        this.addResult('fail', `Configuration: ${filePath}`, `❌ ${description} missing`);
      }
    });
  }

  /**
   * Validate coverage scripts
   */
  private validateScripts(): void {
    const scripts = [
      {
        path: 'scripts/coverage-reporter.ts',
        description: 'Coverage reporter and quality gate checker'
      },
      {
        path: 'scripts/coverage-trend-analyzer.ts',
        description: 'Coverage trend analysis'
      },
      {
        path: 'scripts/coverage-dashboard.ts',
        description: 'Interactive coverage dashboard generator'
      },
      {
        path: 'scripts/post-test-coverage.ts',
        description: 'Post-test coverage processing'
      }
    ];

    scripts.forEach(({ path: scriptPath, description }) => {
      if (fs.existsSync(scriptPath)) {
        this.addResult('pass', `Script: ${scriptPath}`, `✅ ${description} exists`);
        
        // Check if script is executable
        try {
          const content = fs.readFileSync(scriptPath, 'utf8');
          if (content.includes('#!/usr/bin/env node')) {
            this.addResult('pass', `Executable: ${scriptPath}`, 'Script has proper shebang');
          } else {
            this.addResult('warning', `Executable: ${scriptPath}`, 'Script missing shebang line');
          }
        } catch (error) {
          this.addResult('warning', `Script: ${scriptPath}`, `Could not validate script: ${error.message}`);
        }
      } else {
        this.addResult('fail', `Script: ${scriptPath}`, `❌ ${description} missing`);
      }
    });
  }

  /**
   * Validate package.json scripts
   */
  private validatePackageScripts(): void {
    if (!fs.existsSync('package.json')) {
      this.addResult('fail', 'Package.json', '❌ package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        'test:coverage',
        'coverage:check',
        'coverage:report',
        'coverage:trends',
        'coverage:dashboard',
        'coverage:post-test',
        'coverage:quality-gate'
      ];

      requiredScripts.forEach(scriptName => {
        if (scripts[scriptName]) {
          this.addResult('pass', `NPM Script: ${scriptName}`, `✅ Script defined: ${scripts[scriptName]}`);
        } else {
          this.addResult('fail', `NPM Script: ${scriptName}`, `❌ Required script missing`);
        }
      });

    } catch (error) {
      this.addResult('fail', 'Package.json', `❌ Could not parse package.json: ${error.message}`);
    }
  }

  /**
   * Validate CI configuration
   */
  private validateCIConfiguration(): void {
    const ciFile = '.github/workflows/ci.yml';
    
    if (fs.existsSync(ciFile)) {
      this.addResult('pass', 'CI Configuration', '✅ GitHub Actions workflow exists');
      
      try {
        const content = fs.readFileSync(ciFile, 'utf8');
        
        const requiredSteps = [
          'coverage:quality-gate',
          'coverage:check',
          'Upload coverage reports',
          'Comment coverage report on PR'
        ];

        requiredSteps.forEach(step => {
          if (content.includes(step)) {
            this.addResult('pass', `CI Step: ${step}`, '✅ Step found in workflow');
          } else {
            this.addResult('warning', `CI Step: ${step}`, '⚠️ Step may be missing from workflow');
          }
        });

        // Check for quality gate enforcement
        if (content.includes('exit 1') && content.includes('coverage')) {
          this.addResult('pass', 'CI Quality Gate', '✅ Quality gate enforcement found');
        } else {
          this.addResult('warning', 'CI Quality Gate', '⚠️ Quality gate enforcement may be missing');
        }

      } catch (error) {
        this.addResult('warning', 'CI Configuration', `Could not validate CI file: ${error.message}`);
      }
    } else {
      this.addResult('warning', 'CI Configuration', '⚠️ GitHub Actions workflow not found');
    }
  }

  /**
   * Validate directory structure
   */
  private validateDirectoryStructure(): void {
    const requiredDirs = [
      'tests',
      'tests/docs',
      'scripts'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.addResult('pass', `Directory: ${dir}`, `✅ Directory exists`);
      } else {
        this.addResult('warning', `Directory: ${dir}`, `⚠️ Directory missing (will be created as needed)`);
      }
    });

    // Check for documentation
    const docFiles = [
      'tests/docs/coverage-quality-gates.md',
      'tests/docs/coverage-system.md'
    ];

    docFiles.forEach(docFile => {
      if (fs.existsSync(docFile)) {
        this.addResult('pass', `Documentation: ${docFile}`, '✅ Documentation exists');
      } else {
        this.addResult('warning', `Documentation: ${docFile}`, '⚠️ Documentation missing');
      }
    });
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(): void {
    if (!fs.existsSync('package.json')) {
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const devDeps = packageJson.devDependencies || {};

      const requiredDeps = [
        'vitest',
        '@vitest/coverage-v8',
        'tsx'
      ];

      requiredDeps.forEach(dep => {
        if (devDeps[dep]) {
          this.addResult('pass', `Dependency: ${dep}`, `✅ Version: ${devDeps[dep]}`);
        } else {
          this.addResult('fail', `Dependency: ${dep}`, `❌ Required dependency missing`);
        }
      });

    } catch (error) {
      this.addResult('warning', 'Dependencies', `Could not validate dependencies: ${error.message}`);
    }
  }

  /**
   * Add validation result
   */
  private addResult(status: 'pass' | 'fail' | 'warning', component: string, message: string, details?: string): void {
    this.results.push({ component, status, message, details });
  }

  /**
   * Display validation results
   */
  private displayResults(): void {
    console.log('📋 Validation Results:');
    console.log('=====================\n');

    const grouped = this.groupResults();

    Object.entries(grouped).forEach(([category, results]) => {
      console.log(`${category}:`);
      results.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.message}`);
        if (result.details) {
          console.log(`     ${result.details}`);
        }
      });
      console.log('');
    });

    // Summary
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log('📊 Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   📋 Total: ${this.results.length}\n`);

    if (failed > 0) {
      console.log('❌ Coverage setup validation failed. Please address the failed items above.');
    } else if (warnings > 0) {
      console.log('⚠️  Coverage setup validation passed with warnings. Consider addressing the warnings.');
    } else {
      console.log('✅ Coverage setup validation passed! All components are properly configured.');
    }
  }

  /**
   * Group results by category
   */
  private groupResults(): Record<string, ValidationResult[]> {
    const grouped: Record<string, ValidationResult[]> = {};

    this.results.forEach(result => {
      const category = result.component.split(':')[0];
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    });

    return grouped;
  }
}

// CLI interface
async function main() {
  const validator = new CoverageSetupValidator();
  
  try {
    const isValid = await validator.validate();
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CoverageSetupValidator };
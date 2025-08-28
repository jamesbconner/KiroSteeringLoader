import { readdirSync, statSync, unlinkSync, rmSync, existsSync } from 'fs';
import { join, relative } from 'path';

interface CleanupReport {
  filesRemoved: number;
  directoriesRemoved: number;
  spaceFreed: number; // in bytes
  issues: string[];
}

interface TestStructureIssue {
  type: 'orphaned_test' | 'missing_test' | 'empty_test' | 'outdated_mock';
  file: string;
  description: string;
  suggestion: string;
}

/**
 * Handles cleanup and maintenance of test files and structure
 */
export class TestCleanup {
  private readonly maxReportAge = 30; // days
  private readonly maxTempFileAge = 1; // days

  /**
   * Clean up old report files
   */
  cleanupOldReports(maxAge: number = this.maxReportAge): CleanupReport {
    const report: CleanupReport = {
      filesRemoved: 0,
      directoriesRemoved: 0,
      spaceFreed: 0,
      issues: [],
    };

    const reportsDir = 'tests/reports';
    
    if (!existsSync(reportsDir)) {
      return report;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    try {
      const files = readdirSync(reportsDir);
      
      for (const file of files) {
        const filePath = join(reportsDir, file);
        
        try {
          const stats = statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            report.spaceFreed += stats.size;
            unlinkSync(filePath);
            report.filesRemoved++;
            console.log(`🗑️ Cleaned up old report: ${file}`);
          }
        } catch (error) {
          report.issues.push(`Failed to process ${file}: ${error}`);
        }
      }
    } catch (error) {
      report.issues.push(`Failed to access reports directory: ${error}`);
    }

    return report;
  }

  /**
   * Clean up temporary files and directories
   */
  cleanupTempFiles(): CleanupReport {
    const report: CleanupReport = {
      filesRemoved: 0,
      directoriesRemoved: 0,
      spaceFreed: 0,
      issues: [],
    };

    const tempDirs = [
      'tests/temp',
      'coverage',
      '.nyc_output',
      'node_modules/.cache',
    ];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxTempFileAge);
    
    for (const dir of tempDirs) {
      if (!existsSync(dir)) continue;
      
      try {
        const files = readdirSync(dir);
        
        for (const file of files) {
          const filePath = join(dir, file);
          
          try {
            const stats = statSync(filePath);
            
            // Remove temp files or old cache files
            if (file.startsWith('temp-') || 
                file.startsWith('test-') || 
                stats.mtime < cutoffDate) {
              
              report.spaceFreed += this.getDirectorySize(filePath);
              
              if (stats.isDirectory()) {
                rmSync(filePath, { recursive: true, force: true });
                report.directoriesRemoved++;
              } else {
                unlinkSync(filePath);
                report.filesRemoved++;
              }
              
              console.log(`🗑️ Cleaned up temp file/dir: ${relative(process.cwd(), filePath)}`);
            }
          } catch (error) {
            report.issues.push(`Failed to process ${filePath}: ${error}`);
          }
        }
      } catch (error) {
        report.issues.push(`Failed to access directory ${dir}: ${error}`);
      }
    }

    return report;
  }

  /**
   * Validate test file structure and find issues
   */
  validateTestStructure(): TestStructureIssue[] {
    const issues: TestStructureIssue[] = [];
    
    try {
      // Find orphaned test files
      const orphanedTests = this.findOrphanedTestFiles();
      issues.push(...orphanedTests);
      
      // Find missing test files
      const missingTests = this.findMissingTestFiles();
      issues.push(...missingTests);
      
      // Find empty test files
      const emptyTests = this.findEmptyTestFiles();
      issues.push(...emptyTests);
      
      // Find outdated mocks
      const outdatedMocks = this.findOutdatedMocks();
      issues.push(...outdatedMocks);
      
    } catch (error) {
      console.warn('Failed to validate test structure:', error);
    }
    
    return issues;
  }

  /**
   * Generate a cleanup report
   */
  generateCleanupReport(): string {
    const reportCleanup = this.cleanupOldReports();
    const tempCleanup = this.cleanupTempFiles();
    const structureIssues = this.validateTestStructure();
    
    const totalFilesRemoved = reportCleanup.filesRemoved + tempCleanup.filesRemoved;
    const totalSpaceFreed = reportCleanup.spaceFreed + tempCleanup.spaceFreed;
    const totalIssues = [...reportCleanup.issues, ...tempCleanup.issues];
    
    const lines = [
      '# Test Cleanup Report',
      '',
      `📅 **Date:** ${new Date().toLocaleDateString()}`,
      `🗑️ **Files Removed:** ${totalFilesRemoved}`,
      `📁 **Directories Removed:** ${reportCleanup.directoriesRemoved + tempCleanup.directoriesRemoved}`,
      `💾 **Space Freed:** ${this.formatBytes(totalSpaceFreed)}`,
      '',
    ];

    if (structureIssues.length > 0) {
      lines.push('## 🔍 Test Structure Issues');
      lines.push('');
      
      const groupedIssues = this.groupIssuesByType(structureIssues);
      
      for (const [type, issues] of groupedIssues) {
        lines.push(`### ${this.getIssueTypeTitle(type)}`);
        issues.forEach(issue => {
          lines.push(`- **${issue.file}**: ${issue.description}`);
          lines.push(`  - *Suggestion: ${issue.suggestion}*`);
        });
        lines.push('');
      }
    }

    if (totalIssues.length > 0) {
      lines.push('## ⚠️ Cleanup Issues');
      totalIssues.forEach(issue => {
        lines.push(`- ${issue}`);
      });
      lines.push('');
    }

    if (totalFilesRemoved === 0 && structureIssues.length === 0) {
      lines.push('✅ **No cleanup needed** - test structure is clean and organized!');
    } else {
      lines.push('## 💡 Recommendations');
      lines.push('- Run cleanup regularly to maintain test performance');
      lines.push('- Address structure issues to improve test maintainability');
      lines.push('- Consider automating cleanup in CI/CD pipeline');
    }

    return lines.join('\n');
  }

  /**
   * Perform comprehensive cleanup
   */
  performFullCleanup(): CleanupReport {
    console.log('🧹 Starting comprehensive test cleanup...');
    
    const reportCleanup = this.cleanupOldReports();
    const tempCleanup = this.cleanupTempFiles();
    
    const totalReport: CleanupReport = {
      filesRemoved: reportCleanup.filesRemoved + tempCleanup.filesRemoved,
      directoriesRemoved: reportCleanup.directoriesRemoved + tempCleanup.directoriesRemoved,
      spaceFreed: reportCleanup.spaceFreed + tempCleanup.spaceFreed,
      issues: [...reportCleanup.issues, ...tempCleanup.issues],
    };
    
    console.log(`✅ Cleanup completed: ${totalReport.filesRemoved} files removed, ${this.formatBytes(totalReport.spaceFreed)} freed`);
    
    return totalReport;
  }

  private findOrphanedTestFiles(): TestStructureIssue[] {
    const issues: TestStructureIssue[] = [];
    const testFiles = this.findTestFiles('tests');
    const sourceFiles = this.findSourceFiles('src');
    
    for (const testFile of testFiles) {
      const expectedSourceFile = this.getExpectedSourceFile(testFile);
      
      if (!sourceFiles.includes(expectedSourceFile) && !existsSync(expectedSourceFile)) {
        issues.push({
          type: 'orphaned_test',
          file: testFile,
          description: 'Test file exists but corresponding source file is missing',
          suggestion: `Remove test file or create source file at ${expectedSourceFile}`,
        });
      }
    }
    
    return issues;
  }

  private findMissingTestFiles(): TestStructureIssue[] {
    const issues: TestStructureIssue[] = [];
    const sourceFiles = this.findSourceFiles('src');
    const testFiles = this.findTestFiles('tests');
    
    for (const sourceFile of sourceFiles) {
      // Skip certain files that don't need tests
      if (this.shouldSkipTestFile(sourceFile)) continue;
      
      const expectedTestFile = this.getExpectedTestFile(sourceFile);
      
      if (!testFiles.includes(expectedTestFile) && !existsSync(expectedTestFile)) {
        issues.push({
          type: 'missing_test',
          file: sourceFile,
          description: 'Source file exists but no corresponding test file found',
          suggestion: `Create test file at ${expectedTestFile}`,
        });
      }
    }
    
    return issues;
  }

  private findEmptyTestFiles(): TestStructureIssue[] {
    const issues: TestStructureIssue[] = [];
    const testFiles = this.findTestFiles('tests');
    
    for (const testFile of testFiles) {
      try {
        const stats = statSync(testFile);
        
        // Consider files under 100 bytes as potentially empty
        if (stats.size < 100) {
          issues.push({
            type: 'empty_test',
            file: testFile,
            description: 'Test file appears to be empty or minimal',
            suggestion: 'Add meaningful tests or remove if not needed',
          });
        }
      } catch (error) {
        // File might not exist anymore
      }
    }
    
    return issues;
  }

  private findOutdatedMocks(): TestStructureIssue[] {
    const issues: TestStructureIssue[] = [];
    const mockFiles = this.findMockFiles('tests/mocks');
    
    for (const mockFile of mockFiles) {
      try {
        const stats = statSync(mockFile);
        const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        // Flag mocks not updated in 90 days
        if (daysSinceModified > 90) {
          issues.push({
            type: 'outdated_mock',
            file: mockFile,
            description: `Mock file hasn't been updated in ${Math.round(daysSinceModified)} days`,
            suggestion: 'Review if mock is still needed and update if necessary',
          });
        }
      } catch (error) {
        // File might not exist anymore
      }
    }
    
    return issues;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!existsSync(dir)) return files;
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...this.findTestFiles(fullPath));
        } else if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  private findSourceFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!existsSync(dir)) return files;
    
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
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  private findMockFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!existsSync(dir)) return files;
    
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          files.push(...this.findMockFiles(fullPath));
        } else if (entry.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  private getExpectedSourceFile(testFile: string): string {
    return testFile
      .replace(/tests\/(unit|integration|e2e)\//, 'src/')
      .replace(/\.(test|spec)\.ts$/, '.ts');
  }

  private getExpectedTestFile(sourceFile: string): string {
    return sourceFile
      .replace('src/', 'tests/unit/')
      .replace('.ts', '.test.ts');
  }

  private shouldSkipTestFile(sourceFile: string): boolean {
    const skipPatterns = [
      'index.ts',
      'types.ts',
      'constants.ts',
      '.d.ts',
    ];
    
    return skipPatterns.some(pattern => sourceFile.includes(pattern));
  }

  private getDirectorySize(dirPath: string): number {
    let size = 0;
    
    try {
      const stats = statSync(dirPath);
      
      if (stats.isFile()) {
        return stats.size;
      }
      
      if (stats.isDirectory()) {
        const files = readdirSync(dirPath);
        
        for (const file of files) {
          size += this.getDirectorySize(join(dirPath, file));
        }
      }
    } catch (error) {
      // File/directory might not exist or be accessible
    }
    
    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private groupIssuesByType(issues: TestStructureIssue[]): Map<string, TestStructureIssue[]> {
    const groups = new Map<string, TestStructureIssue[]>();
    
    for (const issue of issues) {
      if (!groups.has(issue.type)) {
        groups.set(issue.type, []);
      }
      groups.get(issue.type)!.push(issue);
    }
    
    return groups;
  }

  private getIssueTypeTitle(type: string): string {
    const titles = {
      orphaned_test: '🔗 Orphaned Test Files',
      missing_test: '❓ Missing Test Files',
      empty_test: '📄 Empty Test Files',
      outdated_mock: '⏰ Outdated Mock Files',
    };
    
    return titles[type as keyof typeof titles] || type;
  }
}
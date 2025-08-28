/**
 * Tests for file system mocking utilities
 * Verifies that the file system mocks work correctly and provide type safety
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  fileSystemMockUtils, 
  fileSystemScenarios,
  fileSystemTestHelpers,
  commonTestScenarios,
  pathMockUtils,
  pathScenarios
} from '../mocks/setup';

describe('File System Mocks', () => {
  beforeEach(() => {
    fileSystemMockUtils.reset();
    pathMockUtils.reset();
  });

  describe('Basic File System Operations', () => {
    it('should mock fs.existsSync correctly', () => {
      // Setup
      fileSystemMockUtils.setupFileSystem({
        files: { '/test/file.txt': 'content' },
        directories: ['/test/dir']
      });

      // Test file exists
      expect(fileSystemMockUtils.exists('/test/file.txt')).toBe(true);
      
      // Test directory exists
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(true);
      
      // Test non-existent path
      expect(fileSystemMockUtils.exists('/nonexistent')).toBe(false);
    });

    it('should mock fs.readdirSync correctly', () => {
      // Setup
      fileSystemMockUtils.setupFileSystem({
        files: {
          '/test/dir/file1.txt': 'content1',
          '/test/dir/file2.md': 'content2'
        },
        directories: ['/test/dir', '/test/dir/subdir']
      });

      // Test reading directory
      const files = fileSystemMockUtils.listFiles();
      expect(files).toContain('/test/dir/file1.txt');
      expect(files).toContain('/test/dir/file2.md');
      
      const dirs = fileSystemMockUtils.listDirectories();
      expect(dirs).toContain('/test/dir');
      expect(dirs).toContain('/test/dir/subdir');
    });

    it('should mock fs.readFileSync correctly', () => {
      // Setup
      const content = 'Test file content';
      fileSystemMockUtils.setupFileSystem({
        files: { '/test/file.txt': content }
      });

      // Test reading file
      const readContent = fileSystemMockUtils.getFileContent('/test/file.txt');
      expect(readContent).toBe(content);
      
      // Test reading non-existent file
      const nonExistentContent = fileSystemMockUtils.getFileContent('/nonexistent.txt');
      expect(nonExistentContent).toBeUndefined();
    });

    it('should mock fs.writeFileSync correctly', () => {
      // Setup
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test']
      });

      // Test writing file
      fileSystemMockUtils.addFile('/test/newfile.txt', 'new content');
      
      expect(fileSystemMockUtils.exists('/test/newfile.txt')).toBe(true);
      expect(fileSystemMockUtils.getFileContent('/test/newfile.txt')).toBe('new content');
    });

    it('should mock fs.mkdirSync correctly', () => {
      // Test creating directory
      fileSystemMockUtils.addDirectory('/test/newdir');
      
      expect(fileSystemMockUtils.exists('/test/newdir')).toBe(true);
      expect(fileSystemMockUtils.listDirectories()).toContain('/test/newdir');
    });
  });

  describe('Path Operations', () => {
    it('should mock path.join correctly', () => {
      pathMockUtils.setPlatform('posix');
      
      const joined = pathMockUtils.createPath('test', 'path', 'file.txt');
      expect(joined).toBe('test/path/file.txt');
    });

    it('should handle Windows paths correctly', () => {
      pathMockUtils.setPlatform('win32');
      
      const windowsPath = pathMockUtils.toPlatformPath('/test/path');
      expect(windowsPath).toBe('\\test\\path');
    });

    it('should handle cross-platform path scenarios', () => {
      // Test POSIX paths
      pathMockUtils.setPlatform('posix');
      expect(pathMockUtils.toPlatformPath('test/path')).toBe('test/path');
      
      // Test Windows paths
      pathMockUtils.setPlatform('win32');
      expect(pathMockUtils.toPlatformPath('test/path')).toBe('test\\path');
    });
  });

  describe('File System Scenarios', () => {
    it('should set up templates directory scenario correctly', () => {
      fileSystemScenarios.templatesDirectory('/test/templates');
      
      expect(fileSystemMockUtils.exists('/test/templates')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/template1.md')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/template2.md')).toBe(true);
      expect(fileSystemMockUtils.getFileContent('/test/templates/template1.md')).toContain('Template 1');
    });

    it('should set up empty templates directory scenario correctly', () => {
      fileSystemScenarios.emptyTemplatesDirectory('/test/empty');
      
      expect(fileSystemMockUtils.exists('/test/empty')).toBe(true);
      
      // Should have no files in the directory
      const files = fileSystemMockUtils.listFiles();
      const templatesFiles = files.filter(f => f.startsWith('/test/empty/'));
      expect(templatesFiles).toHaveLength(0);
    });

    it('should set up workspace with steering scenario correctly', () => {
      fileSystemScenarios.workspaceWithSteering('/test/workspace');
      
      expect(fileSystemMockUtils.exists('/test/workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro/steering')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro/steering/existing-template.md')).toBe(true);
    });

    it('should set up workspace without kiro scenario correctly', () => {
      fileSystemScenarios.workspaceWithoutKiro('/test/workspace');
      
      expect(fileSystemMockUtils.exists('/test/workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro')).toBe(false);
    });
  });

  describe('Test Helpers', () => {
    it('should set up successful template loading scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.successfulTemplateLoading);
      
      // Verify workspace setup
      expect(fileSystemMockUtils.exists('/test/workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro/steering')).toBe(true);
      
      // Verify templates directory setup
      expect(fileSystemMockUtils.exists('/test/templates')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/template1.md')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/template2.md')).toBe(true);
    });

    it('should set up no templates path scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.noTemplatesPath);
      
      expect(fileSystemMockUtils.exists('/test/workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro')).toBe(false);
    });

    it('should set up templates path not found scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.templatesPathNotFound);
      
      expect(fileSystemMockUtils.exists('/test/workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('/nonexistent/path')).toBe(false);
    });

    it('should set up empty templates directory scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.emptyTemplatesDirectory);
      
      expect(fileSystemMockUtils.exists('/test/templates')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/readme.txt')).toBe(true);
      
      // Should have no .md files
      const files = fileSystemMockUtils.listFiles();
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles).toHaveLength(0);
    });

    it('should set up Windows platform scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.windowsPlatform);
      
      expect(pathMockUtils.getPlatform()).toBe('win32');
      
      // Paths are normalized internally, so check both formats
      expect(fileSystemMockUtils.exists('C:/Users/Test/Workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('C:/Users/Test/Templates')).toBe(true);
      // Also verify that Windows-style paths work
      expect(fileSystemMockUtils.exists('C:\\Users\\Test\\Workspace')).toBe(true);
      expect(fileSystemMockUtils.exists('C:\\Users\\Test\\Templates')).toBe(true);
    });

    it('should set up complex templates structure scenario', () => {
      fileSystemTestHelpers.setupTestScenario(commonTestScenarios.complexTemplatesStructure);
      
      // Verify main templates
      expect(fileSystemMockUtils.exists('/test/templates/basic-template.md')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/advanced-template.md')).toBe(true);
      
      // Verify nested templates
      expect(fileSystemMockUtils.exists('/test/templates/category1/nested-template.md')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/category2/another-nested.md')).toBe(true);
      
      // Verify non-markdown files
      expect(fileSystemMockUtils.exists('/test/templates/readme.txt')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/templates/config.json')).toBe(true);
      
      // Verify existing templates in workspace
      expect(fileSystemMockUtils.exists('/test/workspace/.kiro/steering/existing.md')).toBe(true);
    });
  });

  describe('File System State Management', () => {
    it('should reset file system state correctly', () => {
      // Add some files and directories
      fileSystemMockUtils.setupFileSystem({
        files: { '/test/file.txt': 'content' },
        directories: ['/test/dir']
      });
      
      expect(fileSystemMockUtils.exists('/test/file.txt')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(true);
      
      // Reset
      fileSystemMockUtils.reset();
      
      expect(fileSystemMockUtils.exists('/test/file.txt')).toBe(false);
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(false);
    });

    it('should add and remove files correctly', () => {
      fileSystemMockUtils.addDirectory('/test');
      fileSystemMockUtils.addFile('/test/file.txt', 'content');
      
      expect(fileSystemMockUtils.exists('/test/file.txt')).toBe(true);
      expect(fileSystemMockUtils.getFileContent('/test/file.txt')).toBe('content');
      
      fileSystemMockUtils.removeFile('/test/file.txt');
      expect(fileSystemMockUtils.exists('/test/file.txt')).toBe(false);
    });

    it('should add and remove directories correctly', () => {
      fileSystemMockUtils.addDirectory('/test/dir');
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(true);
      
      fileSystemMockUtils.removeDirectory('/test/dir');
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(false);
    });

    it('should handle nested directory removal correctly', () => {
      fileSystemMockUtils.setupFileSystem({
        files: {
          '/test/dir/file1.txt': 'content1',
          '/test/dir/subdir/file2.txt': 'content2'
        },
        directories: ['/test/dir', '/test/dir/subdir']
      });
      
      expect(fileSystemMockUtils.exists('/test/dir/file1.txt')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/dir/subdir/file2.txt')).toBe(true);
      
      fileSystemMockUtils.removeDirectory('/test/dir');
      
      expect(fileSystemMockUtils.exists('/test/dir')).toBe(false);
      expect(fileSystemMockUtils.exists('/test/dir/file1.txt')).toBe(false);
      expect(fileSystemMockUtils.exists('/test/dir/subdir/file2.txt')).toBe(false);
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should handle POSIX paths correctly', () => {
      pathMockUtils.setPlatform('posix');
      
      fileSystemMockUtils.setupFileSystem({
        files: { '/home/user/templates/template.md': 'content' }
      });
      
      expect(fileSystemMockUtils.exists('/home/user/templates/template.md')).toBe(true);
    });

    it('should handle Windows paths correctly', () => {
      pathMockUtils.setPlatform('win32');
      
      fileSystemMockUtils.setupFileSystem({
        files: { 'C:\\Users\\Test\\Templates\\template.md': 'content' }
      });
      
      expect(fileSystemMockUtils.exists('C:\\Users\\Test\\Templates\\template.md')).toBe(true);
    });

    it('should normalize paths consistently', () => {
      // Test that both forward and backward slashes work
      fileSystemMockUtils.setupFileSystem({
        files: { '/test/path/file.txt': 'content' }
      });
      
      expect(fileSystemMockUtils.exists('/test/path/file.txt')).toBe(true);
      expect(fileSystemMockUtils.exists('\\test\\path\\file.txt')).toBe(true);
    });
  });
});
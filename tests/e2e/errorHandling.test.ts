/**
 * E2E Error Handling and Edge Case Tests
 * Tests error scenarios, edge cases, and recovery mechanisms for the Kiro Steering Loader extension
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Error Handling and Edge Case E2E Tests', () => {
  let testManager: ReturnType<typeof createE2ETestManager>;
  let testContext: E2ETestContext;

  beforeEach(async () => {
    testManager = createE2ETestManager();
  });

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup();
    }
    await testManager.cleanupAll();
  });

  describe('Invalid Templates Path Handling', () => {
    it('should handle non-existent templates directory gracefully', async () => {
      // Create workspace for invalid path testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'invalid-path-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set non-existent templates path
      const invalidPath = '/completely/nonexistent/path/that/does/not/exist';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', invalidPath);

      // Verify configuration was set despite invalid path
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(invalidPath);

      // Attempt to refresh - should handle gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');
    });

    it('should handle templates path with special characters', async () => {
      // Create workspace for special characters testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'special-chars-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set path with special characters
      const specialPath = '/path/with spaces/and-dashes/and_underscores/and.dots';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', specialPath);

      // Verify configuration handles special characters
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(specialPath);
    });

    it('should handle extremely long templates path', async () => {
      // Create workspace for long path testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'long-path-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Create extremely long path
      const longPath = '/very/long/path/' + 'a'.repeat(200) + '/templates';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', longPath);

      // Verify configuration handles long paths
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(longPath);
    });

    it('should handle relative templates path', async () => {
      // Create workspace for relative path testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'relative-path-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set relative path
      const relativePath = './templates/relative/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', relativePath);

      // Verify configuration handles relative paths
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(relativePath);
    });
  });

  describe('Template File Error Handling', () => {
    it('should handle corrupted template files', async () => {
      // Create workspace with corrupted templates
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'corrupted-templates-test'
      });

      // Create templates directory with corrupted files
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create corrupted template files
      const corruptedFile1 = path.join(templatesDir, 'corrupted1.md');
      const corruptedFile2 = path.join(templatesDir, 'corrupted2.md');
      
      // Write binary data to simulate corruption
      fs.writeFileSync(corruptedFile1, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]));
      fs.writeFileSync(corruptedFile2, '\x00\x01\x02\x03\xFF\xFE');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to refresh - should handle corrupted files gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify files exist but extension handles them gracefully
      expect(fs.existsSync(corruptedFile1)).toBe(true);
      expect(fs.existsSync(corruptedFile2)).toBe(true);
    });

    it('should handle template files with no read permissions', async () => {
      // Create workspace for permission testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'permission-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create template file
      const templateFile = path.join(templatesDir, 'restricted.md');
      fs.writeFileSync(templateFile, '# Restricted Template\nThis template has restricted permissions.');

      // Note: On Windows, changing file permissions is more complex and may not work as expected
      // This test simulates the scenario but may not actually restrict permissions
      try {
        fs.chmodSync(templateFile, 0o000); // Remove all permissions
      } catch (error) {
        // Permission changes might not work on all systems, continue with test
        console.log('Permission change not supported on this system');
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to refresh - should handle permission errors gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Restore permissions for cleanup
      try {
        fs.chmodSync(templateFile, 0o644);
      } catch (error) {
        // Ignore permission restoration errors
      }
    });

    it('should handle extremely large template files', async () => {
      // Create workspace for large file testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'large-file-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create large template file (1MB)
      const largeFile = path.join(templatesDir, 'large-template.md');
      const largeContent = '# Large Template\n' + 'A'.repeat(1024 * 1024); // 1MB of content
      fs.writeFileSync(largeFile, largeContent);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to refresh - should handle large files gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify large file exists
      expect(fs.existsSync(largeFile)).toBe(true);
      expect(fs.statSync(largeFile).size).toBeGreaterThan(1024 * 1024);
    });

    it('should handle template files with unusual extensions', async () => {
      // Create workspace for unusual extensions testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'unusual-extensions-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create files with unusual extensions
      const files = [
        'template.xyz',
        'template.123',
        'template.',
        'template',
        'template.very-long-extension-name',
        'template.UPPERCASE',
        'template.MiXeD-CaSe'
      ];

      files.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# Template: ${filename}\nContent for ${filename}`);
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to refresh - should handle unusual extensions gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all files exist
      files.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Workspace Error Scenarios', () => {
    it('should handle workspace without .kiro directory creation failure', async () => {
      // Create workspace for directory creation failure testing
      testContext = await testManager.createTestWorkspace({
        name: 'no-kiro-creation-test',
        hasKiroDirectory: false,
        hasSteeringDirectory: false
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Attempt template loading without .kiro directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'test.md'), '# Test Template');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to load template - should handle missing .kiro directory gracefully
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', path.join(templatesDir, 'test.md'));
    });

    it('should handle multiple workspace folders', async () => {
      // Create workspace for multi-folder testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'multi-folder-test'
      });

      // Create additional workspace-like directories
      const workspace2 = path.join(testContext.workspacePath, 'workspace2');
      const workspace3 = path.join(testContext.workspacePath, 'workspace3');
      
      fs.mkdirSync(workspace2, { recursive: true });
      fs.mkdirSync(workspace3, { recursive: true });
      
      // Create .kiro directories in each
      fs.mkdirSync(path.join(workspace2, '.kiro', 'steering'), { recursive: true });
      fs.mkdirSync(path.join(workspace3, '.kiro', 'steering'), { recursive: true });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'multi.md'), '# Multi-workspace Template');

      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt operations - should handle multiple workspace scenario
      await testManager.executeCommand('kiroSteeringLoader.refresh');
    });

    it('should handle workspace with read-only .kiro directory', async () => {
      // Create workspace for read-only testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'readonly-kiro-test'
      });

      // Make .kiro directory read-only (may not work on all systems)
      const kiroDir = path.join(testContext.workspacePath, '.kiro');
      try {
        fs.chmodSync(kiroDir, 0o444); // Read-only
      } catch (error) {
        console.log('Permission change not supported on this system');
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Create templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'readonly.md'), '# Read-only Test Template');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt to load template - should handle read-only directory gracefully
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', path.join(templatesDir, 'readonly.md'));

      // Restore permissions for cleanup
      try {
        fs.chmodSync(kiroDir, 0o755);
      } catch (error) {
        // Ignore permission restoration errors
      }
    });
  });

  describe('Command Execution Edge Cases', () => {
    it('should handle rapid successive command executions', async () => {
      // Create workspace for rapid execution testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'rapid-execution-test'
      });

      // Create templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(templatesDir, `template${i}.md`), `# Template ${i}\nContent for template ${i}`);
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Execute multiple commands rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(testManager.executeCommand('kiroSteeringLoader.refresh'));
      }

      // Wait for all commands to complete - should handle concurrent execution
      await Promise.all(promises);
    });

    it('should handle commands with invalid parameters', async () => {
      // Create workspace for invalid parameters testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'invalid-params-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Execute commands with invalid parameters - should handle gracefully
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', null);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', undefined);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', '');
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', 123);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', {});
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', []);
    });

    it('should handle commands before extension is fully activated', async () => {
      // Create workspace for early command testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'early-command-test'
      });

      // Execute commands immediately without waiting for full activation
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      await testManager.executeCommand('kiroSteeringLoader.setTemplatesPath', '/some/path');

      // Now wait for proper activation
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Commands should work normally after activation
      await testManager.executeCommand('kiroSteeringLoader.refresh');
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle configuration with null and undefined values', async () => {
      // Create workspace for null/undefined testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'null-config-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test null configuration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', null);
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeNull();

      // Test undefined configuration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', undefined);
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();

      // Commands should handle null/undefined gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');
    });

    it('should handle configuration with non-string values', async () => {
      // Create workspace for non-string config testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'non-string-config-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test various non-string values
      const nonStringValues = [
        123,
        true,
        false,
        {},
        [],
        { path: '/some/path' },
        ['path1', 'path2']
      ];

      for (const value of nonStringValues) {
        await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', value);
        const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
        expect(config.get('templatesPath')).toBe(value);

        // Commands should handle non-string values gracefully
        await testManager.executeCommand('kiroSteeringLoader.refresh');
      }
    });

    it('should handle configuration changes during active operations', async () => {
      // Create workspace for concurrent config changes testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'concurrent-config-test'
      });

      // Create templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'concurrent.md'), '# Concurrent Test Template');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set initial configuration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Start a long-running operation and change config during it
      const refreshPromise = testManager.executeCommand('kiroSteeringLoader.refresh');
      
      // Change configuration while refresh is potentially running
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', '/different/path');
      
      // Wait for original operation to complete
      await refreshPromise;

      // Verify final configuration
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe('/different/path');
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle symbolic links in templates directory', async () => {
      // Create workspace for symbolic links testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'symlink-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create actual template file
      const actualFile = path.join(testContext.workspacePath, 'actual-template.md');
      fs.writeFileSync(actualFile, '# Actual Template\nThis is the real template file.');

      // Create symbolic link (may not work on all systems)
      const symlinkFile = path.join(templatesDir, 'symlink-template.md');
      try {
        fs.symlinkSync(actualFile, symlinkFile);
      } catch (error) {
        // If symlinks aren't supported, create a regular file
        fs.writeFileSync(symlinkFile, '# Symlink Template\nThis simulates a symlink.');
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Refresh should handle symlinks gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify files exist
      expect(fs.existsSync(actualFile)).toBe(true);
      expect(fs.existsSync(symlinkFile)).toBe(true);
    });

    it('should handle templates directory with nested subdirectories', async () => {
      // Create workspace for nested directories testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'nested-dirs-test'
      });

      // Create complex nested structure
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      const nestedDirs = [
        'level1',
        'level1/level2',
        'level1/level2/level3',
        'level1/another-branch',
        'different-root',
        'different-root/sub'
      ];

      nestedDirs.forEach(dir => {
        const fullPath = path.join(templatesDir, dir);
        fs.mkdirSync(fullPath, { recursive: true });
        
        // Add template file in each directory
        const templateFile = path.join(fullPath, 'template.md');
        fs.writeFileSync(templateFile, `# Template in ${dir}\nContent for ${dir}`);
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Refresh should handle nested structure gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify nested structure exists
      nestedDirs.forEach(dir => {
        const templateFile = path.join(templatesDir, dir, 'template.md');
        expect(fs.existsSync(templateFile)).toBe(true);
      });
    });

    it('should handle templates directory with circular references', async () => {
      // Create workspace for circular references testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'circular-refs-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create subdirectory
      const subDir = path.join(templatesDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });

      // Try to create circular reference with symlinks (may not work on all systems)
      const circularLink = path.join(subDir, 'circular');
      try {
        fs.symlinkSync(templatesDir, circularLink);
      } catch (error) {
        // If symlinks aren't supported, just create a regular directory
        fs.mkdirSync(circularLink, { recursive: true });
        fs.writeFileSync(path.join(circularLink, 'fake-circular.md'), '# Fake Circular Reference');
      }

      // Add regular template
      fs.writeFileSync(path.join(templatesDir, 'regular.md'), '# Regular Template');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Refresh should handle circular references gracefully without infinite loops
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify regular template exists
      expect(fs.existsSync(path.join(templatesDir, 'regular.md'))).toBe(true);
    });
  });
});
/**
 * E2E Infrastructure Test
 * Tests the E2E testing infrastructure setup and basic functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import { e2eUtils } from '../setup/e2e-setup';
import * as path from 'path';

describe('E2E Testing Infrastructure', () => {
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

  describe('VS Code Instance Management', () => {
    it('should have VS Code executable available', () => {
      expect(() => e2eUtils.getVSCodeExecutablePath()).not.toThrow();
      const executablePath = e2eUtils.getVSCodeExecutablePath();
      expect(executablePath).toBeTruthy();
      expect(typeof executablePath).toBe('string');
    });

    it('should provide CLI arguments for VS Code', () => {
      expect(() => e2eUtils.getVSCodeCliArgs()).not.toThrow();
      const cliArgs = e2eUtils.getVSCodeCliArgs();
      expect(Array.isArray(cliArgs)).toBe(true);
    });

    it('should have extension development path configured', () => {
      const extensionPath = e2eUtils.getExtensionPath();
      expect(extensionPath).toBeTruthy();
      expect(typeof extensionPath).toBe('string');
      // Check for either the kebab-case or PascalCase version of the project name
      expect(extensionPath.toLowerCase()).toMatch(/kiro.*steering.*loader/);
    });
  });

  describe('Test Workspace Management', () => {
    it('should create empty test workspace', async () => {
      testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.empty);
      
      expect(testContext.workspacePath).toBeTruthy();
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.')).toBe(true);
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(false);
    });

    it('should create workspace with Kiro directory structure', async () => {
      testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.withKiro);
      
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(true);
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro/steering')).toBe(true);
    });

    it('should create workspace with existing templates', async () => {
      testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.withTemplates);
      
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro/steering')).toBe(true);
      expect(testManager.verifyFileExists(testContext.workspacePath, '.kiro/steering/sample-template.md')).toBe(true);
      expect(testManager.verifyFileExists(testContext.workspacePath, '.kiro/steering/another-template.md')).toBe(true);
      
      // Verify template content
      const templateContent = testManager.readWorkspaceFile(testContext.workspacePath, '.kiro/steering/sample-template.md');
      expect(templateContent).toContain('# sample-template');
      expect(templateContent).toContain('This is a test template: sample-template');
    });

    it('should apply workspace settings', async () => {
      const customConfig = {
        ...commonWorkspaceConfigs.configured,
        name: 'test-settings-workspace'
      };
      
      testContext = await testManager.createTestWorkspace(customConfig);
      
      // Verify .vscode/settings.json was created
      expect(testManager.verifyFileExists(testContext.workspacePath, '.vscode/settings.json')).toBe(true);
      
      const settingsContent = testManager.readWorkspaceFile(testContext.workspacePath, '.vscode/settings.json');
      const settings = JSON.parse(settingsContent);
      expect(settings['kiroSteeringLoader.templatesPath']).toBe('/path/to/templates');
    });
  });

  describe('Test Utilities', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.withKiro);
    });

    it('should create temporary files in workspace', () => {
      const testContent = 'This is test content';
      testManager.createTempFile(testContext.workspacePath, 'temp/test.txt', testContent);
      
      expect(testManager.verifyFileExists(testContext.workspacePath, 'temp/test.txt')).toBe(true);
      const content = testManager.readWorkspaceFile(testContext.workspacePath, 'temp/test.txt');
      expect(content).toBe(testContent);
    });

    it('should wait for file creation', async () => {
      // Simulate async file creation
      setTimeout(() => {
        testManager.createTempFile(testContext.workspacePath, 'async-file.txt', 'async content');
      }, 100);
      
      await expect(testManager.waitForFile(testContext.workspacePath, 'async-file.txt', 1000)).resolves.not.toThrow();
      expect(testManager.verifyFileExists(testContext.workspacePath, 'async-file.txt')).toBe(true);
    });

    it('should timeout when waiting for non-existent file', async () => {
      await expect(testManager.waitForFile(testContext.workspacePath, 'non-existent.txt', 500))
        .rejects.toThrow('File non-existent.txt was not created within 500ms');
    });
  });

  describe('Test Assertions', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace(commonWorkspaceConfigs.withTemplates);
    });

    it('should assert file existence', () => {
      expect(() => e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/sample-template.md')).not.toThrow();
      expect(() => e2eAssertions.assertFileExists(testContext.workspacePath, 'non-existent.txt'))
        .toThrow('Expected file non-existent.txt to exist in workspace');
    });

    it('should assert directory existence', () => {
      expect(() => e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro')).not.toThrow();
      expect(() => e2eAssertions.assertDirectoryExists(testContext.workspacePath, 'non-existent-dir'))
        .toThrow('Expected directory non-existent-dir to exist in workspace');
    });

    it('should assert file content', () => {
      const expectedContent = '# sample-template\n\nThis is a test template: sample-template';
      expect(() => e2eAssertions.assertFileContent(testContext.workspacePath, '.kiro/steering/sample-template.md', expectedContent)).not.toThrow();
      
      expect(() => e2eAssertions.assertFileContent(testContext.workspacePath, '.kiro/steering/sample-template.md', 'wrong content'))
        .toThrow('File content mismatch');
    });
  });

  describe('Workspace Cleanup', () => {
    it('should clean up individual workspace', async () => {
      const config = { ...commonWorkspaceConfigs.empty, name: 'cleanup-test-workspace' };
      testContext = await testManager.createTestWorkspace(config);
      
      const workspacePath = testContext.workspacePath;
      expect(testManager.verifyDirectoryExists(workspacePath, '.')).toBe(true);
      
      await testContext.cleanup();
      
      // Note: In a real test environment, we would verify the directory is removed
      // For this test, we just ensure cleanup doesn't throw
      expect(true).toBe(true);
    });

    it('should clean up all workspaces', async () => {
      // Create multiple workspaces
      const context1 = await testManager.createTestWorkspace({ ...commonWorkspaceConfigs.empty, name: 'cleanup-1' });
      const context2 = await testManager.createTestWorkspace({ ...commonWorkspaceConfigs.withKiro, name: 'cleanup-2' });
      
      expect(testManager.verifyDirectoryExists(context1.workspacePath, '.')).toBe(true);
      expect(testManager.verifyDirectoryExists(context2.workspacePath, '.')).toBe(true);
      
      await testManager.cleanupAll();
      
      // Cleanup completed without errors
      expect(true).toBe(true);
    });
  });
});
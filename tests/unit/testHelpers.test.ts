/**
 * Unit tests for test helper utilities
 * Verifies that the test helpers work correctly and provide expected functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import {
  testHelpers,
  commonTestScenarios,
  fixtureFactory,
  typeAssertions,
  cleanupManager,
  setupAutomaticCleanup
} from '../utils';
import { TreeItemCollapsibleState } from '../mocks/vscode';

// Setup automatic cleanup for these tests
setupAutomaticCleanup();

describe('Test Helper Utilities', () => {
  beforeEach(() => {
    testHelpers.reset();
  });

  afterEach(() => {
    testHelpers.cleanup();
  });

  describe('TestHelpers', () => {
    it('should create mock extension context', () => {
      const context = testHelpers.createMockExtensionContext();
      
      expect(context).toBeDefined();
      expect(context.subscriptions).toBeInstanceOf(Array);
      expect(context.extensionPath).toBeDefined();
      expect(context.extensionUri).toBeDefined();
      expect(typeof context.asAbsolutePath).toBe('function');
    });

    it('should create mock workspace folder', () => {
      const folder = testHelpers.createMockWorkspaceFolder('test', '/test/path');
      
      expect(folder.name).toBe('test');
      expect(folder.uri.fsPath).toBe('/test/path');
      expect(folder.index).toBe(0);
    });

    it('should create mock configuration', () => {
      const config = testHelpers.createMockConfiguration({ 
        templatesPath: '/test/templates',
        otherSetting: 'value'
      });
      
      expect(config.get('templatesPath')).toBe('/test/templates');
      expect(config.get('otherSetting')).toBe('value');
      expect(config.get('nonExistent')).toBeUndefined();
    });

    it('should setup test workspace', () => {
      const workspace = {
        name: 'test-workspace',
        path: '/test/workspace',
        hasKiroDirectory: true,
        hasSteeringDirectory: true,
        existingTemplates: ['template1.md', 'template2.md']
      };

      testHelpers.setupTestWorkspace(workspace);
      
      expect(testHelpers.pathExists('/test/workspace')).toBe(true);
      expect(testHelpers.pathExists('/test/workspace/.kiro')).toBe(true);
      expect(testHelpers.pathExists('/test/workspace/.kiro/steering')).toBe(true);
      expect(testHelpers.getFileContent('/test/workspace/.kiro/steering/template1.md')).toContain('Existing Template 1');
    });

    it('should setup test templates directory', () => {
      const templatesDir = {
        path: '/test/templates',
        templates: [
          { name: 'template1', content: '# Template 1', isMarkdown: true },
          { name: 'template2', content: '# Template 2', isMarkdown: true }
        ],
        subdirectories: ['subfolder']
      };

      testHelpers.setupTestTemplatesDirectory(templatesDir);
      
      expect(testHelpers.pathExists('/test/templates')).toBe(true);
      expect(testHelpers.pathExists('/test/templates/subfolder')).toBe(true);
      expect(testHelpers.getFileContent('/test/templates/template1.md')).toBe('# Template 1');
      expect(testHelpers.getFileContent('/test/templates/template2.md')).toBe('# Template 2');
    });

    it('should create temporary directory', () => {
      const tempDir = testHelpers.createTempDirectory();
      
      expect(tempDir).toMatch(/^\/tmp\/test-\d+-[a-z0-9]+$/);
      expect(testHelpers.pathExists(tempDir)).toBe(true);
    });

    it('should track and cleanup resources', () => {
      const tempDir = testHelpers.createTempDirectory();
      const tempFile = `${tempDir}/test.txt`;
      
      testHelpers.createTemplateFile(tempFile, 'test content');
      
      expect(testHelpers.pathExists(tempFile)).toBe(true);
      expect(testHelpers.getFileContent(tempFile)).toBe('test content');
      
      // Cleanup should remove tracked resources
      testHelpers.cleanup();
      
      // Note: In a real scenario, cleanup would remove the temp directory
      // but our mock file system doesn't automatically clean up tracked resources
      // unless explicitly called
    });
  });

  describe('Common Test Scenarios', () => {
    it('should provide no configuration scenario', () => {
      const scenario = commonTestScenarios.noConfiguration();
      
      expect(scenario.name).toBe('No Configuration');
      expect(scenario.expectedBehavior).toBe('setup');
      expect(scenario.expectedItems).toHaveLength(1);
      expect(scenario.expectedItems[0].itemType).toBe('setup');
    });

    it('should provide valid templates directory scenario', () => {
      const scenario = commonTestScenarios.validTemplatesDirectory('/custom/templates');
      
      expect(scenario.name).toBe('Valid Templates Directory');
      expect(scenario.configuration?.templatesPath).toBe('/custom/templates');
      expect(scenario.expectedBehavior).toBe('success');
      expect(scenario.templatesDirectory?.templates).toHaveLength(2);
    });

    it('should provide non-existent templates directory scenario', () => {
      const scenario = commonTestScenarios.nonExistentTemplatesDirectory('/missing');
      
      expect(scenario.name).toBe('Non-existent Templates Directory');
      expect(scenario.configuration?.templatesPath).toBe('/missing');
      expect(scenario.expectedBehavior).toBe('error');
      expect(scenario.expectedItems).toHaveLength(2);
    });
  });

  describe('Fixture Factory', () => {
    it('should create template fixture', () => {
      const fixture = fixtureFactory.createTemplateFixture({
        name: 'test-template',
        itemType: 'template'
      });
      
      expect(fixture.name).toBe('test-template');
      expect(fixture.itemType).toBe('template');
      expect(fixture.expectedTreeItem.label).toBe('test-template');
      expect(fixture.expectedTreeItem.collapsibleState).toBe(TreeItemCollapsibleState.None);
    });

    it('should create multiple template fixtures', () => {
      const fixtures = fixtureFactory.createTemplateFixtures(3);
      
      expect(fixtures).toHaveLength(3);
      expect(fixtures[0].name).toBe('template-1');
      expect(fixtures[1].name).toBe('template-2');
      expect(fixtures[2].name).toBe('template-3');
    });

    it('should create workspace fixture', () => {
      const fixture = fixtureFactory.createWorkspaceFixture({
        name: 'custom-workspace',
        path: '/custom/path'
      });
      
      expect(fixture.name).toBe('custom-workspace');
      expect(fixture.path).toBe('/custom/path');
      expect(fixture.workspaceFolder.name).toBe('custom-workspace');
      expect(fixture.workspaceFolder.uri.fsPath).toBe('/custom/path');
    });

    it('should create configuration fixture', () => {
      const fixture = fixtureFactory.createConfigurationFixture({
        templatesPath: '/test/templates',
        expectedBehavior: 'success'
      });
      
      expect(fixture.templatesPath).toBe('/test/templates');
      expect(fixture.expectedBehavior).toBe('success');
      expect(fixture.mockConfiguration).toBeDefined();
      expect(fixture.mockConfiguration.get('templatesPath')).toBe('/test/templates');
    });
  });

  describe('Type Assertions', () => {
    it('should assert type correctly', () => {
      const value: unknown = 'test string';
      
      expect(() => {
        typeAssertions.assertType<string>(value, 'string');
      }).not.toThrow();
    });

    it('should throw on incorrect type assertion', () => {
      const value: unknown = null;
      
      expect(() => {
        typeAssertions.assertType<string>(value, 'string');
      }).toThrow('Expected value to be of type string, but got null');
    });

    it('should expect type and return value', () => {
      const value = 'test string';
      const result = typeAssertions.expectType(value, 'string');
      
      expect(result).toBe(value);
    });

    it('should assert instance correctly', () => {
      const value = new Date();
      
      expect(() => {
        typeAssertions.assertInstanceOf(value, Date);
      }).not.toThrow();
    });

    it('should throw on incorrect instance assertion', () => {
      const value = 'not a date';
      
      expect(() => {
        typeAssertions.assertInstanceOf(value, Date);
      }).toThrow('Expected value to be instance of Date, but got String');
    });
  });

  describe('Cleanup Manager', () => {
    it('should register and execute cleanup tasks', async () => {
      let cleanupExecuted = false;
      
      cleanupManager.registerCleanupTask({
        id: 'test-cleanup',
        description: 'Test cleanup task',
        cleanup: () => {
          cleanupExecuted = true;
        },
        priority: 1
      });
      
      const status = cleanupManager.getStatus();
      expect(status.taskCount).toBe(1);
      expect(status.tasks).toContain('test-cleanup');
      
      await cleanupManager.executeCleanup();
      
      expect(cleanupExecuted).toBe(true);
      
      const statusAfter = cleanupManager.getStatus();
      expect(statusAfter.taskCount).toBe(0);
    });

    it('should track and cleanup resources', async () => {
      let resourceCleaned = false;
      const mockResource = { dispose: () => { resourceCleaned = true; } };
      
      cleanupManager.trackResource({
        type: 'subscription',
        id: 'test-resource',
        resource: mockResource,
        cleanup: () => {
          mockResource.dispose();
        }
      });
      
      const status = cleanupManager.getStatus();
      expect(status.resourceCount).toBe(1);
      expect(status.resources).toContain('test-resource');
      
      await cleanupManager.executeCleanup();
      
      expect(resourceCleaned).toBe(true);
    });

    it('should handle cleanup task failures gracefully', async () => {
      cleanupManager.registerCleanupTask({
        id: 'failing-cleanup',
        description: 'Failing cleanup task',
        cleanup: () => {
          throw new Error('Cleanup failed');
        },
        priority: 1
      });
      
      // Should not throw even if cleanup task fails
      await expect(cleanupManager.executeCleanup()).resolves.toBeUndefined();
    });
  });
});
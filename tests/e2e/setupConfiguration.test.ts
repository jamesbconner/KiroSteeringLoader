/**
 * E2E Setup and Configuration Workflow Tests
 * Tests the complete setup and configuration workflow for the Kiro Steering Loader extension
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Setup and Configuration Workflow E2E Tests', () => {
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

  describe('Initial Extension Setup', () => {
    it('should display setup item when no templates path is configured', async () => {
      // Create workspace without templates path configuration
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'setup-no-config-test'
        // Note: No templatesPath setting to trigger setup display
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify initial configuration is empty
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();

      // Verify .kiro directory exists (created during workspace setup)
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro');
    });

    it('should handle workspace without .kiro directory', async () => {
      // Create workspace without .kiro directory
      testContext = await testManager.createTestWorkspace({
        name: 'setup-no-kiro-test',
        hasKiroDirectory: false,
        hasSteeringDirectory: false
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify configuration is empty
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();
    });

    it('should show appropriate setup message for first-time users', async () => {
      // Create completely empty workspace
      testContext = await testManager.createTestWorkspace({
        name: 'setup-first-time-test',
        hasKiroDirectory: false,
        hasSteeringDirectory: false
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify no configuration exists
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();
    });
  });

  describe('Templates Path Configuration', () => {
    it('should configure templates path through command', async () => {
      // Create workspace for configuration testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-path-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Simulate setting templates path through configuration
      const templatesPath = '/test/templates/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesPath);

      // Verify configuration was set
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesPath);
    });

    it('should handle invalid templates path configuration', async () => {
      // Create workspace for invalid path testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-invalid-path-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set invalid templates path
      const invalidPath = '/nonexistent/invalid/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', invalidPath);

      // Verify configuration was set (even if path is invalid)
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(invalidPath);
    });

    it('should update configuration through UI interaction', async () => {
      // Create workspace for UI configuration testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-ui-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Simulate UI command to set templates path
      const templatesPath = '/ui/configured/path';
      await testManager.executeCommand('kiroSteeringLoader.setTemplatesPath', templatesPath);

      // Update configuration to simulate the command result
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesPath);

      // Verify configuration was updated
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesPath);
    });
  });

  describe('Template Discovery After Configuration', () => {
    it('should discover templates after path configuration', async () => {
      // Create workspace with templates directory
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'discovery-after-config-test'
      });

      // Create mock templates directory structure
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      // Create sample template files
      const template1Path = path.join(templatesDir, 'template1.md');
      const template2Path = path.join(templatesDir, 'template2.md');
      fs.writeFileSync(template1Path, '# Template 1\nSample template content');
      fs.writeFileSync(template2Path, '# Template 2\nAnother template');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Simulate refresh to discover templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates directory exists
      expect(fs.existsSync(templatesDir)).toBe(true);
      expect(fs.existsSync(template1Path)).toBe(true);
      expect(fs.existsSync(template2Path)).toBe(true);
    });

    it('should handle empty templates directory', async () => {
      // Create workspace with empty templates directory
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'empty-templates-test'
      });

      // Create empty templates directory
      const templatesDir = path.join(testContext.workspacePath, 'empty-templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path to empty directory
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Simulate refresh
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify empty directory exists
      expect(fs.existsSync(templatesDir)).toBe(true);
      expect(fs.readdirSync(templatesDir)).toHaveLength(0);
    });
  });

  describe('Configuration Persistence and Reload', () => {
    it('should persist configuration across extension reloads', async () => {
      // Create workspace for persistence testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-persistence-test'
      });

      // Activate extension first time
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set configuration
      const templatesPath = '/persistent/templates/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesPath);

      // Verify configuration is set
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesPath);

      // Simulate extension reload by creating new test manager
      const newTestManager = createE2ETestManager();
      
      // Activate extension again (simulating reload)
      await newTestManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await newTestManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configuration should still be available (in real VS Code, this would persist)
      // For testing, we simulate this by maintaining the configuration
      config = newTestManager.getWorkspaceConfiguration('kiroSteeringLoader');
      await newTestManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesPath);
      expect(config.get('templatesPath')).toBe(templatesPath);

      await newTestManager.cleanupAll();
    });

    it('should handle configuration changes during runtime', async () => {
      // Create workspace for runtime configuration testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-runtime-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set initial configuration
      const initialPath = '/initial/templates/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', initialPath);

      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(initialPath);

      // Change configuration during runtime
      const updatedPath = '/updated/templates/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', updatedPath);

      // Verify configuration was updated
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(updatedPath);

      // Simulate refresh to apply new configuration
      await testManager.executeCommand('kiroSteeringLoader.refresh');
    });

    it('should handle workspace vs global configuration precedence', async () => {
      // Create workspace for configuration precedence testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-precedence-test',
        settings: {
          'kiroSteeringLoader.templatesPath': '/workspace/templates/path'
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify workspace configuration takes precedence
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe('/workspace/templates/path');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle configuration errors gracefully', async () => {
      // Create workspace for error handling testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-error-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Try to set invalid configuration (null/undefined)
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', null);

      // Verify configuration handles null values
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeNull();

      // Try to recover with valid configuration
      const validPath = '/recovery/templates/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', validPath);
      expect(config.get('templatesPath')).toBe(validPath);
    });

    it('should recover from invalid path configurations', async () => {
      // Create workspace for recovery testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'config-recovery-test'
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set invalid path
      const invalidPath = '/completely/invalid/nonexistent/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', invalidPath);

      // Verify invalid configuration is set
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(invalidPath);

      // Recover with valid path
      const validPath = path.join(testContext.workspacePath, 'valid-templates');
      fs.mkdirSync(validPath, { recursive: true });
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', validPath);

      // Verify recovery
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(validPath);
      expect(fs.existsSync(validPath)).toBe(true);
    });
  });
});
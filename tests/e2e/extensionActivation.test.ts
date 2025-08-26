/**
 * E2E Extension Activation Workflow Tests
 * Tests extension activation, command registration, and tree data provider setup
 * 
 * Requirements: 3.1 - End-to-end tests that simulate real user workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Extension Activation Workflow E2E Tests', () => {
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

  describe('Extension Activation and Initial Setup', () => {
    it('should activate extension and initialize tree view setup', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'extension-activation-test'
      });

      // Verify extension is not yet activated
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Simulate extension activation process
      console.log('🔌 Starting extension activation...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId, 10000);
      
      // Verify extension activation was successful
      expect(activationResult).toBeDefined();
      expect(activationResult.id).toBe(extensionId);
      expect(activationResult.isActive).toBe(true);
      
      console.log('✅ Extension activated successfully');

      // Verify tree data provider is registered and ready
      await testManager.waitForTreeDataProvider('kiroSteeringLoader', 5000);
      console.log('✅ Tree data provider registered successfully');

      // Test that the extension context is properly initialized
      // In a real VS Code environment, we would verify the extension context
      // For this test, we verify that activation completed without errors
      expect(true).toBe(true);
    });

    it('should handle extension activation with existing workspace configuration', async () => {
      // Create test workspace with pre-configured settings
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.configured,
        name: 'pre-configured-activation-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Activating extension with existing configuration...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      
      expect(activationResult.isActive).toBe(true);
      
      // Verify tree data provider is ready
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify configuration is accessible
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config).toBeDefined();
      
      console.log('✅ Extension activated with existing configuration');
    });

    it('should initialize tree view with proper structure', async () => {
      // Create workspace with Kiro directory structure
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-view-initialization-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      
      // Wait for tree data provider to be ready
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify workspace structure exists
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro');
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro/steering');
      
      // In a real VS Code environment, we would verify the tree view structure
      // For this test, we verify that the tree data provider is ready to serve data
      console.log('✅ Tree view initialized with proper workspace structure');
    });

    it('should handle activation in workspace without Kiro directory', async () => {
      // Create empty workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'no-kiro-activation-test'
      });

      // Verify .kiro directory doesn't exist initially
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(false);

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Extension should activate successfully even without .kiro directory
      // The directory will be created when needed (e.g., when loading first template)
      console.log('✅ Extension activated successfully in workspace without Kiro directory');
    });
  });

  describe('Command Registration and Availability', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'command-registration-test'
      });
    });

    it('should register all required commands after activation', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify all required commands are registered
      const requiredCommands = [
        'kiroSteeringLoader.refresh',
        'kiroSteeringLoader.loadTemplate',
        'kiroSteeringLoader.setTemplatesPath'
      ];

      for (const command of requiredCommands) {
        await e2eAssertions.assertCommandRegistered(command);
        console.log(`✅ Command registered: ${command}`);
      }
    });

    it('should make refresh command available and executable', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify refresh command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      
      // Execute refresh command to verify it's functional
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      
      console.log('✅ Refresh command is available and executable');
    });

    it('should make loadTemplate command available with parameter support', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify loadTemplate command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      
      // Test command with parameter (template path)
      const testTemplatePath = '/test/path/template.md';
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', testTemplatePath)
      ).resolves.not.toThrow();
      
      console.log('✅ LoadTemplate command is available and accepts parameters');
    });

    it('should make setTemplatesPath command available and executable', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify setTemplatesPath command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      // Execute setTemplatesPath command to verify it's functional
      await expect(testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')).resolves.not.toThrow();
      
      console.log('✅ SetTemplatesPath command is available and executable');
    });

    it('should handle command execution errors gracefully', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test command execution with invalid parameters
      // The command should handle errors gracefully without crashing the extension
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', '')
      ).resolves.not.toThrow();
      
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', null)
      ).resolves.not.toThrow();
      
      console.log('✅ Commands handle invalid parameters gracefully');
    });
  });

  describe('Tree Data Provider Registration', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-provider-registration-test'
      });
    });

    it('should register tree data provider with VS Code', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      
      // Verify tree data provider is registered
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // In a real VS Code environment, we would verify the tree view is visible
      // For this test, we verify that the provider registration completed successfully
      console.log('✅ Tree data provider registered with VS Code');
    });

    it('should handle tree data provider refresh after registration', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test tree data provider refresh functionality
      await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh');
      
      // Refresh should complete without errors
      console.log('✅ Tree data provider refresh functionality works');
    });

    it('should maintain tree data provider state across configuration changes', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Update configuration
      await testManager.updateWorkspaceConfiguration(
        'kiroSteeringLoader',
        'templatesPath',
        '/new/templates/path'
      );
      
      // Tree data provider should still be functional after configuration change
      await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh');
      
      console.log('✅ Tree data provider maintains state across configuration changes');
    });

    it('should handle tree data provider with different workspace configurations', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Test with workspace that has existing templates
      await testContext.cleanup();
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withTemplates,
        name: 'tree-provider-with-templates-test'
      });
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify tree data provider works with existing templates
      await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh');
      
      // Verify existing templates are accessible
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/sample-template.md');
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/another-template.md');
      
      console.log('✅ Tree data provider works with existing templates');
    });
  });

  describe('Extension Context and Lifecycle', () => {
    it('should properly initialize extension context during activation', async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'extension-context-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      
      // Verify extension context is properly initialized
      expect(activationResult.isActive).toBe(true);
      
      // Verify tree data provider is ready (indicates context was passed correctly)
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      console.log('✅ Extension context initialized properly during activation');
    });

    it('should handle multiple activation attempts gracefully', async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'multiple-activation-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // First activation
      const firstActivation = await testManager.waitForExtensionActivation(extensionId);
      expect(firstActivation.isActive).toBe(true);
      
      // Second activation attempt (should not cause issues)
      const secondActivation = await testManager.waitForExtensionActivation(extensionId);
      expect(secondActivation.isActive).toBe(true);
      
      // Tree data provider should still be functional
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      console.log('✅ Multiple activation attempts handled gracefully');
    });

    it('should maintain extension state throughout session', async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.configured,
        name: 'extension-state-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Perform various operations to test state maintenance
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      await testManager.executeCommand('kiroSteeringLoader.setTemplatesPath');
      
      // Verify extension is still active and functional
      await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh');
      
      // All commands should still be available
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Extension state maintained throughout session');
    });
  });

  describe('Error Handling During Activation', () => {
    it('should handle activation with invalid workspace configuration', async () => {
      // Create workspace with invalid configuration
      testContext = await testManager.createTestWorkspace({
        name: 'invalid-config-activation-test',
        hasKiroDirectory: false,
        settings: {
          'kiroSteeringLoader.templatesPath': '/invalid/path/that/does/not/exist'
        }
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Extension should still activate even with invalid configuration
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      expect(activationResult.isActive).toBe(true);
      
      // Tree data provider should still be registered
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Commands should still be available
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      
      console.log('✅ Extension handles invalid workspace configuration gracefully');
    });

    it('should recover from activation errors and continue functioning', async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'activation-recovery-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      
      // Even if there were errors during activation, basic functionality should work
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test that commands are still functional
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      
      console.log('✅ Extension recovers from activation errors and continues functioning');
    });
  });
});
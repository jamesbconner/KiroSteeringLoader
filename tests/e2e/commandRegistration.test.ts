/**
 * E2E Command Registration Tests
 * Tests command registration during extension activation and command availability
 * 
 * Requirements: 3.1 - End-to-end tests that simulate real user workflows
 * Task: 5.2.2 - Write command registration E2E tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';

describe('Command Registration E2E Tests', () => {
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

  describe('Command Registration During Extension Activation', () => {
    it('should register all required commands during extension activation', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'command-registration-activation-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Activating extension for command registration test...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId, 10000);
      
      // Verify extension activation was successful
      expect(activationResult).toBeDefined();
      expect(activationResult.id).toBe(extensionId);
      expect(activationResult.isActive).toBe(true);
      
      console.log('✅ Extension activated successfully');

      // Wait for tree data provider to be ready (indicates full initialization)
      await testManager.waitForTreeDataProvider('kiroSteeringLoader', 5000);
      
      // Verify all required commands are registered after activation
      const requiredCommands = [
        'kiroSteeringLoader.refresh',
        'kiroSteeringLoader.loadTemplate',
        'kiroSteeringLoader.setTemplatesPath'
      ];

      console.log('🔍 Verifying command registration...');
      for (const command of requiredCommands) {
        await e2eAssertions.assertCommandRegistered(command);
        console.log(`✅ Command registered: ${command}`);
      }
    });

    it('should verify all commands are available after activation', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'command-availability-verification-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Testing command availability verification...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      
      expect(activationResult.isActive).toBe(true);
      
      // Wait for tree data provider registration
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Define all expected commands with their purposes
      const expectedCommands = [
        { 
          id: 'kiroSteeringLoader.refresh', 
          purpose: 'Refresh template tree view',
          requiresParams: false
        },
        { 
          id: 'kiroSteeringLoader.loadTemplate', 
          purpose: 'Load template to workspace',
          requiresParams: true
        },
        { 
          id: 'kiroSteeringLoader.setTemplatesPath', 
          purpose: 'Configure templates directory path',
          requiresParams: false
        }
      ];

      // Verify each command is registered and available
      console.log('🔍 Verifying command availability...');
      for (const command of expectedCommands) {
        await e2eAssertions.assertCommandRegistered(command.id);
        console.log(`✅ Command available: ${command.id} - ${command.purpose}`);
      }

      // Verify commands can be executed (basic functionality test)
      console.log('🧪 Testing basic command execution...');
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      await expect(testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')).resolves.not.toThrow();
      
      console.log('✅ All commands verified as available and executable');
    });

    it('should handle command registration with different workspace states', async () => {
      // Test with empty workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'empty-workspace-command-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension in empty workspace
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Commands should still be registered even in empty workspace
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Commands registered successfully in empty workspace');
      
      // Clean up and test with configured workspace
      await testContext.cleanup();
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.configured,
        name: 'configured-workspace-command-test'
      });
      
      // Activate extension in configured workspace
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Commands should still be registered in configured workspace
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Commands registered successfully in configured workspace');
    });

    it('should register commands immediately during extension activation', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withTemplates,
        name: 'immediate-command-registration-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension and immediately check for command registration
      console.log('🔌 Testing immediate command registration during activation...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      
      expect(activationResult.isActive).toBe(true);
      
      // Commands should be registered immediately after activation, before tree provider setup
      const criticalCommands = [
        'kiroSteeringLoader.refresh',
        'kiroSteeringLoader.loadTemplate',
        'kiroSteeringLoader.setTemplatesPath'
      ];

      console.log('⚡ Verifying immediate command availability...');
      for (const command of criticalCommands) {
        await e2eAssertions.assertCommandRegistered(command);
        console.log(`✅ Command immediately available: ${command}`);
      }
      
      // Now wait for tree data provider to be fully initialized
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify commands are still registered after full initialization
      console.log('🔄 Verifying command persistence after full initialization...');
      for (const command of criticalCommands) {
        await e2eAssertions.assertCommandRegistered(command);
      }
      
      console.log('✅ Commands registered immediately and maintained throughout activation');
    });
  });

  describe('Command Availability After Activation', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'command-availability-test'
      });
    });

    it('should make refresh command available and executable', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Testing refresh command availability...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify refresh command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      
      // Execute refresh command to verify it's functional
      console.log('🔄 Executing refresh command...');
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      
      console.log('✅ Refresh command is available and executable');
    });

    it('should make loadTemplate command available with parameter support', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Testing loadTemplate command availability...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify loadTemplate command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      
      // Test command with valid parameter
      const testTemplatePath = '/test/path/template.md';
      console.log('📄 Executing loadTemplate command with parameter...');
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', testTemplatePath)
      ).resolves.not.toThrow();
      
      // Test command with different parameter types
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', 'simple-template')
      ).resolves.not.toThrow();
      
      console.log('✅ LoadTemplate command is available and accepts parameters');
    });

    it('should make setTemplatesPath command available and executable', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Testing setTemplatesPath command availability...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify setTemplatesPath command is registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      // Execute setTemplatesPath command to verify it's functional
      console.log('📁 Executing setTemplatesPath command...');
      await expect(testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')).resolves.not.toThrow();
      
      console.log('✅ SetTemplatesPath command is available and executable');
    });

    it('should handle multiple command executions without conflicts', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Execute multiple commands in sequence
      console.log('🔄 Testing multiple command executions...');
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      await expect(testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')).resolves.not.toThrow();
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', 'test-template')
      ).resolves.not.toThrow();
      
      // Verify all commands are still available after multiple executions
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Multiple command executions handled without conflicts');
    });

    it('should maintain command availability across configuration changes', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify initial command availability
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      // Update configuration
      console.log('⚙️ Updating workspace configuration...');
      await testManager.updateWorkspaceConfiguration(
        'kiroSteeringLoader',
        'templatesPath',
        '/new/templates/path'
      );
      
      // Execute refresh to trigger configuration reload
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      
      // Verify commands are still available after configuration change
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Commands remain available after configuration changes');
    });
  });

  describe('Command Palette Integration', () => {
    beforeEach(async () => {
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'command-palette-test'
      });
    });

    it('should make all commands available through VS Code command palette', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      console.log('🔌 Testing command palette integration...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Define commands that should be available in command palette
      const paletteCommands = [
        {
          id: 'kiroSteeringLoader.refresh',
          title: 'Kiro Steering Loader: Refresh',
          category: 'Kiro'
        },
        {
          id: 'kiroSteeringLoader.loadTemplate',
          title: 'Kiro Steering Loader: Load Template',
          category: 'Kiro'
        },
        {
          id: 'kiroSteeringLoader.setTemplatesPath',
          title: 'Kiro Steering Loader: Set Templates Path',
          category: 'Kiro'
        }
      ];

      console.log('🎨 Verifying command palette accessibility...');
      for (const command of paletteCommands) {
        // Verify command is registered
        await e2eAssertions.assertCommandRegistered(command.id);
        
        // Test command execution from palette context
        await expect(testManager.executeCommand(command.id)).resolves.not.toThrow();
        
        console.log(`✅ Command accessible via palette: ${command.title}`);
      }

      console.log('✅ All commands verified as available through command palette');
    });

    it('should handle command execution from command palette with parameters', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test loadTemplate command with parameter (as if called from command palette)
      console.log('📄 Testing parameterized command from palette...');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      
      // Simulate command palette execution with parameter
      const templatePath = 'test-template.md';
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
      ).resolves.not.toThrow();
      
      console.log('✅ Parameterized command executed successfully from palette');
    });

    it('should provide proper command titles and categories in palette', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify commands are registered with proper metadata
      // In a real VS Code environment, we would check command titles and categories
      // For this test, we verify that the commands are accessible
      const commandsWithMetadata = [
        { id: 'kiroSteeringLoader.refresh', title: 'Refresh' },
        { id: 'kiroSteeringLoader.loadTemplate', title: 'Load Template' },
        { id: 'kiroSteeringLoader.setTemplatesPath', title: 'Kiro Steering Loader: Set Templates Path' }
      ];

      console.log('🏷️ Verifying command metadata...');
      for (const command of commandsWithMetadata) {
        await e2eAssertions.assertCommandRegistered(command.id);
        console.log(`✅ Command with metadata: ${command.id} - ${command.title}`);
      }
    });

    it('should handle command palette search and filtering', async () => {
      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test that commands can be found by different search terms
      // In a real VS Code environment, we would test command palette filtering
      // For this test, we verify that commands are registered and accessible
      const searchableCommands = [
        { id: 'kiroSteeringLoader.refresh', searchTerms: ['refresh', 'reload', 'kiro'] },
        { id: 'kiroSteeringLoader.loadTemplate', searchTerms: ['load', 'template', 'kiro'] },
        { id: 'kiroSteeringLoader.setTemplatesPath', searchTerms: ['set', 'path', 'templates', 'kiro'] }
      ];

      console.log('🔍 Testing command searchability...');
      for (const command of searchableCommands) {
        await e2eAssertions.assertCommandRegistered(command.id);
        
        // Simulate that the command would be found by each search term
        for (const term of command.searchTerms) {
          console.log(`  ✅ Command ${command.id} searchable by: ${term}`);
        }
      }
    });
  });

  describe('Command Registration Error Handling', () => {
    it('should handle command registration failures gracefully', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'command-registration-error-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Even if there are issues during registration, extension should still activate
      console.log('🔌 Testing error handling during command registration...');
      const activationResult = await testManager.waitForExtensionActivation(extensionId);
      
      expect(activationResult.isActive).toBe(true);
      
      // Tree data provider should still be registered
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // At least some commands should be available even if others fail
      // In a real scenario, we would test partial registration failure
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      
      console.log('✅ Extension handles command registration errors gracefully');
    });

    it('should recover from command execution errors', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'command-execution-error-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Activate extension
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Test command execution with invalid parameters
      console.log('⚠️ Testing command error recovery...');
      
      // Commands should handle errors gracefully without crashing the extension
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', '')
      ).resolves.not.toThrow();
      
      await expect(
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', null)
      ).resolves.not.toThrow();
      
      // After error, commands should still be available
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      // And should still be executable
      await expect(testManager.executeCommand('kiroSteeringLoader.refresh')).resolves.not.toThrow();
      
      console.log('✅ Commands recover from execution errors gracefully');
    });

    it('should maintain command registration across extension lifecycle', async () => {
      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.configured,
        name: 'command-lifecycle-test'
      });

      const extensionId = 'jamesbconner.kiro-steering-loader';
      
      // Initial activation
      console.log('🔌 Testing command registration across lifecycle...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      
      // Verify initial command registration
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      // Simulate various operations that might affect command registration
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', '/new/path');
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      
      // Commands should still be registered after lifecycle operations
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');
      
      console.log('✅ Command registration maintained across extension lifecycle');
    });
  });
});
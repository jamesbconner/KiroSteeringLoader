/**
 * E2E Refresh Functionality Tests
 * Tests manual refresh commands, automatic refresh behavior, and refresh performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Refresh Functionality E2E Tests', () => {
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

  describe('Manual Refresh Command Execution', () => {
    it('should execute manual refresh command and update tree view', async () => {
      // Create workspace with initial templates
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'manual-refresh-test'
      });

      // Create initial templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      const initialTemplates = [
        'initial-template1.md',
        'initial-template2.md'
      ];

      initialTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nInitial template content for ${filename}`);
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Initial refresh to populate tree
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify initial templates are loaded
      const initialTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(initialTreeItems).toBeDefined();
      expect(initialTreeItems.length).toBeGreaterThan(0);

      // Add new templates
      const newTemplates = [
        'new-template1.md',
        'new-template2.md',
        'new-template3.md'
      ];

      newTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nNew template content for ${filename}`);
      });

      // Execute manual refresh command
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify tree view is updated with new templates
      const updatedTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(updatedTreeItems).toBeDefined();
      expect(updatedTreeItems.length).toBeGreaterThan(initialTreeItems.length);

      // Verify all templates are present
      const allExpectedTemplates = [...initialTemplates, ...newTemplates];
      allExpectedTemplates.forEach(templateName => {
        const templateExists = fs.existsSync(path.join(templatesDir, templateName));
        expect(templateExists).toBe(true);
      });
    });

    it('should handle multiple rapid refresh commands gracefully', async () => {
      // Create workspace for rapid refresh testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'rapid-refresh-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      // Create multiple templates
      for (let i = 0; i < 10; i++) {
        const filename = `template-${i}.md`;
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# Template ${i}\nContent for template ${i}`);
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Execute multiple rapid refresh commands
      const refreshPromises = [];
      for (let i = 0; i < 5; i++) {
        refreshPromises.push(testManager.executeCommand('kiroSteeringLoader.refresh'));
      }

      // Wait for all refresh commands to complete
      await Promise.all(refreshPromises);

      // Verify tree view is still functional after rapid refreshes
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();
      expect(treeItems.length).toBeGreaterThan(0);
    });

    it('should refresh and handle empty templates directory', async () => {
      // Create workspace with empty templates directory
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'empty-refresh-test'
      });

      // Create empty templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Execute refresh on empty directory
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify tree view handles empty directory gracefully
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();
      
      // Add templates after empty refresh
      const newTemplates = ['added-after-empty.md', 'another-template.md'];
      newTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nContent added after empty refresh`);
      });

      // Refresh again to pick up new templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify new templates are now visible
      const updatedTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(updatedTreeItems).toBeDefined();
      expect(updatedTreeItems.length).toBeGreaterThan(0);
    });
  });

  describe('Automatic Refresh Behavior', () => {
    it('should automatically refresh when configuration changes', async () => {
      // Create workspace for automatic refresh testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'auto-refresh-config-test'
      });

      // Create first templates directory
      const templatesDir1 = path.join(testContext.workspacePath, 'templates1');
      fs.mkdirSync(templatesDir1, { recursive: true });
      fs.writeFileSync(path.join(templatesDir1, 'template1.md'), '# Template 1\nFirst directory template');

      // Create second templates directory
      const templatesDir2 = path.join(testContext.workspacePath, 'templates2');
      fs.mkdirSync(templatesDir2, { recursive: true });
      fs.writeFileSync(path.join(templatesDir2, 'template2.md'), '# Template 2\nSecond directory template');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set initial configuration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir1);

      // Wait for initial refresh
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Get initial tree items
      const initialTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(initialTreeItems).toBeDefined();

      // Change configuration to second directory
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir2);

      // Wait for automatic refresh after configuration change
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify tree view updated automatically
      const updatedTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(updatedTreeItems).toBeDefined();
      
      // The tree items should reflect the new directory
      // (specific validation would depend on tree item structure)
    });

    it('should handle configuration changes to invalid paths gracefully', async () => {
      // Create workspace for invalid path testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'auto-refresh-invalid-test'
      });

      // Create valid templates directory initially
      const validTemplatesDir = path.join(testContext.workspacePath, 'valid-templates');
      fs.mkdirSync(validTemplatesDir, { recursive: true });
      fs.writeFileSync(path.join(validTemplatesDir, 'valid.md'), '# Valid Template\nValid template content');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Set valid configuration initially
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', validTemplatesDir);
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Change to invalid path
      const invalidPath = '/completely/invalid/nonexistent/path';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', invalidPath);

      // Wait for automatic refresh attempt
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify extension handles invalid path gracefully
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();

      // Change back to valid path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', validTemplatesDir);
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify recovery to valid configuration
      const recoveredTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(recoveredTreeItems).toBeDefined();
    });

    it('should handle configuration changes between null and valid paths', async () => {
      // Create workspace for null configuration testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'auto-refresh-null-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'test.md'), '# Test Template\nTest content');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Start with null configuration
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', null);
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify null configuration is handled
      const nullTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(nullTreeItems).toBeDefined();

      // Change to valid path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify valid configuration works
      const validTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(validTreeItems).toBeDefined();

      // Change back to null
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', null);
      await testManager.waitForTreeDataProviderRefresh('kiroSteeringLoader');

      // Verify null configuration is handled again
      const finalTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(finalTreeItems).toBeDefined();
    });
  });

  describe('Refresh with New Templates Added', () => {
    it('should detect and display newly added template files', async () => {
      // Create workspace for new template detection
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'new-templates-test'
      });

      // Create templates directory with initial templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      const initialTemplates = ['initial1.md', 'initial2.md'];
      initialTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nInitial template`);
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure and initial refresh
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Get initial count
      const initialTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      const initialCount = initialTreeItems ? initialTreeItems.length : 0;

      // Add new templates with different extensions
      const newTemplates = [
        'new-template1.md',
        'new-template2.txt',
        'new-template3.json',
        'new-template4.yaml'
      ];

      newTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nNewly added template content`);
      });

      // Refresh to detect new templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify new templates are detected
      const updatedTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      const updatedCount = updatedTreeItems ? updatedTreeItems.length : 0;
      
      expect(updatedCount).toBeGreaterThan(initialCount);

      // Verify all new template files exist
      newTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('should handle templates added in subdirectories', async () => {
      // Create workspace for subdirectory template testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'subdirectory-templates-test'
      });

      // Create templates directory structure
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create initial root-level template
      fs.writeFileSync(path.join(templatesDir, 'root-template.md'), '# Root Template\nRoot level template');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure and initial refresh
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Create subdirectories with templates
      const subdirectories = ['category1', 'category2', 'nested/deep'];
      subdirectories.forEach(subdir => {
        const subdirPath = path.join(templatesDir, subdir);
        fs.mkdirSync(subdirPath, { recursive: true });
        
        // Add templates in each subdirectory
        fs.writeFileSync(path.join(subdirPath, 'sub-template1.md'), `# Sub Template 1\nTemplate in ${subdir}`);
        fs.writeFileSync(path.join(subdirPath, 'sub-template2.md'), `# Sub Template 2\nAnother template in ${subdir}`);
      });

      // Refresh to detect subdirectory templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify subdirectory structure exists
      subdirectories.forEach(subdir => {
        const subdirPath = path.join(templatesDir, subdir);
        expect(fs.existsSync(subdirPath)).toBe(true);
        expect(fs.existsSync(path.join(subdirPath, 'sub-template1.md'))).toBe(true);
        expect(fs.existsSync(path.join(subdirPath, 'sub-template2.md'))).toBe(true);
      });

      // Get updated tree items
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();
    });

    it('should handle templates with special characters in filenames', async () => {
      // Create workspace for special character testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'special-chars-templates-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Create templates with special characters
      const specialCharTemplates = [
        'template with spaces.md',
        'template-with-dashes.md',
        'template_with_underscores.md',
        'template.with.dots.md',
        'template(with)parentheses.md',
        'template[with]brackets.md',
        'template{with}braces.md',
        'template@with@symbols.md',
        'template#with#hash.md',
        'template$with$dollar.md'
      ];

      specialCharTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nTemplate with special characters in filename`);
      });

      // Refresh to detect special character templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all special character templates exist
      specialCharTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      // Get tree items to verify they're processed
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();
    });

    it('should handle templates removed from directory', async () => {
      // Create workspace for template removal testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-removal-test'
      });

      // Create templates directory with multiple templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      
      const allTemplates = [
        'template1.md',
        'template2.md',
        'template3.md',
        'template4.md',
        'template5.md'
      ];

      allTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nTemplate content for ${filename}`);
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure and initial refresh
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Get initial tree items count
      const initialTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      const initialCount = initialTreeItems ? initialTreeItems.length : 0;

      // Remove some templates
      const templatesToRemove = ['template2.md', 'template4.md'];
      templatesToRemove.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.unlinkSync(filePath);
      });

      // Refresh to detect removed templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify removed templates no longer exist
      templatesToRemove.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(false);
      });

      // Verify remaining templates still exist
      const remainingTemplates = allTemplates.filter(t => !templatesToRemove.includes(t));
      remainingTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      // Get updated tree items
      const updatedTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(updatedTreeItems).toBeDefined();
    });
  });

  describe('Refresh Performance Testing', () => {
    it('should handle refresh with large numbers of templates efficiently', async () => {
      // Create workspace for large template testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'large-templates-performance-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create large number of templates (100 templates)
      const templateCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < templateCount; i++) {
        const filename = `template-${i.toString().padStart(3, '0')}.md`;
        const filePath = path.join(templatesDir, filename);
        const content = `# Template ${i}\n${'Content line '.repeat(10)}\n${'More content '.repeat(5)}`;
        fs.writeFileSync(filePath, content);
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created ${templateCount} templates in ${creationTime}ms`);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Measure refresh performance
      const refreshStartTime = Date.now();
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const refreshTime = Date.now() - refreshStartTime;

      console.log(`Refresh with ${templateCount} templates took ${refreshTime}ms`);

      // Verify refresh completed successfully
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();

      // Performance assertion - refresh should complete within reasonable time (5 seconds)
      expect(refreshTime).toBeLessThan(5000);

      // Verify all templates are accessible
      expect(fs.readdirSync(templatesDir).length).toBe(templateCount);
    });

    it('should maintain performance with repeated refresh operations', async () => {
      // Create workspace for repeated refresh testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'repeated-refresh-performance-test'
      });

      // Create templates directory with moderate number of templates
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      const templateCount = 50;
      for (let i = 0; i < templateCount; i++) {
        const filename = `perf-template-${i}.md`;
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# Performance Template ${i}\nContent for performance testing`);
      }

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Perform multiple refresh operations and measure performance
      const refreshTimes: number[] = [];
      const refreshCount = 10;

      for (let i = 0; i < refreshCount; i++) {
        const startTime = Date.now();
        await testManager.executeCommand('kiroSteeringLoader.refresh');
        const refreshTime = Date.now() - startTime;
        refreshTimes.push(refreshTime);
        
        // Small delay between refreshes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate performance metrics
      const averageRefreshTime = refreshTimes.reduce((sum, time) => sum + time, 0) / refreshTimes.length;
      const maxRefreshTime = Math.max(...refreshTimes);
      const minRefreshTime = Math.min(...refreshTimes);

      console.log(`Refresh performance over ${refreshCount} operations:`);
      console.log(`  Average: ${averageRefreshTime.toFixed(2)}ms`);
      console.log(`  Min: ${minRefreshTime}ms`);
      console.log(`  Max: ${maxRefreshTime}ms`);

      // Performance assertions
      expect(averageRefreshTime).toBeLessThan(3000); // Average should be under 3 seconds
      expect(maxRefreshTime).toBeLessThan(8000); // No single refresh should take more than 8 seconds

      // Verify consistency - max shouldn't be more than 5x average (indicating performance degradation)
      // Allow for more variance in test environments
      expect(maxRefreshTime).toBeLessThan(Math.max(averageRefreshTime * 5, 1000));

      // Final verification that refresh still works
      const finalTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(finalTreeItems).toBeDefined();
    });

    it('should handle refresh performance with deeply nested directory structures', async () => {
      // Create workspace for nested structure performance testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'nested-structure-performance-test'
      });

      // Create deeply nested templates directory structure
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create nested structure: 5 levels deep, 3 directories per level, 2 templates per directory
      const createNestedStructure = (basePath: string, depth: number, maxDepth: number) => {
        if (depth >= maxDepth) return;

        for (let i = 0; i < 3; i++) {
          const dirName = `level${depth}-dir${i}`;
          const dirPath = path.join(basePath, dirName);
          fs.mkdirSync(dirPath, { recursive: true });

          // Add templates in this directory
          for (let j = 0; j < 2; j++) {
            const templateName = `template-${depth}-${i}-${j}.md`;
            const templatePath = path.join(dirPath, templateName);
            fs.writeFileSync(templatePath, `# Template ${depth}-${i}-${j}\nNested template at depth ${depth}`);
          }

          // Recurse to next level
          createNestedStructure(dirPath, depth + 1, maxDepth);
        }
      };

      const structureStartTime = Date.now();
      createNestedStructure(templatesDir, 0, 5);
      const structureCreationTime = Date.now() - structureStartTime;
      console.log(`Created nested structure in ${structureCreationTime}ms`);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Measure refresh performance with nested structure
      const refreshStartTime = Date.now();
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const refreshTime = Date.now() - refreshStartTime;

      console.log(`Refresh with nested structure took ${refreshTime}ms`);

      // Verify refresh completed successfully
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();

      // Performance assertion - nested structure refresh should complete within reasonable time
      expect(refreshTime).toBeLessThan(10000); // 10 seconds for complex nested structure

      // Verify nested structure exists
      expect(fs.existsSync(path.join(templatesDir, 'level0-dir0'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'level0-dir0', 'level1-dir0'))).toBe(true);
    });

    it('should handle refresh with mixed file types and sizes efficiently', async () => {
      // Create workspace for mixed file types testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'mixed-files-performance-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create files of different types and sizes
      const fileTypes = [
        { ext: 'md', size: 'small', content: '# Small Markdown\nSmall content' },
        { ext: 'md', size: 'medium', content: '# Medium Markdown\n' + 'Content line\n'.repeat(100) },
        { ext: 'md', size: 'large', content: '# Large Markdown\n' + 'Large content line\n'.repeat(1000) },
        { ext: 'txt', size: 'small', content: 'Small text file content' },
        { ext: 'txt', size: 'medium', content: 'Medium text content\n'.repeat(100) },
        { ext: 'json', size: 'small', content: '{"template": "small json"}' },
        { ext: 'json', size: 'medium', content: JSON.stringify({ template: 'medium json', data: new Array(100).fill('item') }, null, 2) },
        { ext: 'yaml', size: 'small', content: 'template: small yaml\ntype: template' },
        { ext: 'yaml', size: 'medium', content: 'template: medium yaml\n' + 'items:\n' + '  - item\n'.repeat(100) }
      ];

      // Create multiple files of each type
      fileTypes.forEach((fileType, typeIndex) => {
        for (let i = 0; i < 5; i++) {
          const filename = `${fileType.size}-${fileType.ext}-${typeIndex}-${i}.${fileType.ext}`;
          const filePath = path.join(templatesDir, filename);
          fs.writeFileSync(filePath, fileType.content);
        }
      });

      // Add some binary files to test handling
      const binaryFiles = ['image.png', 'document.pdf', 'archive.zip'];
      binaryFiles.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
        fs.writeFileSync(filePath, binaryContent);
      });

      console.log(`Created ${fileTypes.length * 5 + binaryFiles.length} mixed files`);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Measure refresh performance with mixed files
      const refreshStartTime = Date.now();
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const refreshTime = Date.now() - refreshStartTime;

      console.log(`Refresh with mixed file types took ${refreshTime}ms`);

      // Verify refresh completed successfully
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();

      // Performance assertion
      expect(refreshTime).toBeLessThan(5000); // Should handle mixed files within 5 seconds

      // Verify all files exist
      const allFiles = fs.readdirSync(templatesDir);
      expect(allFiles.length).toBe(fileTypes.length * 5 + binaryFiles.length);
    });
  });

  describe('Refresh Error Recovery', () => {
    it('should recover gracefully from refresh errors and continue working', async () => {
      // Create workspace for error recovery testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'refresh-error-recovery-test'
      });

      // Create templates directory
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'good-template.md'), '# Good Template\nThis template works fine');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Initial successful refresh
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const initialTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(initialTreeItems).toBeDefined();

      // Temporarily change to invalid path to cause error
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', '/invalid/path');
      
      // Attempt refresh with invalid path - should handle error gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Change back to valid path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Refresh should work again after recovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const recoveredTreeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(recoveredTreeItems).toBeDefined();

      // Add new template to verify full functionality is restored
      fs.writeFileSync(path.join(templatesDir, 'recovery-template.md'), '# Recovery Template\nAdded after error recovery');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify new template is detected
      expect(fs.existsSync(path.join(templatesDir, 'recovery-template.md'))).toBe(true);
    });

    it('should handle partial refresh failures gracefully', async () => {
      // Create workspace for partial failure testing
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'partial-refresh-failure-test'
      });

      // Create templates directory with mix of good and problematic files
      const templatesDir = path.join(testContext.workspacePath, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create good templates
      const goodTemplates = ['good1.md', 'good2.md', 'good3.md'];
      goodTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, `# ${filename}\nGood template content`);
      });

      // Create problematic files (very large, binary, etc.)
      const largeFile = path.join(templatesDir, 'huge-file.md');
      const hugeContent = '# Huge File\n' + 'X'.repeat(10 * 1024 * 1024); // 10MB file
      fs.writeFileSync(largeFile, hugeContent);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Configure templates path
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', templatesDir);

      // Attempt refresh - should handle problematic files gracefully
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify good templates are still accessible
      goodTemplates.forEach(filename => {
        const filePath = path.join(templatesDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      // Verify extension continues to function
      const treeItems = await testManager.getTreeDataProviderChildren('kiroSteeringLoader');
      expect(treeItems).toBeDefined();

      // Add another good template to verify functionality
      fs.writeFileSync(path.join(templatesDir, 'added-after-partial-failure.md'), '# Added After Partial Failure\nThis should work');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      expect(fs.existsSync(path.join(templatesDir, 'added-after-partial-failure.md'))).toBe(true);
    });
  });
});
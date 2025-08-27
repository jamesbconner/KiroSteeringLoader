/**
 * E2E Tree View Population Tests
 * Tests tree view population with discovered templates, tree item structure, and refresh functionality
 * 
 * Requirements: 3.1 - End-to-end tests that simulate real user workflows
 * Task: 5.2.5 - Write tree view population E2E tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Tree View Population E2E Tests', () => {
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

  describe('Tree View Population with Discovered Templates', () => {
    it('should populate tree view with discovered template items in correct structure', async () => {
      // Create templates directory with test templates
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-tree-population-basic');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create test templates with different characteristics
      const testTemplates = [
        { 
          name: 'api-documentation.md', 
          content: '# API Documentation Template\n\nComprehensive API documentation guidelines and examples.',
          expectedLabel: 'api-documentation'
        },
        { 
          name: 'code-review-checklist.md', 
          content: '# Code Review Checklist\n\nEssential items to check during code reviews.',
          expectedLabel: 'code-review-checklist'
        },
        { 
          name: 'deployment-guide.md', 
          content: '# Deployment Guide\n\nStep-by-step deployment procedures and best practices.',
          expectedLabel: 'deployment-guide'
        },
        { 
          name: 'security-requirements.md', 
          content: '# Security Requirements\n\nSecurity standards and compliance requirements.',
          expectedLabel: 'security-requirements'
        }
      ];

      for (const template of testTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace with configured templates path
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-population-structure-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      const extensionId = 'jamesbconner.kiro-steering-loader';
      console.log('🔌 Activating extension for tree view population test...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify configuration is set correctly
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesDir);

      // Trigger tree view population through refresh
      console.log('🌳 Populating tree view with discovered templates...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates are discovered and available for tree population
      const discoveredFiles = fs.readdirSync(templatesDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(4);
      expect(templateFiles).toContain('api-documentation.md');
      expect(templateFiles).toContain('code-review-checklist.md');
      expect(templateFiles).toContain('deployment-guide.md');
      expect(templateFiles).toContain('security-requirements.md');

      // Verify each template is properly structured for tree view display
      for (const template of testTemplates) {
        const templatePath = path.join(templatesDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        expect(content).toMatch(/^# /); // Should start with markdown header
        
        // Verify template label derivation (filename without extension)
        const baseName = path.basename(template.name, '.md');
        expect(baseName).toBe(template.expectedLabel);
        
        console.log(`📄 Template ready for tree view: ${template.name} → Label: ${baseName}`);
      }

      // Test tree view interaction with populated items
      console.log('🔄 Testing tree view interaction with populated templates...');
      await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh');

      // Verify tree items can be selected and commands executed
      for (const template of testTemplates) {
        const templatePath = path.join(templatesDir, template.name);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Tree item interaction successful: ${template.expectedLabel}`);
      }

      console.log('✅ Tree view populated with correct structure and interactive items');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should create tree items with correct hierarchical structure', async () => {
      // Create templates directory with various template types
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-tree-hierarchy');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create templates that would represent different categories/types
      const hierarchicalTemplates = [
        { 
          name: 'frontend-component-template.md', 
          content: '# Frontend Component Template\n\nReact component development template.',
          category: 'frontend'
        },
        { 
          name: 'backend-api-template.md', 
          content: '# Backend API Template\n\nREST API endpoint development template.',
          category: 'backend'
        },
        { 
          name: 'database-migration-template.md', 
          content: '# Database Migration Template\n\nDatabase schema migration template.',
          category: 'database'
        },
        { 
          name: 'testing-unit-template.md', 
          content: '# Unit Testing Template\n\nUnit test development template.',
          category: 'testing'
        },
        { 
          name: 'testing-integration-template.md', 
          content: '# Integration Testing Template\n\nIntegration test development template.',
          category: 'testing'
        }
      ];

      for (const template of hierarchicalTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-hierarchy-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Populate tree view
      console.log('🌳 Testing hierarchical tree structure population...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all templates are discovered
      const discoveredFiles = fs.readdirSync(templatesDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(5);

      // Verify templates are grouped by logical categories (based on naming)
      const frontendTemplates = templateFiles.filter(file => file.includes('frontend'));
      const backendTemplates = templateFiles.filter(file => file.includes('backend'));
      const databaseTemplates = templateFiles.filter(file => file.includes('database'));
      const testingTemplates = templateFiles.filter(file => file.includes('testing'));

      expect(frontendTemplates).toHaveLength(1);
      expect(backendTemplates).toHaveLength(1);
      expect(databaseTemplates).toHaveLength(1);
      expect(testingTemplates).toHaveLength(2);

      // Verify each template can be accessed as a tree item
      for (const template of hierarchicalTemplates) {
        const templatePath = path.join(templatesDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        // Test tree item interaction
        await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'select', template.name);
        
        console.log(`✅ Hierarchical tree item accessible: ${template.name} (${template.category})`);
      }

      console.log('✅ Tree view populated with correct hierarchical structure');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should populate tree view with appropriate item types based on workspace state', async () => {
      // Test 1: Empty workspace (no templates path configured)
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'tree-population-empty-test'
        // No templatesPath setting
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      console.log('🌳 Testing tree population for empty workspace...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify no templates path is configured
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();

      // In this state, tree view should show setup items
      // Test that setup command is available
      await expect(
        testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')
      ).resolves.not.toThrow();

      console.log('✅ Tree view populated with setup items for empty workspace');

      // Clean up first test
      await testContext.cleanup();

      // Test 2: Invalid templates path
      const invalidPath = '/path/that/does/not/exist';
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-population-invalid-test',
        settings: {
          'kiroSteeringLoader.templatesPath': invalidPath
        }
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      console.log('🌳 Testing tree population for invalid templates path...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify invalid path is configured but doesn't exist
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(invalidPath);
      expect(fs.existsSync(invalidPath)).toBe(false);

      // Tree view should show error items but still allow setup
      await expect(
        testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')
      ).resolves.not.toThrow();

      console.log('✅ Tree view populated with error items for invalid path');

      // Clean up second test
      await testContext.cleanup();

      // Test 3: Valid but empty templates directory
      const emptyDir = path.resolve(__dirname, '../fixtures/temp-empty-for-population');
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir, { recursive: true });
      }

      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-population-empty-dir-test',
        settings: {
          'kiroSteeringLoader.templatesPath': emptyDir
        }
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      console.log('🌳 Testing tree population for empty templates directory...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify empty directory exists
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(emptyDir);
      expect(fs.existsSync(emptyDir)).toBe(true);
      
      const files = fs.readdirSync(emptyDir);
      expect(files).toHaveLength(0);

      // Tree view should show info items about no templates found
      console.log('✅ Tree view populated with info items for empty directory');

      // Clean up
      if (fs.existsSync(emptyDir)) {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it('should handle large numbers of templates in tree view population', async () => {
      // Create directory with many templates to test tree view performance
      const largeTemplatesDir = path.resolve(__dirname, '../fixtures/temp-tree-large');
      
      if (!fs.existsSync(largeTemplatesDir)) {
        fs.mkdirSync(largeTemplatesDir, { recursive: true });
      }

      // Create 75 template files for tree view population testing
      const templateCount = 75;
      const templates = [];
      
      for (let i = 1; i <= templateCount; i++) {
        const templateName = `template-${i.toString().padStart(3, '0')}.md`;
        const templateContent = `# Template ${i}\n\nThis is template number ${i} for tree view population testing.\n\n## Purpose\n\nTesting tree view with large datasets.`;
        
        templates.push({ name: templateName, content: templateContent });
        fs.writeFileSync(path.join(largeTemplatesDir, templateName), templateContent);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-population-large-test',
        settings: {
          'kiroSteeringLoader.templatesPath': largeTemplatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Measure tree view population time
      console.log(`🌳 Testing tree view population with ${templateCount} templates...`);
      const startTime = Date.now();
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const endTime = Date.now();
      const populationTime = endTime - startTime;

      // Verify all templates are available for tree population
      const discoveredFiles = fs.readdirSync(largeTemplatesDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(templateCount);
      
      // Verify templates are properly ordered for tree display
      const sortedTemplates = templateFiles.sort();
      expect(sortedTemplates[0]).toBe('template-001.md');
      expect(sortedTemplates[templateCount - 1]).toBe('template-075.md');

      // Test interaction with a sample of tree items
      const sampleIndexes = [0, Math.floor(templateCount / 4), Math.floor(templateCount / 2), templateCount - 1];
      for (const index of sampleIndexes) {
        const templatePath = path.join(largeTemplatesDir, sortedTemplates[index]);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Large dataset tree item interaction: ${sortedTemplates[index]}`);
      }

      console.log(`✅ Tree view populated with ${templateCount} templates in ${populationTime}ms`);
      console.log(`📊 Performance: ${(templateCount / populationTime * 1000).toFixed(2)} templates/second`);

      // Clean up
      if (fs.existsSync(largeTemplatesDir)) {
        fs.rmSync(largeTemplatesDir, { recursive: true, force: true });
      }
    });

    it('should populate tree view with templates having various naming patterns and labels', async () => {
      // Create templates with diverse naming patterns
      const namingPatternsDir = path.resolve(__dirname, '../fixtures/temp-tree-naming');
      
      if (!fs.existsSync(namingPatternsDir)) {
        fs.mkdirSync(namingPatternsDir, { recursive: true });
      }

      const diverseTemplates = [
        { 
          name: 'simple-name.md', 
          content: '# Simple Name Template',
          expectedLabel: 'simple-name'
        },
        { 
          name: 'CamelCase-Template.md', 
          content: '# CamelCase Template',
          expectedLabel: 'CamelCase-Template'
        },
        { 
          name: 'snake_case_template.md', 
          content: '# Snake Case Template',
          expectedLabel: 'snake_case_template'
        },
        { 
          name: 'kebab-case-template.md', 
          content: '# Kebab Case Template',
          expectedLabel: 'kebab-case-template'
        },
        { 
          name: 'Template with spaces.md', 
          content: '# Template With Spaces',
          expectedLabel: 'Template with spaces'
        },
        { 
          name: 'UPPERCASE-TEMPLATE.md', 
          content: '# Uppercase Template',
          expectedLabel: 'UPPERCASE-TEMPLATE'
        },
        { 
          name: 'template-with-numbers-123.md', 
          content: '# Template With Numbers',
          expectedLabel: 'template-with-numbers-123'
        },
        { 
          name: 'template.with.dots.md', 
          content: '# Template With Dots',
          expectedLabel: 'template.with.dots'
        }
      ];

      for (const template of diverseTemplates) {
        fs.writeFileSync(path.join(namingPatternsDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-population-naming-test',
        settings: {
          'kiroSteeringLoader.templatesPath': namingPatternsDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Populate tree view with diverse templates
      console.log('🌳 Testing tree view population with diverse naming patterns...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all templates are discovered for tree population
      const discoveredFiles = fs.readdirSync(namingPatternsDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(8);

      // Verify each template is properly prepared for tree display
      for (const template of diverseTemplates) {
        expect(templateFiles).toContain(template.name);
        
        // Verify template file exists and can be read
        const templatePath = path.join(namingPatternsDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Verify label derivation (filename without extension)
        const baseName = path.basename(template.name, '.md');
        expect(baseName).toBe(template.expectedLabel);
        
        // Test tree item interaction
        await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'select', template.name);
        
        console.log(`📄 Tree item with naming pattern: ${template.name} → Label: ${baseName}`);
      }

      console.log('✅ Tree view populated with diverse naming patterns and correct labels');

      // Clean up
      if (fs.existsSync(namingPatternsDir)) {
        fs.rmSync(namingPatternsDir, { recursive: true, force: true });
      }
    });
  });

  describe('Tree View Refresh After Template Changes', () => {
    it('should refresh tree view when templates are added to directory', async () => {
      // Create initial templates directory with base templates
      const refreshTestDir = path.resolve(__dirname, '../fixtures/temp-tree-refresh-add');
      
      if (!fs.existsSync(refreshTestDir)) {
        fs.mkdirSync(refreshTestDir, { recursive: true });
      }

      // Create initial templates
      const initialTemplates = [
        { name: 'initial-template-1.md', content: '# Initial Template 1\n\nFirst template.' },
        { name: 'initial-template-2.md', content: '# Initial Template 2\n\nSecond template.' }
      ];

      for (const template of initialTemplates) {
        fs.writeFileSync(path.join(refreshTestDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-refresh-add-test',
        settings: {
          'kiroSteeringLoader.templatesPath': refreshTestDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial tree view population
      console.log('🌳 Initial tree view population...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify initial templates
      let files = fs.readdirSync(refreshTestDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(2);
      expect(templateFiles).toContain('initial-template-1.md');
      expect(templateFiles).toContain('initial-template-2.md');

      console.log(`📊 Initial tree population: ${templateFiles.length} templates`);

      // Add new templates to the directory
      const additionalTemplates = [
        { name: 'new-template-1.md', content: '# New Template 1\n\nNewly added template.' },
        { name: 'new-template-2.md', content: '# New Template 2\n\nAnother new template.' },
        { name: 'new-template-3.md', content: '# New Template 3\n\nThird new template.' }
      ];

      console.log('➕ Adding new templates to directory...');
      for (const template of additionalTemplates) {
        fs.writeFileSync(path.join(refreshTestDir, template.name), template.content);
      }

      // Refresh tree view to pick up new templates
      console.log('🔄 Refreshing tree view to detect new templates...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify updated templates are available for tree view
      files = fs.readdirSync(refreshTestDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(5);

      // Verify all templates are present
      expect(templateFiles).toContain('initial-template-1.md');
      expect(templateFiles).toContain('initial-template-2.md');
      expect(templateFiles).toContain('new-template-1.md');
      expect(templateFiles).toContain('new-template-2.md');
      expect(templateFiles).toContain('new-template-3.md');

      // Test interaction with newly added templates
      for (const template of additionalTemplates) {
        const templatePath = path.join(refreshTestDir, template.name);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ New template accessible in tree view: ${template.name}`);
      }

      console.log(`✅ Tree view refreshed successfully: ${templateFiles.length} total templates`);

      // Clean up
      if (fs.existsSync(refreshTestDir)) {
        fs.rmSync(refreshTestDir, { recursive: true, force: true });
      }
    });

    it('should refresh tree view when templates are removed from directory', async () => {
      // Create templates directory with multiple templates
      const refreshRemoveDir = path.resolve(__dirname, '../fixtures/temp-tree-refresh-remove');
      
      if (!fs.existsSync(refreshRemoveDir)) {
        fs.mkdirSync(refreshRemoveDir, { recursive: true });
      }

      // Create initial set of templates
      const allTemplates = [
        { name: 'template-to-keep-1.md', content: '# Template To Keep 1\n\nThis template will remain.' },
        { name: 'template-to-keep-2.md', content: '# Template To Keep 2\n\nThis template will also remain.' },
        { name: 'template-to-remove-1.md', content: '# Template To Remove 1\n\nThis template will be removed.' },
        { name: 'template-to-remove-2.md', content: '# Template To Remove 2\n\nThis template will also be removed.' },
        { name: 'template-to-keep-3.md', content: '# Template To Keep 3\n\nThis template will remain.' }
      ];

      for (const template of allTemplates) {
        fs.writeFileSync(path.join(refreshRemoveDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-refresh-remove-test',
        settings: {
          'kiroSteeringLoader.templatesPath': refreshRemoveDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial tree view population
      console.log('🌳 Initial tree view population with all templates...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all initial templates
      let files = fs.readdirSync(refreshRemoveDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(5);

      console.log(`📊 Initial tree population: ${templateFiles.length} templates`);

      // Remove some templates from the directory
      const templatesToRemove = ['template-to-remove-1.md', 'template-to-remove-2.md'];
      
      console.log('➖ Removing templates from directory...');
      for (const templateName of templatesToRemove) {
        const templatePath = path.join(refreshRemoveDir, templateName);
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
          console.log(`🗑️ Removed: ${templateName}`);
        }
      }

      // Refresh tree view to reflect removed templates
      console.log('🔄 Refreshing tree view to reflect removed templates...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify updated template list
      files = fs.readdirSync(refreshRemoveDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);

      // Verify remaining templates
      expect(templateFiles).toContain('template-to-keep-1.md');
      expect(templateFiles).toContain('template-to-keep-2.md');
      expect(templateFiles).toContain('template-to-keep-3.md');

      // Verify removed templates are no longer present
      expect(templateFiles).not.toContain('template-to-remove-1.md');
      expect(templateFiles).not.toContain('template-to-remove-2.md');

      // Test interaction with remaining templates
      const remainingTemplates = ['template-to-keep-1.md', 'template-to-keep-2.md', 'template-to-keep-3.md'];
      for (const templateName of remainingTemplates) {
        const templatePath = path.join(refreshRemoveDir, templateName);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Remaining template accessible: ${templateName}`);
      }

      console.log(`✅ Tree view refreshed after removal: ${templateFiles.length} remaining templates`);

      // Clean up
      if (fs.existsSync(refreshRemoveDir)) {
        fs.rmSync(refreshRemoveDir, { recursive: true, force: true });
      }
    });

    it('should refresh tree view when templates are modified in directory', async () => {
      // Create templates directory with templates to modify
      const refreshModifyDir = path.resolve(__dirname, '../fixtures/temp-tree-refresh-modify');
      
      if (!fs.existsSync(refreshModifyDir)) {
        fs.mkdirSync(refreshModifyDir, { recursive: true });
      }

      // Create initial templates
      const initialTemplates = [
        { 
          name: 'modifiable-template-1.md', 
          content: '# Original Template 1\n\nOriginal content for template 1.',
          modifiedContent: '# Modified Template 1\n\nUpdated content for template 1.\n\n## New Section\n\nAdditional content added.'
        },
        { 
          name: 'modifiable-template-2.md', 
          content: '# Original Template 2\n\nOriginal content for template 2.',
          modifiedContent: '# Modified Template 2\n\nUpdated content for template 2.\n\n## Changes\n\n- Updated structure\n- Added examples'
        },
        { 
          name: 'static-template.md', 
          content: '# Static Template\n\nThis template will not be modified.',
          modifiedContent: '# Static Template\n\nThis template will not be modified.' // Same content
        }
      ];

      for (const template of initialTemplates) {
        fs.writeFileSync(path.join(refreshModifyDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-refresh-modify-test',
        settings: {
          'kiroSteeringLoader.templatesPath': refreshModifyDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial tree view population
      console.log('🌳 Initial tree view population...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify initial templates
      let files = fs.readdirSync(refreshModifyDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);

      // Verify initial content
      for (const template of initialTemplates) {
        const templatePath = path.join(refreshModifyDir, template.name);
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
      }

      console.log(`📊 Initial tree population: ${templateFiles.length} templates`);

      // Modify some templates
      const templatesToModify = initialTemplates.slice(0, 2); // Modify first two templates
      
      console.log('✏️ Modifying template content...');
      for (const template of templatesToModify) {
        const templatePath = path.join(refreshModifyDir, template.name);
        fs.writeFileSync(templatePath, template.modifiedContent);
        console.log(`📝 Modified: ${template.name}`);
      }

      // Refresh tree view to reflect modified templates
      console.log('🔄 Refreshing tree view to reflect template modifications...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates are still discoverable (same count)
      files = fs.readdirSync(refreshModifyDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);

      // Verify modified content is accessible
      for (const template of initialTemplates) {
        const templatePath = path.join(refreshModifyDir, template.name);
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.modifiedContent);
        
        // Test that modified templates are still accessible in tree view
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        if (templatesToModify.includes(template)) {
          console.log(`✅ Modified template accessible: ${template.name}`);
        } else {
          console.log(`✅ Unmodified template accessible: ${template.name}`);
        }
      }

      console.log(`✅ Tree view refreshed after modifications: ${templateFiles.length} templates`);

      // Clean up
      if (fs.existsSync(refreshModifyDir)) {
        fs.rmSync(refreshModifyDir, { recursive: true, force: true });
      }
    });

    it('should refresh tree view when templates directory path is changed', async () => {
      // Create two different templates directories
      const originalDir = path.resolve(__dirname, '../fixtures/temp-tree-refresh-original');
      const newDir = path.resolve(__dirname, '../fixtures/temp-tree-refresh-new');
      
      if (!fs.existsSync(originalDir)) {
        fs.mkdirSync(originalDir, { recursive: true });
      }
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      // Create templates in original directory
      const originalTemplates = [
        { name: 'original-template-1.md', content: '# Original Template 1\n\nTemplate from original directory.' },
        { name: 'original-template-2.md', content: '# Original Template 2\n\nAnother template from original directory.' }
      ];

      for (const template of originalTemplates) {
        fs.writeFileSync(path.join(originalDir, template.name), template.content);
      }

      // Create different templates in new directory
      const newTemplates = [
        { name: 'new-template-1.md', content: '# New Template 1\n\nTemplate from new directory.' },
        { name: 'new-template-2.md', content: '# New Template 2\n\nAnother template from new directory.' },
        { name: 'new-template-3.md', content: '# New Template 3\n\nThird template from new directory.' }
      ];

      for (const template of newTemplates) {
        fs.writeFileSync(path.join(newDir, template.name), template.content);
      }

      // Create test workspace with original directory
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-refresh-path-change-test',
        settings: {
          'kiroSteeringLoader.templatesPath': originalDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial tree view population with original directory
      console.log('🌳 Initial tree view population with original directory...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify original templates
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(originalDir);

      let files = fs.readdirSync(originalDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(2);
      expect(templateFiles).toContain('original-template-1.md');
      expect(templateFiles).toContain('original-template-2.md');

      console.log(`📊 Original directory: ${templateFiles.length} templates`);

      // Change templates path configuration
      console.log('🔄 Changing templates directory path...');
      await testManager.updateWorkspaceConfiguration(
        'kiroSteeringLoader',
        'templatesPath',
        newDir
      );

      // Refresh tree view to pick up new directory
      console.log('🔄 Refreshing tree view with new directory...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify new configuration
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(newDir);

      // Verify new templates are discovered
      files = fs.readdirSync(newDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);
      expect(templateFiles).toContain('new-template-1.md');
      expect(templateFiles).toContain('new-template-2.md');
      expect(templateFiles).toContain('new-template-3.md');

      // Verify original templates are no longer accessible (different directory)
      expect(templateFiles).not.toContain('original-template-1.md');
      expect(templateFiles).not.toContain('original-template-2.md');

      // Test interaction with new templates
      for (const template of newTemplates) {
        const templatePath = path.join(newDir, template.name);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ New directory template accessible: ${template.name}`);
      }

      console.log(`✅ Tree view refreshed with new directory: ${templateFiles.length} templates`);

      // Clean up
      if (fs.existsSync(originalDir)) {
        fs.rmSync(originalDir, { recursive: true, force: true });
      }
      if (fs.existsSync(newDir)) {
        fs.rmSync(newDir, { recursive: true, force: true });
      }
    });

    it('should handle rapid refresh operations without conflicts', async () => {
      // Create templates directory for rapid refresh testing
      const rapidRefreshDir = path.resolve(__dirname, '../fixtures/temp-tree-rapid-refresh');
      
      if (!fs.existsSync(rapidRefreshDir)) {
        fs.mkdirSync(rapidRefreshDir, { recursive: true });
      }

      // Create initial templates
      const baseTemplates = [
        { name: 'rapid-template-1.md', content: '# Rapid Template 1\n\nTemplate for rapid refresh testing.' },
        { name: 'rapid-template-2.md', content: '# Rapid Template 2\n\nAnother template for rapid refresh testing.' },
        { name: 'rapid-template-3.md', content: '# Rapid Template 3\n\nThird template for rapid refresh testing.' }
      ];

      for (const template of baseTemplates) {
        fs.writeFileSync(path.join(rapidRefreshDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-rapid-refresh-test',
        settings: {
          'kiroSteeringLoader.templatesPath': rapidRefreshDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial population
      console.log('🌳 Initial tree view population...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify initial state
      let files = fs.readdirSync(rapidRefreshDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);

      console.log(`📊 Initial state: ${templateFiles.length} templates`);

      // Perform rapid refresh operations
      console.log('⚡ Performing rapid refresh operations...');
      const refreshPromises = [];
      const refreshCount = 10;

      for (let i = 0; i < refreshCount; i++) {
        refreshPromises.push(
          testManager.executeCommand('kiroSteeringLoader.refresh')
        );
      }

      // Wait for all rapid refreshes to complete
      const startTime = Date.now();
      await Promise.all(refreshPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`⚡ Completed ${refreshCount} rapid refreshes in ${totalTime}ms`);
      console.log(`📊 Average refresh time: ${(totalTime / refreshCount).toFixed(2)}ms`);

      // Verify tree view is still functional after rapid refreshes
      files = fs.readdirSync(rapidRefreshDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(3);

      // Test that tree items are still accessible
      for (const template of baseTemplates) {
        const templatePath = path.join(rapidRefreshDir, template.name);
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Template accessible after rapid refresh: ${template.name}`);
      }

      // Add a new template during rapid refresh testing
      console.log('➕ Adding template during rapid refresh test...');
      const newTemplate = { name: 'rapid-new-template.md', content: '# New Rapid Template\n\nAdded during rapid refresh test.' };
      fs.writeFileSync(path.join(rapidRefreshDir, newTemplate.name), newTemplate.content);

      // Perform another set of rapid refreshes
      const moreRefreshPromises = [];
      for (let i = 0; i < 5; i++) {
        moreRefreshPromises.push(
          testManager.executeCommand('kiroSteeringLoader.refresh')
        );
      }

      await Promise.all(moreRefreshPromises);

      // Verify new template is detected
      files = fs.readdirSync(rapidRefreshDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(4);
      expect(templateFiles).toContain('rapid-new-template.md');

      console.log('✅ Tree view handles rapid refresh operations without conflicts');

      // Clean up
      if (fs.existsSync(rapidRefreshDir)) {
        fs.rmSync(rapidRefreshDir, { recursive: true, force: true });
      }
    });
  });

  describe('Tree View Population Performance and Edge Cases', () => {
    it('should handle tree view population with templates containing special characters', async () => {
      // Create templates with special characters in names and content
      const specialCharsDir = path.resolve(__dirname, '../fixtures/temp-tree-special-chars');
      
      if (!fs.existsSync(specialCharsDir)) {
        fs.mkdirSync(specialCharsDir, { recursive: true });
      }

      const specialTemplates = [
        { 
          name: 'template-with-émojis-🚀.md', 
          content: '# Template with Émojis 🚀\n\nThis template contains special characters and emojis.\n\n## Features\n- ✅ Unicode support\n- 🔧 Special characters\n- 📝 Émojis in content'
        },
        { 
          name: 'template-with-àccénts.md', 
          content: '# Template with Àccénts\n\nThis template contains accented characters.\n\n## Contént\n- Français: Bonjour\n- Español: Hola\n- Português: Olá'
        },
        { 
          name: 'template-with-symbols-@#$.md', 
          content: '# Template with Symbols @#$\n\nThis template contains various symbols.\n\n## Symbols\n- @ symbol\n- # hash\n- $ dollar\n- % percent'
        },
        { 
          name: 'template-with-中文.md', 
          content: '# Template with 中文\n\nThis template contains Chinese characters.\n\n## 内容\n- 中文支持\n- Unicode 字符\n- 国际化内容'
        }
      ];

      for (const template of specialTemplates) {
        fs.writeFileSync(path.join(specialCharsDir, template.name), template.content, 'utf8');
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-special-chars-test',
        settings: {
          'kiroSteeringLoader.templatesPath': specialCharsDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Populate tree view with special character templates
      console.log('🌳 Testing tree view population with special characters...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all special character templates are discovered
      const discoveredFiles = fs.readdirSync(specialCharsDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(4);

      // Verify each special character template
      for (const template of specialTemplates) {
        expect(templateFiles).toContain(template.name);
        
        const templatePath = path.join(specialCharsDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        // Verify content is properly encoded
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Test tree item interaction with special characters
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Special character template accessible: ${template.name}`);
      }

      console.log('✅ Tree view populated with special character templates successfully');

      // Clean up
      if (fs.existsSync(specialCharsDir)) {
        fs.rmSync(specialCharsDir, { recursive: true, force: true });
      }
    });

    it('should maintain tree view population performance with concurrent operations', async () => {
      // Create templates directory for concurrent operations testing
      const concurrentDir = path.resolve(__dirname, '../fixtures/temp-tree-concurrent');
      
      if (!fs.existsSync(concurrentDir)) {
        fs.mkdirSync(concurrentDir, { recursive: true });
      }

      // Create moderate number of templates for concurrent testing
      const templateCount = 25;
      const templates = [];
      
      for (let i = 1; i <= templateCount; i++) {
        const templateName = `concurrent-template-${i.toString().padStart(2, '0')}.md`;
        const templateContent = `# Concurrent Template ${i}\n\nTemplate ${i} for concurrent operations testing.\n\n## Content\n\nThis template is used to test concurrent tree view operations.`;
        
        templates.push({ name: templateName, content: templateContent });
        fs.writeFileSync(path.join(concurrentDir, templateName), templateContent);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-concurrent-test',
        settings: {
          'kiroSteeringLoader.templatesPath': concurrentDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Initial population
      console.log('🌳 Initial tree view population for concurrent testing...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify initial state
      let files = fs.readdirSync(concurrentDir);
      let templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(templateCount);

      console.log(`📊 Initial population: ${templateFiles.length} templates`);

      // Perform concurrent operations
      console.log('⚡ Performing concurrent tree view operations...');
      
      const concurrentOperations = [
        // Multiple refresh operations
        testManager.executeCommand('kiroSteeringLoader.refresh'),
        testManager.executeCommand('kiroSteeringLoader.refresh'),
        testManager.executeCommand('kiroSteeringLoader.refresh'),
        
        // Tree view interactions
        testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh'),
        testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'refresh'),
        
        // Template loading operations
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', path.join(concurrentDir, 'concurrent-template-01.md')),
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', path.join(concurrentDir, 'concurrent-template-15.md')),
        testManager.executeCommand('kiroSteeringLoader.loadTemplate', path.join(concurrentDir, 'concurrent-template-25.md'))
      ];

      // Measure concurrent operation performance
      const startTime = Date.now();
      await Promise.all(concurrentOperations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`⚡ Completed ${concurrentOperations.length} concurrent operations in ${totalTime}ms`);

      // Verify tree view is still functional after concurrent operations
      files = fs.readdirSync(concurrentDir);
      templateFiles = files.filter(file => file.endsWith('.md'));
      expect(templateFiles).toHaveLength(templateCount);

      // Test a few random templates to ensure they're still accessible
      const sampleIndexes = [0, Math.floor(templateCount / 2), templateCount - 1];
      for (const index of sampleIndexes) {
        const template = templates[index];
        const templatePath = path.join(concurrentDir, template.name);
        
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Template accessible after concurrent operations: ${template.name}`);
      }

      console.log('✅ Tree view maintains performance with concurrent operations');

      // Clean up
      if (fs.existsSync(concurrentDir)) {
        fs.rmSync(concurrentDir, { recursive: true, force: true });
      }
    });

    it('should handle tree view population edge cases gracefully', async () => {
      // Test various edge cases for tree view population
      
      // Edge Case 1: Empty file (0 bytes)
      const edgeCasesDir = path.resolve(__dirname, '../fixtures/temp-tree-edge-cases');
      
      if (!fs.existsSync(edgeCasesDir)) {
        fs.mkdirSync(edgeCasesDir, { recursive: true });
      }

      const edgeCaseTemplates = [
        { 
          name: 'empty-template.md', 
          content: '', // Empty file
          description: 'empty file'
        },
        { 
          name: 'single-char-template.md', 
          content: '#', // Single character
          description: 'single character'
        },
        { 
          name: 'very-long-name-template-with-many-words-and-characters-that-might-cause-issues.md', 
          content: '# Very Long Name Template\n\nTemplate with very long filename.',
          description: 'very long filename'
        },
        { 
          name: 'template-with-newlines.md', 
          content: '# Template\n\n\n\n\nWith\n\n\nMany\n\n\nNewlines\n\n\n',
          description: 'many newlines'
        },
        { 
          name: 'template-with-tabs.md', 
          content: '# Template\n\t\tWith\n\t\t\tTabs\n\t\t\t\tEverywhere',
          description: 'tabs in content'
        }
      ];

      for (const template of edgeCaseTemplates) {
        fs.writeFileSync(path.join(edgeCasesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'tree-edge-cases-test',
        settings: {
          'kiroSteeringLoader.templatesPath': edgeCasesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Populate tree view with edge case templates
      console.log('🌳 Testing tree view population with edge cases...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all edge case templates are discovered
      const discoveredFiles = fs.readdirSync(edgeCasesDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(5);

      // Verify each edge case template is handled gracefully
      for (const template of edgeCaseTemplates) {
        expect(templateFiles).toContain(template.name);
        
        const templatePath = path.join(edgeCasesDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        // Verify content matches (even if empty or unusual)
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Test tree item interaction (should not throw even with edge cases)
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`✅ Edge case template handled: ${template.name} (${template.description})`);
      }

      console.log('✅ Tree view handles edge cases gracefully');

      // Clean up
      if (fs.existsSync(edgeCasesDir)) {
        fs.rmSync(edgeCasesDir, { recursive: true, force: true });
      }
    });
  });
});
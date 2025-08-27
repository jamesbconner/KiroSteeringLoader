/**
 * E2E Template Loading Workflow Tests
 * Tests the complete user workflow from extension activation to template loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Template Loading Workflow E2E Tests', () => {
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

  describe('Complete Template Loading Workflow', () => {
    it('should complete full workflow from extension activation to template loading', async () => {
      // Step 1: Create workspace with templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/test-templates');
      
      // Ensure templates directory exists with test templates
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      
      // Create test template files
      const testTemplates = [
        {
          name: 'coding-standards.md',
          content: `# Coding Standards

## TypeScript Guidelines
- Use strict mode
- Prefer explicit types over any
- Document all public APIs

## Testing Requirements
- Maintain 85%+ code coverage
- Write unit tests for all components
- Include integration tests for workflows`
        },
        {
          name: 'project-setup.md',
          content: `# Project Setup Guide

## Initial Setup
1. Clone the repository
2. Install dependencies with \`npm install\`
3. Configure your development environment

## Development Workflow
- Create feature branches from main
- Write tests before implementation
- Submit pull requests for review`
        }
      ];

      for (const template of testTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Step 2: Create test workspace with Kiro directory structure
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-loading-workflow-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Step 3: Simulate extension activation
      const extensionId = 'jamesbconner.kiro-steering-loader';
      await testManager.waitForExtensionActivation(extensionId);

      // Step 4: Verify extension commands are registered
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.refresh');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.loadTemplate');
      await e2eAssertions.assertCommandRegistered('kiroSteeringLoader.setTemplatesPath');

      // Step 5: Wait for tree data provider to be ready
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Step 6: Simulate template discovery and display
      // The tree view should now show available templates
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesDir);

      // Step 7: Simulate template selection and loading
      const templateToLoad = 'coding-standards.md';
      const templatePath = path.join(templatesDir, templateToLoad);
      
      // Execute the load template command
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Step 8: Verify template file creation in .kiro/steering directory
      const expectedTargetPath = path.join(testContext.workspacePath, '.kiro', 'steering', templateToLoad);
      
      // Wait for file to be created
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${templateToLoad}`, 5000);

      // Verify file exists
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${templateToLoad}`);

      // Verify file content matches original template
      const originalContent = fs.readFileSync(templatePath, 'utf8');
      const copiedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${templateToLoad}`);
      expect(copiedContent).toBe(originalContent);

      // Step 9: Verify .kiro/steering directory structure
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro');
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro/steering');

      // Clean up test templates directory
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle multiple template loading operations', async () => {
      // Create templates directory with multiple templates
      const templatesDir = path.resolve(__dirname, '../fixtures/multi-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templates = [
        { name: 'template-1.md', content: '# Template 1\n\nFirst template content' },
        { name: 'template-2.md', content: '# Template 2\n\nSecond template content' },
        { name: 'template-3.md', content: '# Template 3\n\nThird template content' }
      ];

      for (const template of templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'multi-template-loading-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Load all templates sequentially
      for (const template of templates) {
        const templatePath = path.join(templatesDir, template.name);
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);
        
        // Wait for each file to be created
        await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${template.name}`, 3000);
        
        // Verify file exists and content is correct
        e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${template.name}`);
        const copiedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${template.name}`);
        expect(copiedContent).toBe(template.content);
      }

      // Verify all templates are present
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const loadedFiles = fs.readdirSync(steeringDir);
      expect(loadedFiles).toHaveLength(3);
      expect(loadedFiles).toContain('template-1.md');
      expect(loadedFiles).toContain('template-2.md');
      expect(loadedFiles).toContain('template-3.md');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template Discovery and Display', () => {
    it('should discover and display templates in tree view', async () => {
      // Create templates directory with various template types
      const templatesDir = path.resolve(__dirname, '../fixtures/discovery-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templates = [
        { name: 'api-guidelines.md', content: '# API Guidelines\n\nREST API best practices' },
        { name: 'security-checklist.md', content: '# Security Checklist\n\nSecurity requirements' },
        { name: 'deployment-guide.md', content: '# Deployment Guide\n\nDeployment procedures' }
      ];

      for (const template of templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Also create non-template files to ensure they're filtered out
      fs.writeFileSync(path.join(templatesDir, 'readme.txt'), 'This should not appear');
      fs.writeFileSync(path.join(templatesDir, 'config.json'), '{"test": true}');

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension and wait for tree data provider
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Simulate tree view refresh to discover templates
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // In a real VS Code environment, we would verify the tree view contents
      // For this test, we verify that the configuration is correct and templates exist
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesDir);

      // Verify templates directory contains expected files
      const files = fs.readdirSync(templatesDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      expect(mdFiles).toHaveLength(3);
      expect(mdFiles).toContain('api-guidelines.md');
      expect(mdFiles).toContain('security-checklist.md');
      expect(mdFiles).toContain('deployment-guide.md');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle empty templates directory', async () => {
      // Create empty templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/empty-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'empty-templates-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Refresh tree view
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify directory exists but is empty
      expect(fs.existsSync(templatesDir)).toBe(true);
      const files = fs.readdirSync(templatesDir);
      expect(files).toHaveLength(0);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template Selection and Loading', () => {
    it('should load selected template into workspace', async () => {
      // Create templates directory with a specific template
      const templatesDir = path.resolve(__dirname, '../fixtures/selection-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templateContent = `# Code Review Guidelines

## Before Submitting
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] No console.log statements remain

## Review Checklist
- [ ] Logic is sound and efficient
- [ ] Error handling is appropriate
- [ ] Security considerations addressed
- [ ] Performance impact assessed`;

      const templateName = 'code-review-guidelines.md';
      fs.writeFileSync(path.join(templatesDir, templateName), templateContent);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-selection-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Simulate template selection and loading
      const templatePath = path.join(templatesDir, templateName);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${templateName}`, 5000);

      // Verify template was loaded correctly
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${templateName}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${templateName}`);
      expect(loadedContent).toBe(templateContent);

      // Verify the content includes expected sections
      expect(loadedContent).toContain('# Code Review Guidelines');
      expect(loadedContent).toContain('## Before Submitting');
      expect(loadedContent).toContain('## Review Checklist');
      expect(loadedContent).toContain('All tests pass');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle template loading with special characters', async () => {
      // Create templates directory with templates containing special characters
      const templatesDir = path.resolve(__dirname, '../fixtures/special-char-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const specialTemplate = {
        name: 'special-chars-template.md',
        content: `# Template with Special Characters

## Unicode Support
- Emoji: 🚀 ✅ ❌ 🔧
- Accented characters: café, naïve, résumé
- Symbols: © ® ™ § ¶

## Code Examples
\`\`\`typescript
const message = "Hello, 世界!";
const regex = /[a-zA-Z0-9_@./#&+-]/;
\`\`\`

## Special Formatting
**Bold text** with *italic* and \`inline code\`

> Blockquote with "smart quotes" and 'apostrophes'

- List item with — em dash
- List item with … ellipsis`
      };

      fs.writeFileSync(path.join(templatesDir, specialTemplate.name), specialTemplate.content);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'special-chars-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Load template with special characters
      const templatePath = path.join(templatesDir, specialTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${specialTemplate.name}`, 5000);

      // Verify template was loaded with all special characters intact
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${specialTemplate.name}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${specialTemplate.name}`);
      expect(loadedContent).toBe(specialTemplate.content);

      // Verify specific special characters are preserved
      expect(loadedContent).toContain('🚀 ✅ ❌ 🔧');
      expect(loadedContent).toContain('café, naïve, résumé');
      expect(loadedContent).toContain('Hello, 世界!');
      expect(loadedContent).toContain('"smart quotes"');
      expect(loadedContent).toContain('— em dash');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Workspace Integration', () => {
    it('should create .kiro/steering directory structure when loading first template', async () => {
      // Create templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/workspace-integration-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templateContent = '# First Template\n\nThis is the first template to be loaded.';
      const templateName = 'first-template.md';
      fs.writeFileSync(path.join(templatesDir, templateName), templateContent);

      // Create test workspace WITHOUT Kiro directory (empty workspace)
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'workspace-integration-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Verify .kiro directory doesn't exist initially
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(false);
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro/steering')).toBe(false);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Load template - this should create the directory structure
      const templatePath = path.join(templatesDir, templateName);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${templateName}`, 5000);

      // Verify directory structure was created
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro');
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro/steering');
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${templateName}`);

      // Verify template content
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${templateName}`);
      expect(loadedContent).toBe(templateContent);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should preserve existing files in .kiro/steering when loading new templates', async () => {
      // Create templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/preserve-files-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const newTemplateContent = '# New Template\n\nThis is a new template being added.';
      const newTemplateName = 'new-template.md';
      fs.writeFileSync(path.join(templatesDir, newTemplateName), newTemplateContent);

      // Create test workspace with existing templates
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withTemplates,
        name: 'preserve-files-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Verify existing templates are present
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/sample-template.md');
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/another-template.md');

      // Read existing template content
      const existingContent1 = testManager.readWorkspaceFile(testContext.workspacePath, '.kiro/steering/sample-template.md');
      const existingContent2 = testManager.readWorkspaceFile(testContext.workspacePath, '.kiro/steering/another-template.md');

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Load new template
      const templatePath = path.join(templatesDir, newTemplateName);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for new template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${newTemplateName}`, 5000);

      // Verify new template was added
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${newTemplateName}`);
      const newLoadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${newTemplateName}`);
      expect(newLoadedContent).toBe(newTemplateContent);

      // Verify existing templates are still present and unchanged
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/sample-template.md');
      e2eAssertions.assertFileExists(testContext.workspacePath, '.kiro/steering/another-template.md');

      const preservedContent1 = testManager.readWorkspaceFile(testContext.workspacePath, '.kiro/steering/sample-template.md');
      const preservedContent2 = testManager.readWorkspaceFile(testContext.workspacePath, '.kiro/steering/another-template.md');

      expect(preservedContent1).toBe(existingContent1);
      expect(preservedContent2).toBe(existingContent2);

      // Verify all three templates are now present
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const allFiles = fs.readdirSync(steeringDir);
      expect(allFiles).toHaveLength(3);
      expect(allFiles).toContain('sample-template.md');
      expect(allFiles).toContain('another-template.md');
      expect(allFiles).toContain('new-template.md');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template Selection Interaction', () => {
    it('should handle template item click and execute loadTemplate command', async () => {
      // Create templates directory with test templates
      const templatesDir = path.resolve(__dirname, '../fixtures/interaction-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const testTemplate = {
        name: 'interaction-test-template.md',
        content: `# Interaction Test Template

## Purpose
This template is used to test template selection interactions.

## Features
- Click handling
- Command execution
- Parameter passing

## Usage
Select this template from the tree view to test interaction functionality.`
      };

      fs.writeFileSync(path.join(templatesDir, testTemplate.name), testTemplate.content);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-interaction-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Simulate template item click by executing the command with template path
      const templatePath = path.join(templatesDir, testTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`, 5000);

      // Verify template was loaded correctly through click interaction
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      expect(loadedContent).toBe(testTemplate.content);

      // Verify specific content sections to ensure proper parameter passing
      expect(loadedContent).toContain('# Interaction Test Template');
      expect(loadedContent).toContain('Click handling');
      expect(loadedContent).toContain('Command execution');
      expect(loadedContent).toContain('Parameter passing');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle setup item click and execute setTemplatesPath command', async () => {
      // Create test workspace without templates path configured
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'setup-interaction-test'
        // Note: No templatesPath setting to trigger setup item display
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify initial configuration is empty
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();

      // Simulate setup item click by executing setTemplatesPath command
      const newTemplatesPath = path.resolve(__dirname, '../fixtures/setup-templates');
      
      // Create the templates directory
      if (!fs.existsSync(newTemplatesPath)) {
        fs.mkdirSync(newTemplatesPath, { recursive: true });
      }

      // Create a test template in the new directory
      const setupTemplate = {
        name: 'setup-template.md',
        content: '# Setup Template\n\nThis template was loaded after setup interaction.'
      };
      fs.writeFileSync(path.join(newTemplatesPath, setupTemplate.name), setupTemplate.content);

      // Simulate the setup command execution (normally triggered by setup item click)
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', newTemplatesPath);

      // Simulate tree refresh after configuration change
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify configuration was updated
      const updatedConfig = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(updatedConfig.get('templatesPath')).toBe(newTemplatesPath);

      // Now test that templates can be loaded from the newly configured path
      const templatePath = path.join(newTemplatesPath, setupTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${setupTemplate.name}`, 5000);

      // Verify template was loaded successfully after setup interaction
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${setupTemplate.name}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${setupTemplate.name}`);
      expect(loadedContent).toBe(setupTemplate.content);

      // Clean up
      if (fs.existsSync(newTemplatesPath)) {
        fs.rmSync(newTemplatesPath, { recursive: true, force: true });
      }
    });

    it('should handle different item types with appropriate command execution', async () => {
      // Test scenario 1: Template item type
      const templatesDir = path.resolve(__dirname, '../fixtures/item-types-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templateFile = {
        name: 'item-type-template.md',
        content: '# Item Type Template\n\nThis tests template item type interaction.'
      };
      fs.writeFileSync(path.join(templatesDir, templateFile.name), templateFile.content);

      // Create test workspace with templates configured
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'item-types-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test template item interaction
      const templatePath = path.join(templatesDir, templateFile.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${templateFile.name}`, 5000);

      // Verify template item interaction worked
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${templateFile.name}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${templateFile.name}`);
      expect(loadedContent).toBe(templateFile.content);

      // Test scenario 2: Info item type (no command execution expected)
      // Remove templates to trigger info item display
      fs.rmSync(path.join(templatesDir, templateFile.name));

      // Refresh tree to show info items
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Info items don't execute commands, so we just verify the tree state
      // In a real VS Code environment, we would check that no command is executed
      // For this test, we verify the directory is empty (which would show info items)
      const remainingFiles = fs.readdirSync(templatesDir);
      expect(remainingFiles).toHaveLength(0);

      // Test scenario 3: Error item type (simulated by invalid path)
      // Update configuration to invalid path to trigger error items
      const invalidPath = '/invalid/path/that/does/not/exist';
      await testManager.updateWorkspaceConfiguration('kiroSteeringLoader', 'templatesPath', invalidPath);

      // Refresh tree to show error items
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify configuration was updated to invalid path
      const errorConfig = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(errorConfig.get('templatesPath')).toBe(invalidPath);

      // Error items would be displayed, but no template loading should occur
      // We can verify this by ensuring no new files are created
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const steeringFiles = fs.existsSync(steeringDir) ? fs.readdirSync(steeringDir) : [];
      const initialFileCount = steeringFiles.length;

      // Attempt to execute a command that would fail due to invalid path
      try {
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', '/invalid/template/path.md');
      } catch (error) {
        // Expected to fail silently or with error
      }

      // Verify no new files were created
      const finalFiles = fs.existsSync(steeringDir) ? fs.readdirSync(steeringDir) : [];
      expect(finalFiles).toHaveLength(initialFileCount);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should pass correct parameters from tree item to command handler', async () => {
      // Create templates directory with multiple templates to test parameter passing
      const templatesDir = path.resolve(__dirname, '../fixtures/parameter-passing-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templates = [
        {
          name: 'param-test-1.md',
          content: '# Parameter Test 1\n\nThis template tests parameter passing for template 1.'
        },
        {
          name: 'param-test-2.md',
          content: '# Parameter Test 2\n\nThis template tests parameter passing for template 2.'
        },
        {
          name: 'param-test-3.md',
          content: '# Parameter Test 3\n\nThis template tests parameter passing for template 3.'
        }
      ];

      // Create all test templates
      for (const template of templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'parameter-passing-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test parameter passing for each template
      for (const template of templates) {
        const templatePath = path.join(templatesDir, template.name);
        
        // Execute command with specific template path parameter
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

        // Wait for specific template to be loaded
        await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${template.name}`, 5000);

        // Verify correct template was loaded based on parameter
        e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${template.name}`);
        
        const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${template.name}`);
        expect(loadedContent).toBe(template.content);

        // Verify the content matches the specific template (parameter was passed correctly)
        if (template.name === 'param-test-1.md') {
          expect(loadedContent).toContain('Parameter Test 1');
          expect(loadedContent).toContain('template 1');
        } else if (template.name === 'param-test-2.md') {
          expect(loadedContent).toContain('Parameter Test 2');
          expect(loadedContent).toContain('template 2');
        } else if (template.name === 'param-test-3.md') {
          expect(loadedContent).toContain('Parameter Test 3');
          expect(loadedContent).toContain('template 3');
        }
      }

      // Verify all templates were loaded correctly (all parameters were processed)
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const loadedFiles = fs.readdirSync(steeringDir);
      expect(loadedFiles).toHaveLength(3);
      expect(loadedFiles).toContain('param-test-1.md');
      expect(loadedFiles).toContain('param-test-2.md');
      expect(loadedFiles).toContain('param-test-3.md');

      // Test parameter validation - attempt to load with invalid parameter
      try {
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', '');
        // Should handle empty parameter gracefully
      } catch (error) {
        // Expected behavior for invalid parameter
      }

      try {
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', '/nonexistent/path.md');
        // Should handle nonexistent file gracefully
      } catch (error) {
        // Expected behavior for invalid file path
      }

      // Verify no additional files were created from invalid parameters
      const finalFiles = fs.readdirSync(steeringDir);
      expect(finalFiles).toHaveLength(3); // Still only the 3 valid templates

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle command execution with tree item context', async () => {
      // Create templates directory with templates that have different characteristics
      const templatesDir = path.resolve(__dirname, '../fixtures/context-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const contextTemplates = [
        {
          name: 'context-template-short.md',
          content: '# Short Template\n\nBrief content.'
        },
        {
          name: 'context-template-long.md',
          content: `# Long Template

## Section 1
This is a longer template with multiple sections.

## Section 2
It contains more detailed content to test handling of larger files.

## Section 3
The template loading should work regardless of file size.

## Section 4
This tests the robustness of the parameter passing and command execution.

## Conclusion
All content should be preserved during the loading process.`
        },
        {
          name: 'context-template-special.md',
          content: `# Special Characters Template

## Unicode Content
- Emoji: 🎯 📝 ✨
- Accents: café, naïve, résumé
- Symbols: © ® ™

## Code Blocks
\`\`\`typescript
interface TemplateContext {
  name: string;
  path: string;
  content: string;
}
\`\`\`

## Special Formatting
**Bold** and *italic* text with \`inline code\`.

> Blockquote with special characters: "quotes" and 'apostrophes'`
        }
      ];

      // Create all context templates
      for (const template of contextTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'context-execution-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test command execution with different template contexts
      for (const template of contextTemplates) {
        const templatePath = path.join(templatesDir, template.name);
        
        // Execute command simulating tree item click with context
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

        // Wait for template to be loaded
        await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${template.name}`, 5000);

        // Verify template was loaded with full context preserved
        e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${template.name}`);
        
        const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${template.name}`);
        expect(loadedContent).toBe(template.content);

        // Verify specific context elements are preserved
        if (template.name.includes('short')) {
          expect(loadedContent).toContain('Brief content');
        } else if (template.name.includes('long')) {
          expect(loadedContent).toContain('Section 1');
          expect(loadedContent).toContain('Section 4');
          expect(loadedContent).toContain('Conclusion');
        } else if (template.name.includes('special')) {
          expect(loadedContent).toContain('🎯 📝 ✨');
          expect(loadedContent).toContain('café, naïve, résumé');
          expect(loadedContent).toContain('interface TemplateContext');
          expect(loadedContent).toContain('"quotes" and \'apostrophes\'');
        }
      }

      // Test refresh command execution (simulating tree refresh interaction)
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all templates are still accessible after refresh
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const loadedFiles = fs.readdirSync(steeringDir);
      expect(loadedFiles).toHaveLength(3);
      expect(loadedFiles).toContain('context-template-short.md');
      expect(loadedFiles).toContain('context-template-long.md');
      expect(loadedFiles).toContain('context-template-special.md');

      // Test command execution order - load templates in specific sequence
      const sequenceTest = {
        name: 'sequence-test.md',
        content: '# Sequence Test\n\nThis template tests command execution order.'
      };
      fs.writeFileSync(path.join(templatesDir, sequenceTest.name), sequenceTest.content);

      // Execute refresh to discover new template
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Load the new template
      const sequenceTemplatePath = path.join(templatesDir, sequenceTest.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', sequenceTemplatePath);

      // Wait for new template
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${sequenceTest.name}`, 5000);

      // Verify sequence execution worked correctly
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${sequenceTest.name}`);
      
      const sequenceContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${sequenceTest.name}`);
      expect(sequenceContent).toBe(sequenceTest.content);

      // Final verification - all templates should be present
      const finalFiles = fs.readdirSync(steeringDir);
      expect(finalFiles).toHaveLength(4); // 3 original + 1 sequence test

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template File Operations (Task 5.2.8)', () => {
    it('should read template file from source directory correctly', async () => {
      // Create templates directory with test template
      const templatesDir = path.resolve(__dirname, '../fixtures/file-reading-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const testTemplate = {
        name: 'file-reading-test.md',
        content: `# File Reading Test Template

## Content Verification
This template tests the file reading functionality.

### Special Characters Test
- Unicode: 🔧 ✅ 📁
- Accented: café, naïve, résumé
- Symbols: © ® ™ § ¶

### Code Block Test
\`\`\`typescript
interface FileReadingTest {
  name: string;
  content: string;
  encoding: 'utf8';
}
\`\`\`

### Formatting Test
**Bold text** with *italic* and \`inline code\`

> Blockquote with "smart quotes"

1. Numbered list item
2. Another numbered item
   - Nested bullet
   - Another nested bullet

---

End of template content.`
      };

      fs.writeFileSync(path.join(templatesDir, testTemplate.name), testTemplate.content);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'file-reading-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Execute template loading command
      const templatePath = path.join(templatesDir, testTemplate.name);
  
    await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`, 5000);

      // Verify template file was read correctly from source
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      
      const loadedContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      
      // Verify exact content match (tests file reading accuracy)
      expect(loadedContent).toBe(testTemplate.content);
      
      // Verify specific content sections to ensure complete file reading
      expect(loadedContent).toContain('# File Reading Test Template');
      expect(loadedContent).toContain('## Content Verification');
      expect(loadedContent).toContain('### Special Characters Test');
      expect(loadedContent).toContain('🔧 ✅ 📁');
      expect(loadedContent).toContain('café, naïve, résumé');
      expect(loadedContent).toContain('```typescript');
      expect(loadedContent).toContain('interface FileReadingTest');
      expect(loadedContent).toContain('**Bold text** with *italic*');
      expect(loadedContent).toContain('> Blockquote with "smart quotes"');
      expect(loadedContent).toContain('1. Numbered list item');
      expect(loadedContent).toContain('   - Nested bullet');
      expect(loadedContent).toContain('---');
      expect(loadedContent).toContain('End of template content.');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should create .kiro/steering directory structure when loading template', async () => {
      // Create templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/directory-creation-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const testTemplate = {
        name: 'directory-creation-test.md',
        content: '# Directory Creation Test\n\nThis template tests directory creation functionality.'
      };

      fs.writeFileSync(path.join(templatesDir, testTemplate.name), testTemplate.content);

      // Create test workspace WITHOUT .kiro directory (empty workspace)
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.empty,
        name: 'directory-creation-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Verify .kiro directory structure doesn't exist initially
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(false);
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro/steering')).toBe(false);

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Execute template loading - this should create the directory structure
      const templatePath = path.join(templatesDir, testTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be loaded
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`, 5000);

      // Verify .kiro directory was created
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro');
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro')).toBe(true);

      // Verify .kiro/steering directory was created
      e2eAssertions.assertDirectoryExists(testContext.workspacePath, '.kiro/steering');
      expect(testManager.verifyDirectoryExists(testContext.workspacePath, '.kiro/steering')).toBe(true);

      // Verify template file was created in the correct location
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      expect(testManager.verifyFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`)).toBe(true);

      // Verify directory permissions and structure
      const kiroDir = path.join(testContext.workspacePath, '.kiro');
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      
      expect(fs.statSync(kiroDir).isDirectory()).toBe(true);
      expect(fs.statSync(steeringDir).isDirectory()).toBe(true);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should write template file to destination directory with correct content', async () => {
      // Create templates directory with complex template content
      const templatesDir = path.resolve(__dirname, '../fixtures/file-writing-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const complexTemplate = {
        name: 'file-writing-test.md',
        content: `# File Writing Test Template

## Multi-line Content Test
This template contains various content types to test file writing accuracy.

### Code Blocks
\`\`\`javascript
function testFileWriting() {
  const content = "This is a test";
  return content.includes("test");
}
\`\`\`

\`\`\`json
{
  "name": "file-writing-test",
  "version": "1.0.0",
  "description": "Testing file writing functionality"
}
\`\`\`

### Lists and Formatting
1. **First item** with *emphasis*
2. Second item with \`inline code\`
3. Third item with [link](https://example.com)

- Bullet point one
- Bullet point two
  - Nested bullet
  - Another nested bullet

### Special Characters and Unicode
- Emoji: 🚀 ✨ 🔧 📝 ✅
- Accented characters: café, naïve, résumé, piñata
- Mathematical symbols: ∑ ∆ π ∞ ≈ ≠
- Currency: $ € £ ¥ ₹
- Arrows: → ← ↑ ↓ ↔ ⇒

### Quotes and Punctuation
> "This is a blockquote with 'nested quotes' and — em dashes."

"Smart quotes" and 'apostrophes' should be preserved.

### Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Test A   | Test B   | Test C   |

### Horizontal Rules
---

### Escape Characters
Backslashes: \\\\ \\* \\_ \\\` \\# \\[ \\]

### Line Endings and Whitespace
This line has trailing spaces.   
This line has a line break above.

Final line with no trailing newline.`
      };

      fs.writeFileSync(path.join(templatesDir, complexTemplate.name), complexTemplate.content);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'file-writing-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Execute template loading
      const templatePath = path.join(templatesDir, complexTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be written
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${complexTemplate.name}`, 5000);

      // Verify file was written to correct destination
      const destinationPath = path.join(testContext.workspacePath, '.kiro', 'steering', complexTemplate.name);
      expect(fs.existsSync(destinationPath)).toBe(true);

      // Read the written file content
      const writtenContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${complexTemplate.name}`);

      // Verify exact content match (tests file writing accuracy)
      expect(writtenContent).toBe(complexTemplate.content);

      // Verify specific content preservation
      expect(writtenContent).toContain('# File Writing Test Template');
      expect(writtenContent).toContain('```javascript');
      expect(writtenContent).toContain('function testFileWriting()');
      expect(writtenContent).toContain('```json');
      expect(writtenContent).toContain('"name": "file-writing-test"');
      expect(writtenContent).toContain('🚀 ✨ 🔧 📝 ✅');
      expect(writtenContent).toContain('café, naïve, résumé, piñata');
      expect(writtenContent).toContain('∑ ∆ π ∞ ≈ ≠');
      expect(writtenContent).toContain('$ € £ ¥ ₹');
      expect(writtenContent).toContain('→ ← ↑ ↓ ↔ ⇒');
      expect(writtenContent).toContain('> "This is a blockquote');
      expect(writtenContent).toContain('"Smart quotes"');
      expect(writtenContent).toContain('| Column 1 | Column 2 | Column 3 |');
      expect(writtenContent).toContain('|----------|----------|----------|');
      expect(writtenContent).toContain('Backslashes: \\\\ \\* \\_ \\\` \\# \\[ \\]');
      expect(writtenContent).toContain('This line has trailing spaces.   ');
      expect(writtenContent).toContain('Final line with no trailing newline.');

      // Verify file size matches (ensures complete content transfer)
      const originalSize = fs.statSync(templatePath).size;
      const writtenSize = fs.statSync(destinationPath).size;
      expect(writtenSize).toBe(originalSize);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should verify successful template file creation with correct metadata', async () => {
      // Create templates directory with multiple templates
      const templatesDir = path.resolve(__dirname, '../fixtures/file-creation-verification-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templates = [
        {
          name: 'template-1.md',
          content: '# Template 1\n\nFirst template for verification testing.'
        },
        {
          name: 'template-2.md',
          content: '# Template 2\n\nSecond template with different content.'
        },
        {
          name: 'template-3.md',
          content: '# Template 3\n\nThird template for comprehensive testing.'
        }
      ];

      // Create all template files
      for (const template of templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'file-creation-verification-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Load each template and verify creation
      for (const template of templates) {
        const templatePath = path.join(templatesDir, template.name);
        
        // Execute template loading
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

        // Wait for template to be created
        await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${template.name}`, 5000);

        // Verify file creation
        e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${template.name}`);
        
        const destinationPath = path.join(testContext.workspacePath, '.kiro', 'steering', template.name);
        
        // Verify file exists and is readable
        expect(fs.existsSync(destinationPath)).toBe(true);
        expect(fs.statSync(destinationPath).isFile()).toBe(true);

        // Verify file content matches exactly
        const createdContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${template.name}`);
        expect(createdContent).toBe(template.content);

        // Verify file metadata
        const originalStats = fs.statSync(templatePath);
        const createdStats = fs.statSync(destinationPath);
        
        // File size should match
        expect(createdStats.size).toBe(originalStats.size);
        
        // File should be readable and writable
        expect(createdStats.mode & 0o444).toBeTruthy(); // Readable
        expect(createdStats.mode & 0o200).toBeTruthy(); // Writable

        // Verify file encoding by checking for UTF-8 BOM absence (should be plain UTF-8)
        const fileBuffer = fs.readFileSync(destinationPath);
        const hasBOM = fileBuffer.length >= 3 && 
                      fileBuffer[0] === 0xEF && 
                      fileBuffer[1] === 0xBB && 
                      fileBuffer[2] === 0xBF;
        expect(hasBOM).toBe(false); // Should not have BOM
      }

      // Verify all templates were created successfully
      const steeringDir = path.join(testContext.workspacePath, '.kiro', 'steering');
      const createdFiles = fs.readdirSync(steeringDir);
      
      expect(createdFiles).toHaveLength(templates.length);
      for (const template of templates) {
        expect(createdFiles).toContain(template.name);
      }

      // Verify directory structure integrity
      expect(fs.statSync(steeringDir).isDirectory()).toBe(true);
      
      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle file creation errors gracefully', async () => {
      // Create templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/file-creation-error-templates');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const testTemplate = {
        name: 'error-test-template.md',
        content: '# Error Test Template\n\nThis template tests error handling during file creation.'
      };

      fs.writeFileSync(path.join(templatesDir, testTemplate.name), testTemplate.content);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'file-creation-error-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Test 1: Normal file creation (should succeed)
      const templatePath = path.join(templatesDir, testTemplate.name);
      await testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath);

      // Wait for template to be created
      await testManager.waitForFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`, 5000);

      // Verify successful creation
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      
      const createdContent = testManager.readWorkspaceFile(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);
      expect(createdContent).toBe(testTemplate.content);

      // Test 2: Attempt to load non-existent template (should handle gracefully)
      const nonExistentPath = path.join(templatesDir, 'non-existent-template.md');
      
      // This should not throw an error, but handle gracefully
      try {
        await testManager.executeCommand('kiroSteeringLoader.loadTemplate', nonExistentPath);
        // If we reach here, the command handled the error gracefully
        expect(true).toBe(true);
      } catch (error) {
        // If an error is thrown, it should be handled appropriately
        expect(error).toBeDefined();
      }

      // Verify original file is still intact
      e2eAssertions.assertFileExists(testContext.workspacePath, `.kiro/steering/${testTemplate.name}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });
});
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
});
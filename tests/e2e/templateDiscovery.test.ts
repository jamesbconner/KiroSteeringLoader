/**
 * E2E Template Discovery Tests
 * Tests template discovery from configured templates directory
 * 
 * Requirements: 3.1 - End-to-end tests that simulate real user workflows
 * Task: 5.2.4 Write template discovery E2E tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Template Discovery E2E Tests', () => {
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

  describe('Template Discovery from Configured Directory', () => {
    it('should discover all .md template files from configured templates directory', async () => {
      // Create templates directory with test templates
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-basic');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create test template files
      const testTemplates = [
        { name: 'api-guidelines.md', content: '# API Guidelines\n\nREST API development standards and best practices.' },
        { name: 'security-checklist.md', content: '# Security Checklist\n\nSecurity requirements and validation steps.' },
        { name: 'deployment-guide.md', content: '# Deployment Guide\n\nStep-by-step deployment procedures.' }
      ];

      for (const template of testTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace with configured templates path
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-basic-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      const extensionId = 'jamesbconner.kiro-steering-loader';
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify configuration is set correctly
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesDir);

      // Trigger template discovery through refresh
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates directory is accessible and contains expected templates
      expect(fs.existsSync(templatesDir)).toBe(true);
      const discoveredFiles = fs.readdirSync(templatesDir);
      const discoveredMdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(discoveredMdFiles).toHaveLength(3);
      expect(discoveredMdFiles).toContain('api-guidelines.md');
      expect(discoveredMdFiles).toContain('security-checklist.md');
      expect(discoveredMdFiles).toContain('deployment-guide.md');

      // Verify each template file can be read and parsed
      for (const templateFile of discoveredMdFiles) {
        const templatePath = path.join(templatesDir, templateFile);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toMatch(/^# /); // Should start with markdown header
        
        console.log(`✅ Template discovered and parsed: ${templateFile}`);
      }

      console.log('✅ Template discovery completed successfully');
      console.log(`📁 Discovered ${discoveredMdFiles.length} template files`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should properly detect and filter .md files from mixed file types', async () => {
      // Create templates directory with mixed file types
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-mixed');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create various file types - only .md files should be discovered as templates
      const testFiles = [
        { name: 'valid-template.md', content: '# Valid Template\n\nThis should be discovered as a template.' },
        { name: 'another-template.md', content: '# Another Template\n\nThis should also be discovered.' },
        { name: 'readme.txt', content: 'This is a text file and should be ignored.' },
        { name: 'config.json', content: '{"setting": "value"}' },
        { name: 'script.js', content: 'console.log("JavaScript file");' },
        { name: 'styles.css', content: 'body { margin: 0; }' },
        { name: 'document.docx', content: 'Binary document content' },
        { name: 'image.png', content: 'Binary image content' }
      ];

      for (const file of testFiles) {
        fs.writeFileSync(path.join(templatesDir, file.name), file.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-mixed-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all files exist in directory
      const allFiles = fs.readdirSync(templatesDir);
      expect(allFiles).toHaveLength(8);

      // Verify only .md files should be considered as templates
      const mdFiles = allFiles.filter(file => file.endsWith('.md'));
      expect(mdFiles).toHaveLength(2);
      expect(mdFiles).toContain('valid-template.md');
      expect(mdFiles).toContain('another-template.md');

      // Verify non-.md files are present but not considered templates
      const nonMdFiles = allFiles.filter(file => !file.endsWith('.md'));
      expect(nonMdFiles).toHaveLength(6);
      expect(nonMdFiles).toContain('readme.txt');
      expect(nonMdFiles).toContain('config.json');
      expect(nonMdFiles).toContain('script.js');
      expect(nonMdFiles).toContain('styles.css');

      // Verify template files can be properly parsed
      for (const mdFile of mdFiles) {
        const templatePath = path.join(templatesDir, mdFile);
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toMatch(/^# /); // Should start with markdown header
        expect(content).toContain('Template'); // Should contain template content
      }

      console.log('✅ Mixed file types handled correctly');
      console.log(`📄 Template files discovered: ${mdFiles.join(', ')}`);
      console.log(`🚫 Non-template files ignored: ${nonMdFiles.join(', ')}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle template files with various naming patterns', async () => {
      // Create templates directory with various naming patterns
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-naming');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const templateFiles = [
        { name: 'simple-name.md', content: '# Simple Name Template' },
        { name: 'CamelCase-Template.md', content: '# CamelCase Template' },
        { name: 'snake_case_template.md', content: '# Snake Case Template' },
        { name: 'kebab-case-template.md', content: '# Kebab Case Template' },
        { name: 'Template with spaces.md', content: '# Template With Spaces' },
        { name: 'UPPERCASE-TEMPLATE.md', content: '# Uppercase Template' },
        { name: 'template-with-numbers-123.md', content: '# Template With Numbers' },
        { name: 'template.with.dots.md', content: '# Template With Dots' }
      ];

      for (const template of templateFiles) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-naming-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all template files are discovered regardless of naming pattern
      const discoveredFiles = fs.readdirSync(templatesDir);
      const mdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(mdFiles).toHaveLength(8);
      
      // Verify specific naming patterns are handled
      expect(mdFiles).toContain('simple-name.md');
      expect(mdFiles).toContain('CamelCase-Template.md');
      expect(mdFiles).toContain('snake_case_template.md');
      expect(mdFiles).toContain('kebab-case-template.md');
      expect(mdFiles).toContain('Template with spaces.md');
      expect(mdFiles).toContain('UPPERCASE-TEMPLATE.md');
      expect(mdFiles).toContain('template-with-numbers-123.md');
      expect(mdFiles).toContain('template.with.dots.md');

      // Verify each template can be properly parsed
      for (const templateFile of templateFiles) {
        const templatePath = path.join(templatesDir, templateFile.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(templateFile.content);
        expect(content).toMatch(/^# /); // Should start with markdown header
      }

      console.log('✅ Various naming patterns discovered successfully');
      console.log(`📄 Discovered templates: ${mdFiles.join(', ')}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template Discovery with Various Directory Structures', () => {
    it('should discover templates in flat directory structure', async () => {
      // Create flat directory structure
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-flat');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create templates in flat structure
      const templates = [
        { name: 'template-1.md', content: '# Template 1\n\nFirst template in flat structure.' },
        { name: 'template-2.md', content: '# Template 2\n\nSecond template in flat structure.' },
        { name: 'template-3.md', content: '# Template 3\n\nThird template in flat structure.' }
      ];

      for (const template of templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-flat-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify flat structure discovery
      const discoveredFiles = fs.readdirSync(templatesDir);
      const mdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(mdFiles).toHaveLength(3);
      expect(mdFiles).toContain('template-1.md');
      expect(mdFiles).toContain('template-2.md');
      expect(mdFiles).toContain('template-3.md');

      // Verify no subdirectories exist (flat structure)
      const subdirs = discoveredFiles.filter(item => {
        const itemPath = path.join(templatesDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      expect(subdirs).toHaveLength(0);

      console.log('✅ Flat directory structure handled correctly');
      console.log(`📄 Templates in flat structure: ${mdFiles.join(', ')}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should discover templates in directory with subdirectories (but only root level templates)', async () => {
      // Create directory structure with subdirectories
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-nested');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create root level templates
      const rootTemplates = [
        { name: 'root-template-1.md', content: '# Root Template 1\n\nTemplate at root level.' },
        { name: 'root-template-2.md', content: '# Root Template 2\n\nAnother template at root level.' }
      ];

      for (const template of rootTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create subdirectories with templates (these should not be discovered)
      const subDir1 = path.join(templatesDir, 'category1');
      const subDir2 = path.join(templatesDir, 'category2');
      
      fs.mkdirSync(subDir1, { recursive: true });
      fs.mkdirSync(subDir2, { recursive: true });

      // Create templates in subdirectories
      fs.writeFileSync(path.join(subDir1, 'nested-template-1.md'), '# Nested Template 1\n\nThis should not be discovered.');
      fs.writeFileSync(path.join(subDir2, 'nested-template-2.md'), '# Nested Template 2\n\nThis should also not be discovered.');

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-nested-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify only root level templates are discovered
      const rootFiles = fs.readdirSync(templatesDir);
      const rootMdFiles = rootFiles.filter(file => {
        const filePath = path.join(templatesDir, file);
        return fs.statSync(filePath).isFile() && file.endsWith('.md');
      });
      
      expect(rootMdFiles).toHaveLength(2);
      expect(rootMdFiles).toContain('root-template-1.md');
      expect(rootMdFiles).toContain('root-template-2.md');

      // Verify subdirectories exist but their templates are not discovered at root level
      const subdirs = rootFiles.filter(item => {
        const itemPath = path.join(templatesDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      expect(subdirs).toHaveLength(2);
      expect(subdirs).toContain('category1');
      expect(subdirs).toContain('category2');

      // Verify nested templates exist but are not part of root discovery
      expect(fs.existsSync(path.join(subDir1, 'nested-template-1.md'))).toBe(true);
      expect(fs.existsSync(path.join(subDir2, 'nested-template-2.md'))).toBe(true);

      console.log('✅ Directory with subdirectories handled correctly');
      console.log(`📄 Root level templates: ${rootMdFiles.join(', ')}`);
      console.log(`📁 Subdirectories present: ${subdirs.join(', ')}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle empty templates directory gracefully', async () => {
      // Create empty templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-empty');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Ensure directory is empty
      const files = fs.readdirSync(templatesDir);
      expect(files).toHaveLength(0);

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-empty-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify directory exists but is empty
      expect(fs.existsSync(templatesDir)).toBe(true);
      const discoveredFiles = fs.readdirSync(templatesDir);
      expect(discoveredFiles).toHaveLength(0);

      // Verify configuration is still set correctly
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(templatesDir);

      console.log('✅ Empty templates directory handled gracefully');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle non-existent templates directory', async () => {
      // Use a path that doesn't exist
      const nonExistentDir = path.resolve(__dirname, '../fixtures/non-existent-templates-discovery');
      
      // Ensure directory doesn't exist
      if (fs.existsSync(nonExistentDir)) {
        fs.rmSync(nonExistentDir, { recursive: true, force: true });
      }
      expect(fs.existsSync(nonExistentDir)).toBe(false);

      // Create test workspace with non-existent templates path
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-nonexistent-test',
        settings: {
          'kiroSteeringLoader.templatesPath': nonExistentDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify directory still doesn't exist
      expect(fs.existsSync(nonExistentDir)).toBe(false);

      // Verify configuration is set but directory is invalid
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(nonExistentDir);

      // Extension should handle this gracefully without crashing
      console.log('✅ Non-existent templates directory handled gracefully');
    });

    it('should handle large number of templates efficiently', async () => {
      // Create directory with many templates to test performance
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-large');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create 100 template files
      const templateCount = 100;
      const templates = [];
      
      for (let i = 1; i <= templateCount; i++) {
        const templateName = `template-${i.toString().padStart(3, '0')}.md`;
        const templateContent = `# Template ${i}\n\nThis is template number ${i} for testing large datasets.\n\n## Content\n\nSome example content for template ${i}.`;
        
        templates.push({ name: templateName, content: templateContent });
        fs.writeFileSync(path.join(templatesDir, templateName), templateContent);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-large-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Measure discovery time
      const startTime = Date.now();
      await testManager.executeCommand('kiroSteeringLoader.refresh');
      const endTime = Date.now();
      const discoveryTime = endTime - startTime;

      // Verify all templates are discovered
      const discoveredFiles = fs.readdirSync(templatesDir);
      const mdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(mdFiles).toHaveLength(templateCount);
      
      // Verify templates are properly named and ordered
      const sortedTemplates = mdFiles.sort();
      expect(sortedTemplates[0]).toBe('template-001.md');
      expect(sortedTemplates[templateCount - 1]).toBe('template-100.md');

      // Verify a few random templates can be parsed
      const sampleIndexes = [0, Math.floor(templateCount / 2), templateCount - 1];
      for (const index of sampleIndexes) {
        const templatePath = path.join(templatesDir, sortedTemplates[index]);
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toMatch(/^# Template \d+/);
        expect(content).toContain('testing large datasets');
      }

      console.log(`✅ Large template set (${templateCount} templates) discovered in ${discoveryTime}ms`);
      console.log(`📄 First template: ${sortedTemplates[0]}`);
      console.log(`📄 Last template: ${sortedTemplates[templateCount - 1]}`);

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });

  describe('Template File Parsing and Validation', () => {
    it('should properly parse template files with various markdown content', async () => {
      // Create templates with different markdown structures
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-parsing');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const complexTemplates = [
        {
          name: 'simple-template.md',
          content: '# Simple Template\n\nBasic template content.'
        },
        {
          name: 'complex-template.md',
          content: `# Complex Template

## Overview
This is a complex template with multiple sections.

### Features
- Feature 1
- Feature 2
- Feature 3

### Code Example
\`\`\`typescript
interface Example {
  name: string;
  value: number;
}
\`\`\`

### Links
[Documentation](https://example.com)

### Tables
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
`
        },
        {
          name: 'frontmatter-template.md',
          content: `---
title: "Template with Frontmatter"
author: "Test Author"
version: "1.0.0"
---

# Template with Frontmatter

This template includes YAML frontmatter.

## Content
Template content goes here.
`
        },
        {
          name: 'unicode-template.md',
          content: `# Unicode Template 🚀

## Emojis and Special Characters
- ✅ Checkmark
- ❌ Cross mark
- 🔧 Tools
- 📝 Notes

## International Text
- English: Hello World
- Spanish: Hola Mundo
- French: Bonjour le Monde
- Japanese: こんにちは世界
- Chinese: 你好世界
`
        }
      ];

      for (const template of complexTemplates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-parsing-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all complex templates are discovered
      const discoveredFiles = fs.readdirSync(templatesDir);
      const mdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(mdFiles).toHaveLength(4);
      expect(mdFiles).toContain('simple-template.md');
      expect(mdFiles).toContain('complex-template.md');
      expect(mdFiles).toContain('frontmatter-template.md');
      expect(mdFiles).toContain('unicode-template.md');

      // Verify each template can be properly parsed and contains expected content
      for (const template of complexTemplates) {
        const templatePath = path.join(templatesDir, template.name);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Verify specific content based on template type
        if (template.name === 'simple-template.md') {
          expect(content).toMatch(/^# Simple Template/);
        } else if (template.name === 'complex-template.md') {
          expect(content).toContain('## Overview');
          expect(content).toContain('```typescript');
          expect(content).toContain('| Column 1 | Column 2 |');
        } else if (template.name === 'frontmatter-template.md') {
          expect(content).toMatch(/^---\n/);
          expect(content).toContain('title: "Template with Frontmatter"');
        } else if (template.name === 'unicode-template.md') {
          expect(content).toContain('🚀');
          expect(content).toContain('こんにちは世界');
          expect(content).toContain('你好世界');
        }
        
        console.log(`✅ Template parsed successfully: ${template.name}`);
      }

      console.log('✅ Various markdown content structures parsed correctly');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });

    it('should handle templates with different file encodings', async () => {
      // Create templates directory
      const templatesDir = path.resolve(__dirname, '../fixtures/temp-discovery-encoding');
      
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Create templates with UTF-8 encoding (standard)
      const utf8Templates = [
        {
          name: 'utf8-template.md',
          content: '# UTF-8 Template\n\nStandard UTF-8 encoded template with special characters: áéíóú ñ'
        },
        {
          name: 'ascii-template.md',
          content: '# ASCII Template\n\nBasic ASCII template without special characters.'
        }
      ];

      for (const template of utf8Templates) {
        fs.writeFileSync(path.join(templatesDir, template.name), template.content, 'utf8');
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'template-discovery-encoding-test',
        settings: {
          'kiroSteeringLoader.templatesPath': templatesDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger template discovery
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates are discovered
      const discoveredFiles = fs.readdirSync(templatesDir);
      const mdFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(mdFiles).toHaveLength(2);
      expect(mdFiles).toContain('utf8-template.md');
      expect(mdFiles).toContain('ascii-template.md');

      // Verify templates can be read with correct encoding
      for (const template of utf8Templates) {
        const templatePath = path.join(templatesDir, template.name);
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        if (template.name === 'utf8-template.md') {
          expect(content).toContain('áéíóú ñ');
        }
        
        console.log(`✅ Template encoding handled correctly: ${template.name}`);
      }

      console.log('✅ Different file encodings handled correctly');

      // Clean up
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true });
      }
    });
  });
});
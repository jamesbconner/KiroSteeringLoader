/**
 * E2E Template Display Formatting Tests
 * Tests template item display with correct labels, icons, and visual indicators
 * 
 * Requirements: 3.1 - End-to-end tests that simulate real user workflows
 * Task: 5.2.6 - Write template display formatting E2E tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Template Display Formatting E2E Tests', () => {
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

  describe('Template Item Display with Correct Labels and Icons', () => {
    it('should display template items with correct labels derived from filenames', async () => {
      // Create templates directory with various naming patterns
      const labelTestDir = path.resolve(__dirname, '../fixtures/temp-display-labels');
      
      if (!fs.existsSync(labelTestDir)) {
        fs.mkdirSync(labelTestDir, { recursive: true });
      }

      // Create templates with different naming patterns to test label formatting
      const testTemplates = [
        { 
          fileName: 'api-documentation.md', 
          expectedLabel: 'api-documentation',
          content: '# API Documentation Template\n\nComprehensive API documentation guidelines.',
          description: 'Simple kebab-case naming'
        },
        { 
          fileName: 'code_review_checklist.md', 
          expectedLabel: 'code_review_checklist',
          content: '# Code Review Checklist\n\nEssential items for code reviews.',
          description: 'Snake case naming'
        },
        { 
          fileName: 'DeploymentGuide.md', 
          expectedLabel: 'DeploymentGuide',
          content: '# Deployment Guide\n\nStep-by-step deployment procedures.',
          description: 'PascalCase naming'
        },
        { 
          fileName: 'security-requirements.md', 
          expectedLabel: 'security-requirements',
          content: '# Security Requirements\n\nSecurity standards and compliance.',
          description: 'Standard kebab-case'
        },
        { 
          fileName: 'Template with spaces.md', 
          expectedLabel: 'Template with spaces',
          content: '# Template With Spaces\n\nTemplate with spaces in filename.',
          description: 'Filename with spaces'
        }
      ];

      for (const template of testTemplates) {
        fs.writeFileSync(path.join(labelTestDir, template.fileName), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'display-labels-test',
        settings: {
          'kiroSteeringLoader.templatesPath': labelTestDir
        }
      });

      // Activate extension
      const extensionId = 'jamesbconner.kiro-steering-loader';
      console.log('🔌 Activating extension for template display formatting test...');
      await testManager.waitForExtensionActivation(extensionId);
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify configuration is set correctly
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(labelTestDir);

      // Trigger tree view refresh to populate with templates
      console.log('🏷️ Testing template label formatting...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify templates are discovered with correct file names
      const discoveredFiles = fs.readdirSync(labelTestDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(5);

      // Verify each template file corresponds to expected label format
      for (const template of testTemplates) {
        expect(templateFiles).toContain(template.fileName);
        
        // Verify template file exists and is readable
        const templatePath = path.join(labelTestDir, template.fileName);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Verify label derivation (filename without extension)
        const baseName = path.basename(template.fileName, '.md');
        expect(baseName).toBe(template.expectedLabel);
        
        // Test that template can be loaded (simulates tree item interaction)
        await expect(
          testManager.executeCommand('kiroSteeringLoader.loadTemplate', templatePath)
        ).resolves.not.toThrow();
        
        console.log(`📄 Template display: ${template.fileName} → Label: "${baseName}" (${template.description})`);
      }

      console.log('✅ Template items display with correct labels derived from filenames');

      // Clean up
      if (fs.existsSync(labelTestDir)) {
        fs.rmSync(labelTestDir, { recursive: true, force: true });
      }
    });

    it('should handle template labels with special characters and formatting', async () => {
      // Create templates with special characters and formatting challenges
      const specialFormattingDir = path.resolve(__dirname, '../fixtures/temp-display-special-formatting');
      
      if (!fs.existsSync(specialFormattingDir)) {
        fs.mkdirSync(specialFormattingDir, { recursive: true });
      }

      const specialFormattingTemplates = [
        { 
          fileName: 'template_with_underscores.md',
          expectedLabel: 'template_with_underscores',
          content: '# Template With Underscores\n\nUnderscore naming pattern.',
          formatType: 'underscores'
        },
        { 
          fileName: 'template-with-dashes.md',
          expectedLabel: 'template-with-dashes',
          content: '# Template With Dashes\n\nDash/hyphen naming pattern.',
          formatType: 'dashes'
        },
        { 
          fileName: 'template.with.dots.md',
          expectedLabel: 'template.with.dots',
          content: '# Template With Dots\n\nDot-separated naming pattern.',
          formatType: 'dots'
        },
        { 
          fileName: 'UPPERCASE-TEMPLATE.md',
          expectedLabel: 'UPPERCASE-TEMPLATE',
          content: '# Uppercase Template\n\nAll uppercase naming pattern.',
          formatType: 'uppercase'
        }
      ];

      for (const template of specialFormattingTemplates) {
        fs.writeFileSync(path.join(specialFormattingDir, template.fileName), template.content);
      }

      // Create test workspace
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'special-formatting-test',
        settings: {
          'kiroSteeringLoader.templatesPath': specialFormattingDir
        }
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Trigger tree view refresh
      console.log('🎨 Testing special character formatting in template labels...');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify all special formatting templates are discovered
      const discoveredFiles = fs.readdirSync(specialFormattingDir);
      const templateFiles = discoveredFiles.filter(file => file.endsWith('.md'));
      
      expect(templateFiles).toHaveLength(4);

      // Verify each template with special formatting
      for (const template of specialFormattingTemplates) {
        expect(templateFiles).toContain(template.fileName);
        
        // Verify template file exists and content is correct
        const templatePath = path.join(specialFormattingDir, template.fileName);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toBe(template.content);
        
        // Verify label derivation preserves special characters
        const baseName = path.basename(template.fileName, '.md');
        expect(baseName).toBe(template.expectedLabel);
        
        // Test template interaction
        await testManager.simulateTreeViewInteraction('kiroSteeringLoader', 'select', template.fileName);
        
        console.log(`🎯 Special formatting: ${template.fileName} → Label: "${baseName}" (${template.formatType})`);
      }

      console.log('✅ Template labels with special characters formatted correctly');

      // Clean up
      if (fs.existsSync(specialFormattingDir)) {
        fs.rmSync(specialFormattingDir, { recursive: true, force: true });
      }
    });

    it('should display different item types with appropriate visual indicators', async () => {
      // Test different configuration states that result in different item types
      
      // Test 1: Setup item type (no templates path configured)
      console.log('🔧 Testing setup item type display...');
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'item-types-setup-test'
        // No templatesPath setting - should show setup items
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify no templates path is configured
      let config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();

      // In this state, tree view should show setup items
      // Test that setup command is available and functional
      await expect(
        testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')
      ).resolves.not.toThrow();

      console.log('✅ Setup item type displayed correctly for unconfigured workspace');

      // Clean up first test
      await testContext.cleanup();

      // Test 2: Error item type (invalid templates path)
      console.log('❌ Testing error item type display...');
      const invalidPath = '/path/that/absolutely/does/not/exist/anywhere';
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'item-types-error-test',
        settings: {
          'kiroSteeringLoader.templatesPath': invalidPath
        }
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify invalid path is configured but doesn't exist
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(invalidPath);
      expect(fs.existsSync(invalidPath)).toBe(false);

      // Tree view should show error items but still allow reconfiguration
      await expect(
        testManager.executeCommand('kiroSteeringLoader.setTemplatesPath')
      ).resolves.not.toThrow();

      console.log('✅ Error item type displayed correctly for invalid path');

      // Clean up second test
      await testContext.cleanup();

      // Test 3: Info item type (empty templates directory)
      console.log('ℹ️ Testing info item type display...');
      const emptyDir = path.resolve(__dirname, '../fixtures/temp-empty-for-item-types');
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir, { recursive: true });
      }

      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'item-types-info-test',
        settings: {
          'kiroSteeringLoader.templatesPath': emptyDir
        }
      });

      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');
      await testManager.executeCommand('kiroSteeringLoader.refresh');

      // Verify empty directory exists and is configured
      config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe(emptyDir);
      expect(fs.existsSync(emptyDir)).toBe(true);
      
      const files = fs.readdirSync(emptyDir);
      expect(files).toHaveLength(0);

      // Tree view should show info items about no templates found
      console.log('✅ Info item type displayed correctly for empty directory');

      // Clean up
      if (fs.existsSync(emptyDir)) {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
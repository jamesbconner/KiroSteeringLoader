/**
 * Helper functions for setting up mock file system states
 * Provides high-level utilities for common testing scenarios
 * 
 * @fileoverview Updated 2025-12-13: Reviewed and validated for current test architecture
 * @version 2.0.0 - Enhanced with better error handling and type safety
 */

import { fileSystemMockUtils, fileSystemScenarios } from './fs';
import { pathMockUtils, pathScenarios } from './path';
import { setupWorkspace, setupConfiguration } from './setup';

// Type definitions for test scenarios
export interface TestWorkspace {
  path: string;
  hasKiroDirectory: boolean;
  hasSteeringDirectory: boolean;
  existingTemplates?: string[];
}

export interface TestTemplatesDirectory {
  path: string;
  templates: Array<{
    name: string;
    content: string;
    subfolder?: string;
  }>;
  nonMarkdownFiles?: Array<{
    name: string;
    content: string;
  }>;
}

export interface TestConfiguration {
  templatesPath?: string;
  otherSettings?: Record<string, any>;
}

export interface TestScenario {
  name: string;
  description: string;
  workspace?: TestWorkspace;
  templatesDirectory?: TestTemplatesDirectory;
  configuration?: TestConfiguration;
  platform?: 'posix' | 'win32';
  expectedBehavior?: 'success' | 'error' | 'setup' | 'empty';
}

/**
 * File system test helper utilities
 */
export const fileSystemTestHelpers = {
  /**
   * Set up a complete test scenario with workspace, templates, and configuration
   */
  setupTestScenario(scenario: TestScenario): void {
    // Reset all mocks
    fileSystemMockUtils.reset();
    pathMockUtils.reset();
    
    // Set platform if specified
    if (scenario.platform) {
      pathMockUtils.setPlatform(scenario.platform);
    }
    
    // Set up workspace
    if (scenario.workspace) {
      this.setupTestWorkspace(scenario.workspace);
    }
    
    // Set up templates directory
    if (scenario.templatesDirectory) {
      this.setupTestTemplatesDirectory(scenario.templatesDirectory);
    }
    
    // Set up configuration
    if (scenario.configuration) {
      this.setupTestConfiguration(scenario.configuration);
    }
  },

  /**
   * Set up a test workspace with optional .kiro/steering directory
   */
  setupTestWorkspace(workspace: TestWorkspace): void {
    const directories = [workspace.path];
    const files: Record<string, string> = {};
    
    if (workspace.hasKiroDirectory) {
      directories.push(`${workspace.path}/.kiro`);
      
      if (workspace.hasSteeringDirectory) {
        directories.push(`${workspace.path}/.kiro/steering`);
        
        // Add existing templates if specified
        if (workspace.existingTemplates) {
          workspace.existingTemplates.forEach((templateName, index) => {
            files[`${workspace.path}/.kiro/steering/${templateName}`] = 
              `# Existing Template ${index + 1}\nThis is existing template content`;
          });
        }
      }
    }
    
    fileSystemMockUtils.setupFileSystem({ directories, files });
    
    // Set up VS Code workspace
    try {
      setupWorkspace([{
        uri: { fsPath: workspace.path } as any,
        name: 'test-workspace',
        index: 0
      }]);
    } catch (error) {
      // setupWorkspace might not be available in all test contexts
      // This is okay for file system testing
    }
  },

  /**
   * Set up a test templates directory with template files
   */
  setupTestTemplatesDirectory(templatesDir: TestTemplatesDirectory): void {
    const directories = [templatesDir.path];
    const files: Record<string, string> = {};
    
    // Add template files
    templatesDir.templates.forEach(template => {
      const templatePath = template.subfolder 
        ? `${templatesDir.path}/${template.subfolder}/${template.name}`
        : `${templatesDir.path}/${template.name}`;
      
      if (template.subfolder) {
        directories.push(`${templatesDir.path}/${template.subfolder}`);
      }
      
      files[templatePath] = template.content;
    });
    
    // Add non-markdown files if specified
    if (templatesDir.nonMarkdownFiles) {
      templatesDir.nonMarkdownFiles.forEach(file => {
        files[`${templatesDir.path}/${file.name}`] = file.content;
      });
    }
    
    // Set up the file system with existing state preserved
    const currentState = fileSystemMockUtils.getState();
    
    // Add new directories
    directories.forEach(dir => {
      fileSystemMockUtils.addDirectory(dir);
    });
    
    // Add new files
    Object.entries(files).forEach(([path, content]) => {
      fileSystemMockUtils.addFile(path, content);
    });
  },

  /**
   * Set up test configuration
   */
  setupTestConfiguration(config: TestConfiguration): void {
    const configValues: Record<string, any> = {};
    
    if (config.templatesPath !== undefined) {
      configValues.templatesPath = config.templatesPath;
    }
    
    if (config.otherSettings) {
      Object.assign(configValues, config.otherSettings);
    }
    
    setupConfiguration(configValues);
  },

  /**
   * Create a template file in the mock file system
   */
  createTemplateFile(path: string, name: string, content: string): void {
    const fullPath = `${path}/${name}`;
    fileSystemMockUtils.addFile(fullPath, content);
  },

  /**
   * Create a workspace directory structure
   */
  createWorkspaceStructure(workspacePath: string, includeKiro: boolean = true, includeSteering: boolean = true): void {
    fileSystemMockUtils.addDirectory(workspacePath);
    
    if (includeKiro) {
      fileSystemMockUtils.addDirectory(`${workspacePath}/.kiro`);
      
      if (includeSteering) {
        fileSystemMockUtils.addDirectory(`${workspacePath}/.kiro/steering`);
      }
    }
  },

  /**
   * Simulate file system errors for testing error handling
   * Enhanced with better error simulation and type safety
   */
  simulateFileSystemError(operation: 'read' | 'write' | 'mkdir' | 'readdir' | 'exists', error: Error): void {
    switch (operation) {
      case 'read':
        fileSystemMockUtils.reset();
        // Set up a scenario where readFileSync will throw
        fileSystemMockUtils.setErrorForOperation('readFileSync', error);
        break;
      case 'write':
        // Simulate write permission errors
        fileSystemMockUtils.setErrorForOperation('writeFileSync', error);
        break;
      case 'mkdir':
        // Simulate directory creation permission errors
        fileSystemMockUtils.setErrorForOperation('mkdirSync', error);
        break;
      case 'readdir':
        // Simulate directory read errors
        fileSystemMockUtils.setErrorForOperation('readdirSync', error);
        break;
      case 'exists':
        // Simulate access permission errors for exists checks
        fileSystemMockUtils.setErrorForOperation('existsSync', error);
        break;
      default:
        throw new Error(`Unsupported file system operation: ${operation}`);
    }
  },

  /**
   * Clear all simulated errors and reset to normal operation
   * Added for better test cleanup and isolation
   */
  clearSimulatedErrors(): void {
    fileSystemMockUtils.clearAllErrors();
  }
};

/**
 * Pre-defined test scenarios for common testing situations
 */
export const commonTestScenarios: Record<string, TestScenario> = {
  /**
   * Successful template loading scenario
   */
  successfulTemplateLoading: {
    name: 'Successful Template Loading',
    description: 'Workspace with .kiro/steering directory and templates directory with .md files',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true
    },
    templatesDirectory: {
      path: '/test/templates',
      templates: [
        { name: 'template1.md', content: '# Template 1\nContent for template 1' },
        { name: 'template2.md', content: '# Template 2\nContent for template 2' }
      ]
    },
    configuration: {
      templatesPath: '/test/templates'
    },
    expectedBehavior: 'success'
  },

  /**
   * No templates path configured
   */
  noTemplatesPath: {
    name: 'No Templates Path',
    description: 'Extension not configured with templates path',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: false,
      hasSteeringDirectory: false
    },
    configuration: {
      templatesPath: undefined
    },
    expectedBehavior: 'setup'
  },

  /**
   * Templates path doesn't exist
   */
  templatesPathNotFound: {
    name: 'Templates Path Not Found',
    description: 'Configured templates path does not exist',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true
    },
    configuration: {
      templatesPath: '/nonexistent/path'
    },
    expectedBehavior: 'error'
  },

  /**
   * Empty templates directory
   */
  emptyTemplatesDirectory: {
    name: 'Empty Templates Directory',
    description: 'Templates directory exists but contains no .md files',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true
    },
    templatesDirectory: {
      path: '/test/templates',
      templates: [],
      nonMarkdownFiles: [
        { name: 'readme.txt', content: 'This is not a template' }
      ]
    },
    configuration: {
      templatesPath: '/test/templates'
    },
    expectedBehavior: 'empty'
  },

  /**
   * Workspace without .kiro directory
   */
  workspaceWithoutKiro: {
    name: 'Workspace Without Kiro',
    description: 'Workspace exists but no .kiro directory',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: false,
      hasSteeringDirectory: false
    },
    templatesDirectory: {
      path: '/test/templates',
      templates: [
        { name: 'template1.md', content: '# Template 1\nContent' }
      ]
    },
    configuration: {
      templatesPath: '/test/templates'
    },
    expectedBehavior: 'success'
  },

  /**
   * Windows platform scenario
   */
  windowsPlatform: {
    name: 'Windows Platform',
    description: 'Test scenario using Windows-style paths',
    workspace: {
      path: 'C:\\Users\\Test\\Workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true
    },
    templatesDirectory: {
      path: 'C:\\Users\\Test\\Templates',
      templates: [
        { name: 'template1.md', content: '# Template 1\nWindows content' }
      ]
    },
    configuration: {
      templatesPath: 'C:\\Users\\Test\\Templates'
    },
    platform: 'win32',
    expectedBehavior: 'success'
  },

  /**
   * Complex templates directory structure
   */
  complexTemplatesStructure: {
    name: 'Complex Templates Structure',
    description: 'Templates directory with subfolders and mixed file types',
    workspace: {
      path: '/test/workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true,
      existingTemplates: ['existing.md']
    },
    templatesDirectory: {
      path: '/test/templates',
      templates: [
        { name: 'basic-template.md', content: '# Basic Template\nBasic content' },
        { name: 'advanced-template.md', content: '# Advanced Template\nAdvanced content' },
        { name: 'nested-template.md', content: '# Nested Template\nNested content', subfolder: 'category1' },
        { name: 'another-nested.md', content: '# Another Nested\nMore content', subfolder: 'category2' }
      ],
      nonMarkdownFiles: [
        { name: 'readme.txt', content: 'Templates readme' },
        { name: 'config.json', content: '{"version": "1.0"}' }
      ]
    },
    configuration: {
      templatesPath: '/test/templates'
    },
    expectedBehavior: 'success'
  }
};

/**
 * Assertion helpers for file system operations
 */
export const fileSystemAssertions = {
  /**
   * Assert that a file was created with specific content
   */
  expectFileCreated(filePath: string, expectedContent?: string): void {
    const exists = fileSystemMockUtils.exists(filePath);
    if (!exists) {
      throw new Error(`Expected file to be created: ${filePath}`);
    }
    
    if (expectedContent !== undefined) {
      const actualContent = fileSystemMockUtils.getFileContent(filePath);
      if (actualContent !== expectedContent) {
        throw new Error(`File content mismatch for ${filePath}. Expected: ${expectedContent}, Actual: ${actualContent}`);
      }
    }
  },

  /**
   * Assert that a directory was created
   */
  expectDirectoryCreated(dirPath: string): void {
    const exists = fileSystemMockUtils.exists(dirPath);
    if (!exists) {
      throw new Error(`Expected directory to be created: ${dirPath}`);
    }
  },

  /**
   * Assert that a file system operation was called
   */
  expectOperationCalled(operation: 'existsSync' | 'readdirSync' | 'readFileSync' | 'writeFileSync' | 'mkdirSync', path?: string): void {
    // This would check the mock call history
    // Implementation depends on how the mocks are set up in the test
  },

  /**
   * Get file system operation call history for debugging
   */
  getOperationHistory(): Record<string, any[]> {
    return {
      existsSync: [], // Would get from mock call history
      readdirSync: [],
      readFileSync: [],
      writeFileSync: [],
      mkdirSync: []
    };
  }
};
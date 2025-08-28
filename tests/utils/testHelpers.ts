/**
 * Comprehensive test helper utilities for common setup operations
 * Provides type-safe utilities for creating mock contexts, workspaces, and test scenarios
 */

import { vi, type MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import {
  createMockExtensionContext,
  createMockWorkspaceFolder,
  createMockWorkspaceConfiguration,
  createTemplateItem,
  type MockedExtensionContext
} from '../mocks/vscodeFactories';
import { fileSystemMockUtils, fileSystemScenarios } from '../mocks/fs';
import { pathMockUtils } from '../mocks/path';

/**
 * Interface for test workspace configuration
 */
export interface TestWorkspace {
  name: string;
  path: string;
  hasKiroDirectory: boolean;
  hasSteeringDirectory: boolean;
  existingTemplates: string[];
}

/**
 * Interface for test templates directory configuration
 */
export interface TestTemplatesDirectory {
  path: string;
  templates: Array<{
    name: string;
    content: string;
    isMarkdown: boolean;
  }>;
  subdirectories: string[];
}

/**
 * Interface for test configuration values
 */
export interface TestConfiguration {
  templatesPath?: string;
  [key: string]: any;
}

/**
 * Interface for complete test scenario setup
 */
export interface TestScenario {
  name: string;
  workspace?: TestWorkspace;
  templatesDirectory?: TestTemplatesDirectory;
  configuration?: TestConfiguration;
  expectedBehavior: 'success' | 'error' | 'setup' | 'info';
  expectedItems?: Array<{
    label: string;
    itemType: 'template' | 'info' | 'error' | 'setup';
    templatePath?: string;
  }>;
}

/**
 * Test helper class providing comprehensive utilities for test setup
 */
export class TestHelpers {
  private static instance: TestHelpers;
  private cleanupTasks: Array<() => void> = [];

  private constructor() { }

  /**
   * Get singleton instance of TestHelpers
   */
  static getInstance(): TestHelpers {
    if (!TestHelpers.instance) {
      TestHelpers.instance = new TestHelpers();
    }
    return TestHelpers.instance;
  }

  /**
   * Create a mock ExtensionContext with optional overrides
   */
  createMockExtensionContext(overrides: Partial<MockedExtensionContext> = {}): MockedExtensionContext {
    const context = createMockExtensionContext(overrides);

    // Track for cleanup
    this.cleanupTasks.push(() => {
      context.subscriptions.forEach(subscription => {
        if (subscription && typeof subscription.dispose === 'function') {
          subscription.dispose();
        }
      });
      context.subscriptions.length = 0;
    });

    return context;
  }

  /**
   * Create a mock workspace folder with proper structure
   */
  createMockWorkspaceFolder(
    name: string = 'test-workspace',
    fsPath: string = '/test/workspace'
  ): vscode.WorkspaceFolder {
    return createMockWorkspaceFolder(name, fsPath);
  }

  /**
   * Create multiple mock workspace folders
   */
  createMockWorkspaceFolders(
    folders: Array<{ name: string; path: string }>
  ): vscode.WorkspaceFolder[] {
    return folders.map((folder, index) => ({
      uri: {
        fsPath: folder.path,
        scheme: 'file',
        authority: '',
        path: folder.path,
        query: '',
        fragment: ''
      } as vscode.Uri,
      name: folder.name,
      index
    }));
  }

  /**
   * Create a mock workspace configuration with specified values
   */
  createMockConfiguration(values: Record<string, any> = {}): vscode.WorkspaceConfiguration {
    return createMockWorkspaceConfiguration(values);
  }

  /**
   * Set up a complete test workspace with file system structure
   */
  setupTestWorkspace(workspace: TestWorkspace): void {
    const { path: workspacePath, hasKiroDirectory, hasSteeringDirectory, existingTemplates } = workspace;

    const directories = [workspacePath];
    const files: Record<string, string> = {};

    if (hasKiroDirectory) {
      directories.push(`${workspacePath}/.kiro`);

      if (hasSteeringDirectory) {
        directories.push(`${workspacePath}/.kiro/steering`);

        // Add existing templates
        existingTemplates.forEach((templateName, index) => {
          files[`${workspacePath}/.kiro/steering/${templateName}`] =
            `# Existing Template ${index + 1}\nContent for ${templateName}`;
        });
      }
    }

    fileSystemMockUtils.setupFileSystem({ directories, files });
  }

  /**
   * Set up a test templates directory with specified structure
   */
  setupTestTemplatesDirectory(templatesDir: TestTemplatesDirectory): void {
    const { path: templatesPath, templates, subdirectories } = templatesDir;

    const directories = [templatesPath, ...subdirectories.map(sub => `${templatesPath}/${sub}`)];
    const files: Record<string, string> = {};

    templates.forEach(template => {
      const fileName = template.isMarkdown ? `${template.name}.md` : template.name;
      files[`${templatesPath}/${fileName}`] = template.content;
    });

    fileSystemMockUtils.setupFileSystem({ directories, files });
  }

  /**
   * Set up VS Code workspace and configuration mocks
   */
  setupVSCodeEnvironment(
    workspaceFolders?: vscode.WorkspaceFolder[],
    configuration?: TestConfiguration
  ): void {
    // This method is a placeholder for VS Code environment setup
    // The actual mock setup is handled by the test files directly
    // through their imports of the setup module
    console.warn('setupVSCodeEnvironment called but not implemented in testHelpers');
  }

  /**
   * Set up a complete test scenario with all components
   */
  setupTestScenario(scenario: TestScenario): void {
    // Reset all mocks first
    this.reset();

    // Set up workspace if specified
    if (scenario.workspace) {
      this.setupTestWorkspace(scenario.workspace);
      const workspaceFolder = this.createMockWorkspaceFolder(
        scenario.workspace.name,
        scenario.workspace.path
      );
      this.setupVSCodeEnvironment([workspaceFolder], scenario.configuration);
    } else {
      this.setupVSCodeEnvironment(undefined, scenario.configuration);
    }

    // Set up templates directory if specified
    if (scenario.templatesDirectory) {
      this.setupTestTemplatesDirectory(scenario.templatesDirectory);
    }
  }

  /**
   * Create a temporary directory path for testing
   */
  createTempDirectory(): string {
    const tempPath = `/tmp/test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    fileSystemMockUtils.addDirectory(tempPath);

    // Track for cleanup
    this.cleanupTasks.push(() => {
      fileSystemMockUtils.removeDirectory(tempPath);
    });

    return tempPath;
  }

  /**
   * Create a template file in the mock file system
   */
  createTemplateFile(filePath: string, content: string): void {
    fileSystemMockUtils.addFile(filePath, content);
  }

  /**
   * Remove a file from the mock file system
   */
  removeFile(filePath: string): void {
    fileSystemMockUtils.removeFile(filePath);
  }

  /**
   * Remove a directory from the mock file system
   */
  removeDirectory(dirPath: string): void {
    fileSystemMockUtils.removeDirectory(dirPath);
  }

  /**
   * Get the current state of the mock file system (for debugging)
   */
  getFileSystemState() {
    return fileSystemMockUtils.getState();
  }

  /**
   * Check if a path exists in the mock file system
   */
  pathExists(path: string): boolean {
    return fileSystemMockUtils.exists(path);
  }

  /**
   * Get file content from the mock file system
   */
  getFileContent(filePath: string): string | undefined {
    return fileSystemMockUtils.getFileContent(filePath);
  }

  /**
   * Simulate user selecting a folder in VS Code dialog
   */
  simulateUserSelectFolder(folderPath: string): void {
    try {
      const mockSetup = require('../mocks/setup');
      const vscode = mockSetup.vscode;
      if (vscode && vscode.window && vscode.window.showOpenDialog) {
        vscode.window.showOpenDialog.mockResolvedValueOnce([{
          fsPath: folderPath,
          scheme: 'file',
          authority: '',
          path: folderPath,
          query: '',
          fragment: ''
        }]);
      }
    } catch (error) {
      console.warn('Could not simulate user folder selection:', error);
    }
  }

  /**
   * Simulate user canceling VS Code dialog
   */
  simulateUserCancelDialog(): void {
    try {
      const mockSetup = require('../mocks/setup');
      const vscode = mockSetup.vscode;
      if (vscode && vscode.window && vscode.window.showOpenDialog) {
        vscode.window.showOpenDialog.mockResolvedValueOnce(undefined);
      }
    } catch (error) {
      console.warn('Could not simulate user dialog cancellation:', error);
    }
  }

  /**
   * Get all registered commands from VS Code mock
   */
  getRegisteredCommands(): Array<{ command: string; callback: Function }> {
    try {
      const mockSetup = require('../mocks/setup');
      const vscode = mockSetup.vscode;
      if (vscode && vscode.commands && vscode.commands.registerCommand) {
        const calls = vscode.commands.registerCommand.mock.calls;
        return calls.map(([command, callback]: [string, Function]) => ({ command, callback }));
      }
    } catch (error) {
      console.warn('Could not get registered commands:', error);
    }
    return [];
  }

  /**
   * Get all registered tree data providers from VS Code mock
   */
  getRegisteredTreeDataProviders(): Array<{ viewId: string; provider: any }> {
    try {
      const mockSetup = require('../mocks/setup');
      const vscode = mockSetup.vscode;
      if (vscode && vscode.window && vscode.window.registerTreeDataProvider) {
        const calls = vscode.window.registerTreeDataProvider.mock.calls;
        return calls.map(([viewId, provider]: [string, any]) => ({ viewId, provider }));
      }
    } catch (error) {
      console.warn('Could not get registered tree data providers:', error);
    }
    return [];
  }

  /**
   * Execute a registered command by name
   */
  async executeCommand(commandName: string, ...args: any[]): Promise<any> {
    const commands = this.getRegisteredCommands();
    const command = commands.find(cmd => cmd.command === commandName);

    if (!command) {
      throw new Error(`Command '${commandName}' not found`);
    }

    return await command.callback(...args);
  }

  /**
   * Reset all mocks and cleanup resources
   */
  reset(): void {
    // Execute cleanup tasks
    this.cleanupTasks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];

    // Reset all mock utilities
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    pathMockUtils.reset();

    // VS Code mock reset is handled by the individual test files
    // through their direct imports of the setup module
  }

  /**
   * Cleanup all resources (call this in test teardown)
   */
  cleanup(): void {
    this.reset();
  }
}

/**
 * Singleton instance for easy access
 */
export const testHelpers = TestHelpers.getInstance();

/**
 * Common test scenarios for reuse across tests
 */
export const commonTestScenarios = {
  /**
   * Scenario: Extension with no configuration
   */
  noConfiguration: (): TestScenario => ({
    name: 'No Configuration',
    configuration: {},
    expectedBehavior: 'setup',
    expectedItems: [{
      label: 'Click to set templates path',
      itemType: 'setup'
    }]
  }),

  /**
   * Scenario: Extension with valid templates directory
   */
  validTemplatesDirectory: (templatesPath: string = '/test/templates'): TestScenario => ({
    name: 'Valid Templates Directory',
    configuration: { templatesPath },
    templatesDirectory: {
      path: templatesPath,
      templates: [
        { name: 'template1', content: '# Template 1\nContent', isMarkdown: true },
        { name: 'template2', content: '# Template 2\nContent', isMarkdown: true }
      ],
      subdirectories: []
    },
    expectedBehavior: 'success',
    expectedItems: [
      { label: 'template1', itemType: 'template', templatePath: `${templatesPath}/template1.md` },
      { label: 'template2', itemType: 'template', templatePath: `${templatesPath}/template2.md` }
    ]
  }),

  /**
   * Scenario: Extension with non-existent templates directory
   */
  nonExistentTemplatesDirectory: (templatesPath: string = '/test/nonexistent'): TestScenario => ({
    name: 'Non-existent Templates Directory',
    configuration: { templatesPath },
    expectedBehavior: 'error',
    expectedItems: [
      { label: 'Templates path not found', itemType: 'error' },
      { label: 'Click to set new path', itemType: 'setup' }
    ]
  }),

  /**
   * Scenario: Extension with empty templates directory
   */
  emptyTemplatesDirectory: (templatesPath: string = '/test/empty'): TestScenario => ({
    name: 'Empty Templates Directory',
    configuration: { templatesPath },
    templatesDirectory: {
      path: templatesPath,
      templates: [],
      subdirectories: []
    },
    expectedBehavior: 'info',
    expectedItems: [
      { label: 'No .md template files found', itemType: 'info' },
      { label: `Path: ${templatesPath}`, itemType: 'info' }
    ]
  }),

  /**
   * Scenario: Extension with workspace containing .kiro/steering
   */
  workspaceWithSteering: (workspacePath: string = '/test/workspace'): TestScenario => ({
    name: 'Workspace with Steering Directory',
    workspace: {
      name: 'test-workspace',
      path: workspacePath,
      hasKiroDirectory: true,
      hasSteeringDirectory: true,
      existingTemplates: ['existing-template.md']
    },
    configuration: { templatesPath: '/test/templates' },
    templatesDirectory: {
      path: '/test/templates',
      templates: [
        { name: 'new-template', content: '# New Template\nContent', isMarkdown: true }
      ],
      subdirectories: []
    },
    expectedBehavior: 'success',
    expectedItems: [
      { label: 'new-template', itemType: 'template', templatePath: '/test/templates/new-template.md' }
    ]
  }),

  /**
   * Scenario: Extension with workspace without .kiro directory
   */
  workspaceWithoutKiro: (workspacePath: string = '/test/workspace'): TestScenario => ({
    name: 'Workspace without Kiro Directory',
    workspace: {
      name: 'test-workspace',
      path: workspacePath,
      hasKiroDirectory: false,
      hasSteeringDirectory: false,
      existingTemplates: []
    },
    configuration: { templatesPath: '/test/templates' },
    templatesDirectory: {
      path: '/test/templates',
      templates: [
        { name: 'template', content: '# Template\nContent', isMarkdown: true }
      ],
      subdirectories: []
    },
    expectedBehavior: 'success',
    expectedItems: [
      { label: 'template', itemType: 'template', templatePath: '/test/templates/template.md' }
    ]
  })
};

/**
 * Utility functions for common test operations
 */
export const testUtils = {
  /**
   * Wait for a specified amount of time (for async operations)
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create a promise that resolves after the next tick
   */
  nextTick: (): Promise<void> => new Promise(resolve => process.nextTick(resolve)),

  /**
   * Generate a random string for unique test identifiers
   */
  randomString: (length: number = 8): string => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Generate a unique test path
   */
  uniquePath: (basePath: string = '/test'): string => {
    return `${basePath}/${testUtils.randomString()}`;
  },

  /**
   * Create a mock function with specific return value
   */
  mockFunction: <T extends (...args: any[]) => any>(returnValue?: ReturnType<T>): MockedFunction<T> => {
    return vi.fn().mockReturnValue(returnValue) as MockedFunction<T>;
  },

  /**
   * Create a mock async function with specific resolved value
   */
  mockAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    resolvedValue?: Awaited<ReturnType<T>>
  ): MockedFunction<T> => {
    return vi.fn().mockResolvedValue(resolvedValue) as MockedFunction<T>;
  }
};
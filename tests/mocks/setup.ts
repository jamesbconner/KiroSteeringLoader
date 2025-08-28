/**
 * Global mock setup for VS Code API and Node.js modules
 * This file configures all mocks to be available throughout all tests
 */

import { vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { createVSCodeMock } from './vscode';
import { createFileSystemMock, fileSystemMockUtils } from './fs';
import { createPathMock, pathMockUtils } from './path';

// Create the global mocks
const vscodeMock = createVSCodeMock();
const fsMock = createFileSystemMock();
const pathMock = createPathMock();

// Mock the modules globally
vi.mock('vscode', () => vscodeMock);
vi.mock('fs', () => fsMock);
vi.mock('path', () => pathMock);

// Global setup for each test
beforeEach(() => {
  // Reset all mocks before each test to ensure clean state
  vi.clearAllMocks();
  
  // Reset VS Code mocks
  vscodeMock.workspace.workspaceFolders = undefined;
  vscodeMock.workspace.getConfiguration().get.mockReturnValue(undefined);
  
  // Reset file system mocks
  fileSystemMockUtils.reset();
  
  // Reset path mocks
  pathMockUtils.reset();
});

// Export the mocks for direct access in tests if needed
export { vscodeMock as vscode, fsMock, pathMock };

// Export commonly used mock objects for convenience
export {
  MockEventEmitter,
  MockTreeItem,
  MockThemeIcon,
  MockUri,
  MockDisposable,
  TreeItemCollapsibleState,
  ConfigurationTarget,
  ExtensionMode
} from './vscode';

// Export factory functions and utilities
export * from './vscodeFactories';
export * from './fileSystemHelpers';
export { fileSystemMockUtils, fileSystemScenarios } from './fs';
export { pathMockUtils, pathScenarios } from './path';

// Re-export the mock objects for direct access
export { mockFs } from './fs';
export { mockPath } from './path';

/**
 * Helper function to configure workspace for tests
 */
export function setupWorkspace(workspaceFolders?: vscode.WorkspaceFolder[]) {
  vscodeMock.workspace.workspaceFolders = workspaceFolders;
}

/**
 * Helper function to configure extension configuration for tests
 */
export function setupConfiguration(configValues: Record<string, any>) {
  // Reset the getConfiguration mock to return a new configuration with the specified values
  vscodeMock.workspace.getConfiguration.mockReturnValue({
    get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
      return configValues.hasOwnProperty(key) ? configValues[key] : defaultValue;
    }),
    update: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockImplementation((key: string) => configValues.hasOwnProperty(key)),
    inspect: vi.fn().mockImplementation((key: string) => ({
      key,
      defaultValue: undefined,
      globalValue: configValues[key],
      workspaceValue: undefined,
      workspaceFolderValue: undefined
    }))
  });
}

/**
 * Helper function to verify command registration
 */
export function getRegisteredCommands(): Array<{ command: string; callback: Function }> {
  const calls = vscodeMock.commands.registerCommand.mock.calls;
  return calls.map(([command, callback]: [string, Function]) => ({ command, callback }));
}

/**
 * Helper function to verify tree data provider registration
 */
export function getRegisteredTreeDataProviders(): Array<{ viewId: string; provider: any }> {
  const calls = vscodeMock.window.registerTreeDataProvider.mock.calls;
  return calls.map(([viewId, provider]: [string, any]) => ({ viewId, provider }));
}

/**
 * Helper function to simulate user interactions
 */
export const userInteractions = {
  /**
   * Simulate user selecting a folder in open dialog
   */
  selectFolder: (folderPath: string) => {
    vscodeMock.window.showOpenDialog.mockResolvedValueOnce([
      { fsPath: folderPath, scheme: 'file', authority: '', path: folderPath, query: '', fragment: '' }
    ]);
  },
  
  /**
   * Simulate user canceling open dialog
   */
  cancelDialog: () => {
    vscodeMock.window.showOpenDialog.mockResolvedValueOnce(undefined);
  },
  
  /**
   * Simulate configuration update success
   */
  configUpdateSuccess: () => {
    vscodeMock.workspace.getConfiguration().update.mockResolvedValueOnce(undefined);
  },
  
  /**
   * Simulate configuration update failure
   */
  configUpdateFailure: (error: Error) => {
    vscodeMock.workspace.getConfiguration().update.mockRejectedValueOnce(error);
  }
};

/**
 * Helper function to create message assertion utilities
 * These return functions that can be used with expect() in tests
 */
export const messageAssertions = {
  /**
   * Get assertion function for information messages
   */
  getInfoMessageAssertion: () => {
    return vscodeMock.window.showInformationMessage;
  },
  
  /**
   * Get assertion function for error messages
   */
  getErrorMessageAssertion: () => {
    return vscodeMock.window.showErrorMessage;
  },
  
  /**
   * Get assertion function for no messages
   */
  getNoMessagesAssertion: () => {
    return {
      info: vscodeMock.window.showInformationMessage,
      error: vscodeMock.window.showErrorMessage
    };
  }
};
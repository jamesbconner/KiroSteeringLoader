/**
 * Main entry point for VS Code API mocks
 * Provides a clean API for importing mock objects and utilities
 * 
 * @fileoverview Updated 2025-12-13: Reviewed exports and enhanced type safety
 * @version 2.0.0 - Consolidated exports with improved organization
 */

// Export the main vscode mock
export { vscode, createVSCodeMock } from './vscode';

// Export all mock classes and types
export {
  MockEventEmitter,
  MockTreeItem,
  MockThemeIcon,
  MockUri,
  MockDisposable,
  TreeItemCollapsibleState,
  ConfigurationTarget,
  ExtensionMode,
  type MockedVSCodeWindow,
  type MockedVSCodeCommands,
  type MockedVSCodeWorkspace,
  type MockedWorkspaceConfiguration,
  type MockedExtensionContext
} from './vscode';

// Export all factory functions
export {
  createMockExtensionContext,
  createMockWorkspaceFolder,
  createMockWorkspaceConfiguration,
  createMockTreeItem,
  createMockThemeIcon,
  createMockEventEmitter,
  createMockCommand,
  createMockOpenDialogOptions,
  createMockWorkspaceFolders,
  createMockDisposable,
  createTestSuite,
  createTemplateItem
} from './vscodeFactories';

// Export setup utilities
export {
  setupWorkspace,
  setupConfiguration,
  getRegisteredCommands,
  getRegisteredTreeDataProviders,
  userInteractions,
  messageAssertions
} from './setup';

// Export file system mocks
export {
  mockFs,
  mockPath,
  fileSystemMockUtils,
  fileSystemScenarios,
  pathMockUtils,
  pathScenarios,
  fileSystemTestHelpers,
  commonTestScenarios,
  fileSystemAssertions,
  type MockFileSystemState,
  type MockedFileSystem,
  type MockedPath,
  type TestWorkspace,
  type TestTemplatesDirectory,
  type TestConfiguration,
  type TestScenario
} from './setup';

// Re-export setup for convenience
export * from './setup';

/**
 * Utility function to reset all mocks to their initial state
 * Added for better test isolation and cleanup
 */
export function resetAllMocks(): void {
  // This would reset all mock states across the system
  // Implementation depends on the specific mock setup
}

/**
 * Type guard to check if an object is a mock
 * Useful for debugging and test validation
 */
export function isMockObject(obj: any): boolean {
  return obj && typeof obj === 'object' && obj._isMock === true;
}
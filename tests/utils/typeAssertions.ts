/**
 * Type-safe assertion helpers for VS Code-specific testing scenarios
 * Provides comprehensive assertion utilities with proper TypeScript typing
 */

import { expect } from 'vitest';
import type { MockedFunction } from 'vitest';
import * as vscode from 'vscode';
import { TreeItemCollapsibleState } from '../mocks/vscode';

/**
 * Interface for VS Code command assertion
 */
export interface CommandAssertion {
  command: string;
  title: string;
  arguments?: any[];
}

/**
 * Interface for VS Code tree item assertion
 */
export interface TreeItemAssertion {
  label: string | vscode.TreeItemLabel;
  collapsibleState?: vscode.TreeItemCollapsibleState;
  tooltip?: string | vscode.MarkdownString;
  command?: CommandAssertion;
  iconPath?: {
    id: string;
    color?: vscode.ThemeColor;
  };
  contextValue?: string;
  description?: string | boolean;
}

/**
 * Interface for VS Code message assertion
 */
export interface MessageAssertion {
  message: string;
  type: 'info' | 'error' | 'warning';
  callCount?: number;
}

/**
 * Interface for VS Code workspace assertion
 */
export interface WorkspaceAssertion {
  workspaceFolders?: Array<{
    name: string;
    uri: {
      fsPath: string;
      scheme: string;
    };
    index: number;
  }>;
  configuration?: Record<string, any>;
}

/**
 * Type-safe assertion helpers class
 */
export class TypeAssertions {
  private static instance: TypeAssertions;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TypeAssertions {
    if (!TypeAssertions.instance) {
      TypeAssertions.instance = new TypeAssertions();
    }
    return TypeAssertions.instance;
  }

  /**
   * Assert that a value is of a specific type
   */
  assertType<T>(value: unknown, typeName: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new Error(`Expected value to be of type ${typeName}, but got ${value}`);
    }
  }

  /**
   * Expect a value to be of a specific type (returns the value for chaining)
   */
  expectType<T>(value: T, typeName?: string): T {
    if (typeName && (value === null || value === undefined)) {
      throw new Error(`Expected value to be of type ${typeName}, but got ${value}`);
    }
    return value;
  }

  /**
   * Assert that a value is an instance of a specific constructor
   */
  assertInstanceOf<T>(
    value: unknown,
    constructor: new (...args: any[]) => T,
    message?: string
  ): asserts value is T {
    if (!(value instanceof constructor)) {
      const actualType = value?.constructor?.name || typeof value;
      const expectedType = constructor.name;
      throw new Error(
        message || `Expected value to be instance of ${expectedType}, but got ${actualType}`
      );
    }
  }

  /**
   * Assert that a VS Code command was registered correctly
   */
  assertCommandRegistration(
    registerCommandMock: MockedFunction<any>,
    expectedCommand: string,
    expectedCallback?: Function
  ): void {
    const calls = registerCommandMock.mock.calls;
    const commandCall = calls.find(([command]) => command === expectedCommand);
    
    expect(commandCall, `Command '${expectedCommand}' should be registered`).toBeDefined();
    
    if (expectedCallback) {
      expect(commandCall![1], `Command '${expectedCommand}' should have correct callback`).toBe(expectedCallback);
    }
  }

  /**
   * Assert that multiple VS Code commands were registered
   */
  assertCommandsRegistered(
    registerCommandMock: MockedFunction<any>,
    expectedCommands: string[]
  ): void {
    const calls = registerCommandMock.mock.calls;
    const registeredCommands = calls.map(([command]) => command);
    
    for (const expectedCommand of expectedCommands) {
      expect(
        registeredCommands,
        `Command '${expectedCommand}' should be registered`
      ).toContain(expectedCommand);
    }
  }

  /**
   * Assert that a tree data provider was registered correctly
   */
  assertTreeDataProviderRegistration(
    registerTreeDataProviderMock: MockedFunction<any>,
    expectedViewId: string,
    expectedProvider?: any
  ): void {
    const calls = registerTreeDataProviderMock.mock.calls;
    const providerCall = calls.find(([viewId]) => viewId === expectedViewId);
    
    expect(providerCall, `Tree data provider for '${expectedViewId}' should be registered`).toBeDefined();
    
    if (expectedProvider) {
      expect(
        providerCall![1],
        `Tree data provider for '${expectedViewId}' should have correct provider instance`
      ).toBe(expectedProvider);
    }
  }

  /**
   * Assert that a VS Code tree item matches expected properties
   */
  assertTreeItem(actual: vscode.TreeItem, expected: TreeItemAssertion): void {
    expect(actual.label, 'TreeItem label should match').toEqual(expected.label);
    
    if (expected.collapsibleState !== undefined) {
      expect(actual.collapsibleState, 'TreeItem collapsibleState should match').toBe(expected.collapsibleState);
    }
    
    if (expected.tooltip !== undefined) {
      expect(actual.tooltip, 'TreeItem tooltip should match').toEqual(expected.tooltip);
    }
    
    if (expected.command) {
      expect(actual.command, 'TreeItem should have command').toBeDefined();
      this.assertCommand(actual.command!, expected.command);
    }
    
    if (expected.iconPath) {
      expect(actual.iconPath, 'TreeItem should have iconPath').toBeDefined();
      this.assertThemeIcon(actual.iconPath as vscode.ThemeIcon, expected.iconPath);
    }
    
    if (expected.contextValue !== undefined) {
      expect(actual.contextValue, 'TreeItem contextValue should match').toBe(expected.contextValue);
    }
    
    if (expected.description !== undefined) {
      expect(actual.description, 'TreeItem description should match').toEqual(expected.description);
    }
  }

  /**
   * Assert that multiple tree items match expected properties
   */
  assertTreeItems(actual: vscode.TreeItem[], expected: TreeItemAssertion[]): void {
    expect(actual.length, 'Number of tree items should match').toBe(expected.length);
    
    for (let i = 0; i < actual.length; i++) {
      this.assertTreeItem(actual[i], expected[i]);
    }
  }

  /**
   * Assert that a VS Code command matches expected properties
   */
  assertCommand(actual: vscode.Command, expected: CommandAssertion): void {
    expect(actual.command, 'Command name should match').toBe(expected.command);
    expect(actual.title, 'Command title should match').toBe(expected.title);
    
    if (expected.arguments !== undefined) {
      expect(actual.arguments, 'Command arguments should match').toEqual(expected.arguments);
    }
  }

  /**
   * Assert that a VS Code theme icon matches expected properties
   */
  assertThemeIcon(actual: vscode.ThemeIcon, expected: { id: string; color?: vscode.ThemeColor }): void {
    expect(actual.id, 'ThemeIcon id should match').toBe(expected.id);
    
    if (expected.color !== undefined) {
      expect(actual.color, 'ThemeIcon color should match').toEqual(expected.color);
    }
  }

  /**
   * Assert that a VS Code message was shown
   */
  assertMessage(
    messageMock: MockedFunction<any>,
    expected: MessageAssertion
  ): void {
    const callCount = expected.callCount ?? 1;
    
    expect(
      messageMock,
      `${expected.type} message should be called ${callCount} time(s)`
    ).toHaveBeenCalledTimes(callCount);
    
    if (callCount > 0) {
      expect(
        messageMock,
        `${expected.type} message should contain expected text`
      ).toHaveBeenCalledWith(expected.message);
    }
  }

  /**
   * Assert that no messages were shown
   */
  assertNoMessages(
    infoMock: MockedFunction<any>,
    errorMock: MockedFunction<any>,
    warningMock?: MockedFunction<any>
  ): void {
    expect(infoMock, 'No info messages should be shown').not.toHaveBeenCalled();
    expect(errorMock, 'No error messages should be shown').not.toHaveBeenCalled();
    
    if (warningMock) {
      expect(warningMock, 'No warning messages should be shown').not.toHaveBeenCalled();
    }
  }

  /**
   * Assert that VS Code workspace configuration was accessed correctly
   */
  assertConfigurationAccess(
    getConfigurationMock: MockedFunction<any>,
    expectedSection?: string,
    expectedCallCount: number = 1
  ): void {
    expect(
      getConfigurationMock,
      `getConfiguration should be called ${expectedCallCount} time(s)`
    ).toHaveBeenCalledTimes(expectedCallCount);
    
    if (expectedSection !== undefined) {
      expect(
        getConfigurationMock,
        `getConfiguration should be called with section '${expectedSection}'`
      ).toHaveBeenCalledWith(expectedSection);
    }
  }

  /**
   * Assert that configuration was updated correctly
   */
  assertConfigurationUpdate(
    updateMock: MockedFunction<any>,
    expectedKey: string,
    expectedValue: any,
    expectedTarget?: vscode.ConfigurationTarget
  ): void {
    const expectedArgs = expectedTarget !== undefined 
      ? [expectedKey, expectedValue, expectedTarget]
      : [expectedKey, expectedValue];
    
    expect(
      updateMock,
      `Configuration should be updated with key '${expectedKey}'`
    ).toHaveBeenCalledWith(...expectedArgs);
  }

  /**
   * Assert that workspace folders match expected structure
   */
  assertWorkspaceFolders(
    actual: vscode.WorkspaceFolder[] | undefined,
    expected: WorkspaceAssertion['workspaceFolders']
  ): void {
    if (expected === undefined) {
      expect(actual, 'Workspace folders should be undefined').toBeUndefined();
      return;
    }
    
    expect(actual, 'Workspace folders should be defined').toBeDefined();
    expect(actual!.length, 'Number of workspace folders should match').toBe(expected.length);
    
    for (let i = 0; i < expected.length; i++) {
      const actualFolder = actual![i];
      const expectedFolder = expected[i];
      
      expect(actualFolder.name, `Workspace folder ${i} name should match`).toBe(expectedFolder.name);
      expect(actualFolder.uri.fsPath, `Workspace folder ${i} fsPath should match`).toBe(expectedFolder.uri.fsPath);
      expect(actualFolder.uri.scheme, `Workspace folder ${i} scheme should match`).toBe(expectedFolder.uri.scheme);
      expect(actualFolder.index, `Workspace folder ${i} index should match`).toBe(expectedFolder.index);
    }
  }

  /**
   * Assert that an async operation completed successfully
   */
  async assertAsyncSuccess<T>(
    operation: Promise<T>,
    expectedResult?: T
  ): Promise<T> {
    const result = await expect(operation).resolves;
    
    if (expectedResult !== undefined) {
      expect(result, 'Async operation result should match expected value').toEqual(expectedResult);
    }
    
    return result;
  }

  /**
   * Assert that an async operation failed with expected error
   */
  async assertAsyncError<T extends Error>(
    operation: Promise<any>,
    expectedErrorType?: new (...args: any[]) => T,
    expectedMessage?: string
  ): Promise<T> {
    const error = await expect(operation).rejects.toThrow();
    
    if (expectedErrorType) {
      expect(error).toBeInstanceOf(expectedErrorType);
    }
    
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
    
    return error as T;
  }

  /**
   * Assert that a mock function was called with specific arguments
   */
  assertMockCalledWith<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    expectedArgs: Parameters<T>,
    callIndex: number = 0
  ): void {
    expect(mock, 'Mock should have been called').toHaveBeenCalled();
    
    const calls = mock.mock.calls;
    expect(calls.length, `Mock should have at least ${callIndex + 1} call(s)`).toBeGreaterThan(callIndex);
    
    expect(
      calls[callIndex],
      `Mock call ${callIndex} should have correct arguments`
    ).toEqual(expectedArgs);
  }

  /**
   * Assert that a mock function was called a specific number of times
   */
  assertMockCallCount<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    expectedCount: number
  ): void {
    expect(
      mock,
      `Mock should be called exactly ${expectedCount} time(s)`
    ).toHaveBeenCalledTimes(expectedCount);
  }

  /**
   * Assert that a mock function was not called
   */
  assertMockNotCalled<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>
  ): void {
    expect(mock, 'Mock should not have been called').not.toHaveBeenCalled();
  }

  /**
   * Assert that an extension context has required properties
   */
  assertExtensionContext(
    context: vscode.ExtensionContext,
    expectedProperties?: Partial<vscode.ExtensionContext>
  ): void {
    expect(context, 'Extension context should be defined').toBeDefined();
    expect(context.subscriptions, 'Extension context should have subscriptions array').toBeInstanceOf(Array);
    expect(context.extensionPath, 'Extension context should have extensionPath').toBeDefined();
    expect(context.extensionUri, 'Extension context should have extensionUri').toBeDefined();
    
    if (expectedProperties) {
      for (const [key, expectedValue] of Object.entries(expectedProperties)) {
        expect(
          (context as any)[key],
          `Extension context property '${key}' should match expected value`
        ).toEqual(expectedValue);
      }
    }
  }

  /**
   * Assert that disposables were properly registered
   */
  assertDisposablesRegistered(
    context: vscode.ExtensionContext,
    expectedCount: number
  ): void {
    expect(
      context.subscriptions.length,
      `Extension should register ${expectedCount} disposable(s)`
    ).toBe(expectedCount);
    
    // Verify all subscriptions are disposable
    for (let i = 0; i < context.subscriptions.length; i++) {
      const subscription = context.subscriptions[i];
      expect(
        subscription,
        `Subscription ${i} should be defined`
      ).toBeDefined();
      expect(
        typeof subscription.dispose,
        `Subscription ${i} should have dispose method`
      ).toBe('function');
    }
  }
}

/**
 * Singleton instance for easy access
 */
export const typeAssertions = TypeAssertions.getInstance();

/**
 * Convenience functions for common assertions
 */
export const assertVSCode = {
  /**
   * Assert command registration
   */
  commandRegistered: (
    registerCommandMock: MockedFunction<any>,
    command: string,
    callback?: Function
  ) => typeAssertions.assertCommandRegistration(registerCommandMock, command, callback),

  /**
   * Assert tree data provider registration
   */
  treeDataProviderRegistered: (
    registerTreeDataProviderMock: MockedFunction<any>,
    viewId: string,
    provider?: any
  ) => typeAssertions.assertTreeDataProviderRegistration(registerTreeDataProviderMock, viewId, provider),

  /**
   * Assert tree item properties
   */
  treeItem: (actual: vscode.TreeItem, expected: TreeItemAssertion) => 
    typeAssertions.assertTreeItem(actual, expected),

  /**
   * Assert multiple tree items
   */
  treeItems: (actual: vscode.TreeItem[], expected: TreeItemAssertion[]) => 
    typeAssertions.assertTreeItems(actual, expected),

  /**
   * Assert message was shown
   */
  message: (messageMock: MockedFunction<any>, expected: MessageAssertion) => 
    typeAssertions.assertMessage(messageMock, expected),

  /**
   * Assert no messages were shown
   */
  noMessages: (infoMock: MockedFunction<any>, errorMock: MockedFunction<any>) => 
    typeAssertions.assertNoMessages(infoMock, errorMock),

  /**
   * Assert configuration access
   */
  configurationAccessed: (
    getConfigurationMock: MockedFunction<any>,
    section?: string,
    callCount?: number
  ) => typeAssertions.assertConfigurationAccess(getConfigurationMock, section, callCount),

  /**
   * Assert configuration update
   */
  configurationUpdated: (
    updateMock: MockedFunction<any>,
    key: string,
    value: any,
    target?: vscode.ConfigurationTarget
  ) => typeAssertions.assertConfigurationUpdate(updateMock, key, value, target),

  /**
   * Assert workspace folders
   */
  workspaceFolders: (
    actual: vscode.WorkspaceFolder[] | undefined,
    expected: WorkspaceAssertion['workspaceFolders']
  ) => typeAssertions.assertWorkspaceFolders(actual, expected),

  /**
   * Assert extension context
   */
  extensionContext: (
    context: vscode.ExtensionContext,
    expectedProperties?: Partial<vscode.ExtensionContext>
  ) => typeAssertions.assertExtensionContext(context, expectedProperties),

  /**
   * Assert disposables registered
   */
  disposablesRegistered: (context: vscode.ExtensionContext, count: number) => 
    typeAssertions.assertDisposablesRegistered(context, count)
};

/**
 * Type guards for VS Code objects
 */
export const isVSCode = {
  /**
   * Type guard for VS Code TreeItem
   */
  treeItem: (value: any): value is vscode.TreeItem => {
    return value && 
           typeof value === 'object' && 
           'label' in value &&
           ('collapsibleState' in value || value.collapsibleState === undefined);
  },

  /**
   * Type guard for VS Code Command
   */
  command: (value: any): value is vscode.Command => {
    return value && 
           typeof value === 'object' && 
           typeof value.command === 'string' &&
           typeof value.title === 'string';
  },

  /**
   * Type guard for VS Code Uri
   */
  uri: (value: any): value is vscode.Uri => {
    return value && 
           typeof value === 'object' && 
           typeof value.scheme === 'string' &&
           typeof value.fsPath === 'string';
  },

  /**
   * Type guard for VS Code WorkspaceFolder
   */
  workspaceFolder: (value: any): value is vscode.WorkspaceFolder => {
    return value && 
           typeof value === 'object' && 
           typeof value.name === 'string' &&
           isVSCode.uri(value.uri) &&
           typeof value.index === 'number';
  },

  /**
   * Type guard for VS Code ExtensionContext
   */
  extensionContext: (value: any): value is vscode.ExtensionContext => {
    return value && 
           typeof value === 'object' && 
           Array.isArray(value.subscriptions) &&
           typeof value.extensionPath === 'string';
  }
};
/**
 * Test suite to verify VS Code API mocks are working correctly
 * This ensures all mock implementations provide the expected functionality
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  createMockExtensionContext,
  createMockWorkspaceFolder,
  createMockWorkspaceConfiguration,
  createMockTreeItem,
  createMockThemeIcon,
  createMockEventEmitter,
  createTemplateItem,
  setupWorkspace,
  setupConfiguration,
  userInteractions,
  messageAssertions,
  TreeItemCollapsibleState,
  ConfigurationTarget
} from '../mocks';

describe('VS Code API Mocks', () => {
  describe('vscode.window mocks', () => {
    it('should mock showInformationMessage', async () => {
      const message = 'Test information message';
      await vscode.window.showInformationMessage(message);
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(message);
    });

    it('should mock showErrorMessage', async () => {
      const message = 'Test error message';
      await vscode.window.showErrorMessage(message);
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(message);
    });

    it('should mock showOpenDialog', async () => {
      const options = { canSelectFolders: true };
      await vscode.window.showOpenDialog(options);
      
      expect(vscode.window.showOpenDialog).toHaveBeenCalledWith(options);
    });

    it('should mock registerTreeDataProvider', () => {
      const provider = {};
      const disposable = vscode.window.registerTreeDataProvider('test', provider);
      
      expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledWith('test', provider);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('vscode.commands mocks', () => {
    it('should mock registerCommand', () => {
      const callback = vi.fn();
      const disposable = vscode.commands.registerCommand('test.command', callback);
      
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('test.command', callback);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('vscode.workspace mocks', () => {
    it('should mock getConfiguration', () => {
      const config = vscode.workspace.getConfiguration('test');
      
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('test');
      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
      expect(typeof config.update).toBe('function');
    });

    it('should handle workspaceFolders', () => {
      expect(vscode.workspace.workspaceFolders).toBeUndefined();
      
      const folder = createMockWorkspaceFolder('test', '/test/path');
      setupWorkspace([folder]);
      
      expect(vscode.workspace.workspaceFolders).toHaveLength(1);
      expect(vscode.workspace.workspaceFolders![0].name).toBe('test');
    });
  });

  describe('EventEmitter mock', () => {
    it('should create functional EventEmitter', () => {
      const emitter = createMockEventEmitter<string>();
      const listener = vi.fn();
      
      const disposable = emitter.event(listener);
      emitter.fire('test event');
      
      expect(listener).toHaveBeenCalledWith('test event');
      
      disposable.dispose();
      emitter.fire('second event');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('TreeItem mock', () => {
    it('should create TreeItem with proper properties', () => {
      const item = createMockTreeItem('Test Item', TreeItemCollapsibleState.None);
      
      expect(item.label).toBe('Test Item');
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
      expect(item).toBeInstanceOf(vscode.TreeItem);
    });

    it('should support property overrides', () => {
      const item = createMockTreeItem('Test', TreeItemCollapsibleState.None, {
        tooltip: 'Custom tooltip',
        description: 'Custom description'
      });
      
      expect(item.tooltip).toBe('Custom tooltip');
      expect(item.description).toBe('Custom description');
    });
  });

  describe('ThemeIcon mock', () => {
    it('should create ThemeIcon with proper properties', () => {
      const icon = createMockThemeIcon('file-text');
      
      expect(icon.id).toBe('file-text');
      expect(icon).toBeInstanceOf(vscode.ThemeIcon);
    });
  });

  describe('Factory functions', () => {
    it('should create mock ExtensionContext', () => {
      const context = createMockExtensionContext();
      
      expect(context.subscriptions).toEqual([]);
      expect(context.extensionPath).toBe('/test/extension');
      expect(typeof context.asAbsolutePath).toBe('function');
      expect(context.workspaceState).toBeDefined();
      expect(context.globalState).toBeDefined();
    });

    it('should create mock WorkspaceFolder', () => {
      const folder = createMockWorkspaceFolder('test-workspace', '/test/path');
      
      expect(folder.name).toBe('test-workspace');
      expect(folder.uri.fsPath).toBe('/test/path');
      expect(folder.index).toBe(0);
    });

    it('should create mock WorkspaceConfiguration', () => {
      const config = createMockWorkspaceConfiguration({
        'test.setting': 'test-value'
      });
      
      expect(config.get('test.setting')).toBe('test-value');
      expect(config.get('nonexistent.setting', 'default')).toBe('default');
      expect(config.has('test.setting')).toBe(true);
      expect(config.has('nonexistent.setting')).toBe(false);
    });

    it('should create template items with proper configuration', () => {
      const templateItem = createTemplateItem('My Template', '/path/to/template.md', 'template');
      
      expect(templateItem.label).toBe('My Template');
      expect((templateItem as any).templatePath).toBe('/path/to/template.md');
      expect((templateItem as any).itemType).toBe('template');
      expect(templateItem.command?.command).toBe('kiroSteeringLoader.loadTemplate');
      expect(templateItem.command?.arguments).toEqual(['/path/to/template.md']);
    });
  });

  describe('Test utilities', () => {
    it('should setup configuration correctly', () => {
      setupConfiguration({
        'templatesPath': '/test/templates'
      });
      
      const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBe('/test/templates');
    });

    it('should simulate user interactions', async () => {
      userInteractions.selectFolder('/selected/folder');
      
      const result = await vscode.window.showOpenDialog({});
      expect(result).toEqual([
        expect.objectContaining({ fsPath: '/selected/folder' })
      ]);
    });

    it('should provide message assertions', async () => {
      await vscode.window.showInformationMessage('Test message');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Enums and constants', () => {
    it('should provide TreeItemCollapsibleState enum', () => {
      expect(TreeItemCollapsibleState.None).toBe(0);
      expect(TreeItemCollapsibleState.Collapsed).toBe(1);
      expect(TreeItemCollapsibleState.Expanded).toBe(2);
    });

    it('should provide ConfigurationTarget enum', () => {
      expect(ConfigurationTarget.Global).toBe(1);
      expect(ConfigurationTarget.Workspace).toBe(2);
      expect(ConfigurationTarget.WorkspaceFolder).toBe(3);
    });
  });
});
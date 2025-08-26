/**
 * Integration tests for workspace and file system operations
 * Tests workspace folder detection, .kiro/steering directory management, file copying, and error handling
 * Requirements: 2.5, 2.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { fileSystemMockUtils, fileSystemScenarios } from '../mocks/fs';
import { vscode as vscodeMock, setupConfiguration } from '../mocks/setup';

// Helper function to create mock workspace folder
function createMockWorkspaceFolder(name: string, fsPath: string): vscode.WorkspaceFolder {
  return {
    uri: { 
      fsPath,
      scheme: 'file',
      authority: '',
      path: fsPath,
      query: '',
      fragment: ''
    } as vscode.Uri,
    name,
    index: 0
  };
}

// Helper function to create mock extension context
function createMockExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: {} as vscode.Memento,
    globalState: {} as vscode.Memento,
    extensionUri: {} as vscode.Uri,
    extensionPath: '/test/extension',
    asAbsolutePath: vi.fn(),
    storageUri: undefined,
    storagePath: undefined,
    globalStorageUri: {} as vscode.Uri,
    globalStoragePath: '/test/global',
    logUri: {} as vscode.Uri,
    logPath: '/test/log',
    extensionMode: 1 as vscode.ExtensionMode,
    extension: {} as vscode.Extension<any>,
    secrets: {} as vscode.SecretStorage,
    environmentVariableCollection: {} as vscode.EnvironmentVariableCollection
  };
}

describe('Workspace and File System Integration Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let provider: SteeringTemplateProvider;

  beforeEach(() => {
    // Reset all mocks and test state
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
    // Create mock extension context
    mockContext = createMockExtensionContext();
    
    // Create provider instance
    provider = new SteeringTemplateProvider(mockContext);
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
  });

  describe('Workspace Folder Detection and Handling', () => {
    it('should detect single workspace folder correctly', async () => {
      // Arrange
      const workspacePath = '/test/workspace';
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      fileSystemScenarios.workspaceWithoutKiro(workspacePath);
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template1.md" loaded successfully'
      );
      
      // Verify .kiro/steering directory was created
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro`)).toBe(true);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering`)).toBe(true);
      
      // Verify template was copied
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template1.md`)).toBe(true);
      const copiedContent = fileSystemMockUtils.getFileContent(`${workspacePath}/.kiro/steering/template1.md`);
      expect(copiedContent).toBe('# Template 1\nThis is template 1 content');
    });

    it('should handle multiple workspace folders by using the first one', async () => {
      // Arrange
      const workspaceFolders = [
        createMockWorkspaceFolder('workspace1', '/test/workspace1'),
        createMockWorkspaceFolder('workspace2', '/test/workspace2')
      ];
      vscodeMock.workspace.workspaceFolders = workspaceFolders;
      fileSystemScenarios.workspaceWithoutKiro('/test/workspace1');
      fileSystemScenarios.workspaceWithoutKiro('/test/workspace2');
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template1.md" loaded successfully'
      );
      
      // Verify template was loaded to first workspace only
      expect(fileSystemMockUtils.exists('/test/workspace1/.kiro/steering/template1.md')).toBe(true);
      expect(fileSystemMockUtils.exists('/test/workspace2/.kiro/steering/template1.md')).toBe(false);
    });

    it('should handle empty workspace folders array', async () => {
      // Arrange
      vscodeMock.workspace.workspaceFolders = [];
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder open'
      );
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle undefined workspace folders', async () => {
      // Arrange
      vscodeMock.workspace.workspaceFolders = undefined;
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder open'
      );
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('.kiro/steering Directory Creation and Management', () => {
    it('should create .kiro directory when it does not exist', async () => {
      // Arrange
      const workspacePath = '/test/workspace';
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      fileSystemScenarios.workspaceWithoutKiro(workspacePath);
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Verify initial state
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro`)).toBe(false);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering`)).toBe(false);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro`)).toBe(true);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering`)).toBe(true);
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template1.md" loaded successfully'
      );
    });

    it('should use existing .kiro/steering directory when it already exists', async () => {
      // Arrange
      const workspacePath = '/test/workspace';
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      
      // Set up file system with both workspace and templates
      fileSystemMockUtils.setupFileSystem({
        directories: [
          workspacePath,
          `${workspacePath}/.kiro`,
          `${workspacePath}/.kiro/steering`,
          templatesPath
        ],
        files: {
          [`${workspacePath}/.kiro/steering/existing-template.md`]: '# Existing Template\nContent',
          [`${templatesPath}/template1.md`]: '# Template 1\nThis is template 1 content',
          [`${templatesPath}/template2.md`]: '# Template 2\nThis is template 2 content'
        }
      });
      
      // Verify initial state
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering`)).toBe(true);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/existing-template.md`)).toBe(true);

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template1.md`)).toBe(true);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/existing-template.md`)).toBe(true);
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template1.md" loaded successfully'
      );
    });
  });

  describe('File Copying Operations from Templates to Workspace', () => {
    let workspacePath: string;
    let templatesPath: string;

    beforeEach(() => {
      workspacePath = '/test/workspace';
      templatesPath = '/test/templates';
      
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);
    });

    it('should copy template file with correct content', async () => {
      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template1.md`)).toBe(true);
      const copiedContent = fileSystemMockUtils.getFileContent(`${workspacePath}/.kiro/steering/template1.md`);
      expect(copiedContent).toBe('# Template 1\nThis is template 1 content');
      
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "template1.md" loaded successfully'
      );
    });

    it('should copy template file with correct filename', async () => {
      // Act
      await provider.loadTemplate(`${templatesPath}/template2.md`);

      // Assert
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template2.md`)).toBe(true);
      const copiedContent = fileSystemMockUtils.getFileContent(`${workspacePath}/.kiro/steering/template2.md`);
      expect(copiedContent).toBe('# Template 2\nThis is template 2 content');
    });

    it('should handle template files with special characters in filename', async () => {
      // Arrange
      const specialTemplatePath = `${templatesPath}/special-template_with@symbols.md`;
      fileSystemMockUtils.addFile(specialTemplatePath, '# Special Template\nContent with symbols');

      // Act
      await provider.loadTemplate(specialTemplatePath);

      // Assert
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/special-template_with@symbols.md`)).toBe(true);
      const copiedContent = fileSystemMockUtils.getFileContent(`${workspacePath}/.kiro/steering/special-template_with@symbols.md`);
      expect(copiedContent).toBe('# Special Template\nContent with symbols');
    });

    it('should overwrite existing template file with same name', async () => {
      // Arrange
      const existingTemplatePath = `${workspacePath}/.kiro/steering/template1.md`;
      fileSystemMockUtils.addFile(existingTemplatePath, '# Old Content\nThis will be overwritten');

      // Verify initial state
      expect(fileSystemMockUtils.getFileContent(existingTemplatePath)).toBe('# Old Content\nThis will be overwritten');

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(fileSystemMockUtils.exists(existingTemplatePath)).toBe(true);
      const copiedContent = fileSystemMockUtils.getFileContent(existingTemplatePath);
      expect(copiedContent).toBe('# Template 1\nThis is template 1 content');
      expect(copiedContent).not.toContain('Old Content');
    });
  });

  describe('Error Handling for Workspace and File System Operations', () => {
    let workspacePath: string;
    let templatesPath: string;

    beforeEach(() => {
      workspacePath = '/test/workspace';
      templatesPath = '/test/templates';
      
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      setupConfiguration({ templatesPath });
    });

    it('should handle missing template file gracefully', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      const nonExistentTemplatePath = `${templatesPath}/nonexistent-template.md`;

      // Act
      await provider.loadTemplate(nonExistentTemplatePath);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load template:')
      );
      expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle template file read errors', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      fileSystemScenarios.templatesDirectory(templatesPath);
      
      const { mockFs } = await import('../mocks/fs');
      const readError = new Error('Permission denied reading file');
      mockFs.readFileSync.mockImplementationOnce(() => {
        throw readError;
      });

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        `Failed to load template: ${readError}`
      );
    });

    it('should handle file write errors in steering directory', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      fileSystemScenarios.templatesDirectory(templatesPath);
      
      const { mockFs } = await import('../mocks/fs');
      const writeError = new Error('Disk full');
      mockFs.writeFileSync.mockImplementationOnce(() => {
        throw writeError;
      });

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        `Failed to load template: ${writeError}`
      );
    });

    it('should handle directory creation permission errors', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithoutKiro(workspacePath);
      fileSystemScenarios.templatesDirectory(templatesPath);
      
      const { mockFs } = await import('../mocks/fs');
      const permissionError = new Error('EACCES: permission denied, mkdir');
      mockFs.mkdirSync.mockImplementationOnce(() => {
        throw permissionError;
      });

      // Act
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        `Failed to load template: ${permissionError}`
      );
    });

    it('should handle invalid template path parameter', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);

      // Act
      await provider.loadTemplate('');

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        'No template path provided'
      );
    });

    it('should handle null template path parameter', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);

      // Act
      await provider.loadTemplate(null as any);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        'No template path provided'
      );
    });

    it('should handle undefined template path parameter', async () => {
      // Arrange
      fileSystemScenarios.workspaceWithSteering(workspacePath);

      // Act
      await provider.loadTemplate(undefined as any);

      // Assert
      expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
        'No template path provided'
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle concurrent template loading operations', async () => {
      // Arrange
      const workspacePath = '/test/workspace';
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act - load multiple templates concurrently
      const loadPromises = [
        provider.loadTemplate(`${templatesPath}/template1.md`),
        provider.loadTemplate(`${templatesPath}/template2.md`)
      ];

      await Promise.all(loadPromises);

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledTimes(2);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template1.md`)).toBe(true);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template2.md`)).toBe(true);
    });

    it('should handle template loading with rapid successive calls', async () => {
      // Arrange
      const workspacePath = '/test/workspace';
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscodeMock.workspace.workspaceFolders = [workspaceFolder];
      fileSystemScenarios.workspaceWithSteering(workspacePath);
      
      const templatesPath = '/test/templates';
      setupConfiguration({ templatesPath });
      fileSystemScenarios.templatesDirectory(templatesPath);

      // Act - rapid successive calls
      await provider.loadTemplate(`${templatesPath}/template1.md`);
      await provider.loadTemplate(`${templatesPath}/template1.md`);
      await provider.loadTemplate(`${templatesPath}/template1.md`);

      // Assert
      expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledTimes(3);
      expect(fileSystemMockUtils.exists(`${workspacePath}/.kiro/steering/template1.md`)).toBe(true);
      
      // Verify final content is correct (last write wins)
      const finalContent = fileSystemMockUtils.getFileContent(`${workspacePath}/.kiro/steering/template1.md`);
      expect(finalContent).toBe('# Template 1\nThis is template 1 content');
    });
  });
});
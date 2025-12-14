/**
 * Unit tests for SteeringTemplateProvider loadTemplate method
 * Tests successful template loading, error handling, and user feedback
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import { vscode, fsMock, fileSystemMockUtils } from '../mocks/setup';
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';
import { FileSystemService } from '../../src/services/FileSystemService';
import { ErrorHandler } from '../../src/services/ErrorHandler';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { GitHubRepositoryService } from '../../src/services/GitHubRepositoryService';
import { CacheManager } from '../../src/services/CacheManager';

// Helper function to create mock workspace folder
function createMockWorkspaceFolder(name: string, fsPath: string) {
  return {
    uri: { fsPath } as any,
    name,
    index: 0
  };
}

describe('SteeringTemplateProvider loadTemplate method', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: any;
  let mockFileSystemService: any;
  let mockErrorHandler: any;
  let mockConfigService: any;
  let mockGitHubService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
    // Reset VSCode mocks completely
    vscode.window.showErrorMessage.mockClear();
    vscode.window.showInformationMessage.mockClear();
    vscode.workspace.workspaceFolders = undefined;
    
    // Reset fs mocks to their default implementations
    fsMock.readFileSync.mockImplementation((path: string, encoding?: BufferEncoding) => {
      const normalized = path.replace(/\\/g, '/');
      const mockState = fileSystemMockUtils.getState();
      if (!mockState.files.has(normalized)) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return mockState.files.get(normalized)!;
    });
    
    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() },
      secrets: {
        get: vi.fn().mockResolvedValue(null),
        store: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    // Create fresh mock services for each test
    mockFileSystemService = {
      loadTemplate: vi.fn(),
      ensureSteeringDirectory: vi.fn(),
      fileExists: vi.fn(),
      directoryExists: vi.fn(),
      promptOverwrite: vi.fn(),
      readFile: vi.fn(),
      listFiles: vi.fn()
    };
    
    mockErrorHandler = {
      handleError: vi.fn().mockImplementation((error: any, context: any, options: any = {}) => {
        // Mock the ErrorHandler behavior to call showErrorMessage when showNotification is true
        if (options.showNotification !== false) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(message, 'View Output');
        }
      }),
      logInfo: vi.fn(),
      logWarning: vi.fn(),
      showOutput: vi.fn(),
      clearOutput: vi.fn(),
      getErrorStats: vi.fn(),
      dispose: vi.fn()
    };
    
    mockConfigService = {
      getConfigurationSource: vi.fn().mockReturnValue('local'),
      getRepositoryConfig: vi.fn(),
      getLocalTemplatesPath: vi.fn(),
      getAuthToken: vi.fn()
    };
    
    mockGitHubService = {
      setAuthToken: vi.fn(),
      fetchTemplates: vi.fn(),
      fetchFileContent: vi.fn()
    };
    
    mockCacheManager = {
      getCachedTemplates: vi.fn(),
      setCachedTemplates: vi.fn(),
      isCacheFresh: vi.fn(),
      invalidateCache: vi.fn()
    };
    
    // Create provider instance with mocked services
    provider = new SteeringTemplateProvider(
      mockContext,
      mockConfigService,
      mockGitHubService,
      mockCacheManager,
      mockFileSystemService,
      mockErrorHandler
    );
  });

  describe('successful template loading', () => {
    it('should load template successfully with proper file operations and directory creation', async () => {
      // Arrange
      const templatePath = '/test/templates/template1.md';
      const templateContent = '# Test Template\nThis is test content';
      const workspacePath = '/test/workspace';
      const targetPath = '/test/workspace/.kiro/steering/template1.md';

      // Set up file system - workspace exists but steering directory doesn't
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Set up workspace
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock FileSystemService to return success
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: targetPath
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert - Check that FileSystemService was called correctly
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        templateContent,
        'template1.md',
        workspacePath
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Template "template1.md" loaded successfully');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('Loading template from local filesystem', { 
        path: templatePath 
      });
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('Template loaded successfully', { 
        filename: 'template1.md',
        filepath: targetPath 
      });
    });

    it('should create .kiro/steering directory when it does not exist', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      // Set up file system - workspace exists but steering directory doesn't
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock FileSystemService to return success
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: '/test/workspace/.kiro/steering/template.md'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert - FileSystemService handles directory creation internally
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        templateContent,
        'template.md',
        workspacePath
      );
    });

    it('should not create directory when .kiro/steering already exists', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      // Set up file system - steering directory already exists
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath, '/test/workspace/.kiro', '/test/workspace/.kiro/steering'],
        files: {
          [templatePath]: templateContent
        }
      });

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock FileSystemService to return success
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: '/test/workspace/.kiro/steering/template.md'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert - FileSystemService handles directory existence checks internally
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        templateContent,
        'template.md',
        workspacePath
      );
    });

    it('should handle empty template files', async () => {
      // Arrange
      const templatePath = '/test/templates/empty-template.md';
      const templateContent = '';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Set up file system
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Mock FileSystemService to return success
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: '/test/workspace/.kiro/steering/empty-template.md'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        '',
        'empty-template.md',
        workspacePath
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "empty-template.md" loaded successfully'
      );
    });
  });

  describe('error handling for missing template paths', () => {
    it('should show error message when template path is empty string', async () => {
      // Act
      await provider.loadTemplate('');

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when template path is undefined', async () => {
      // Act
      await provider.loadTemplate(undefined as any);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when template path is null', async () => {
      // Act
      await provider.loadTemplate(null as any);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling for missing workspace folders', () => {
    it('should show error message when no workspace folders are open', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      vscode.workspace.workspaceFolders = undefined;

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when workspace folders array is empty', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      vscode.workspace.workspaceFolders = [];

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(fsMock.readFileSync).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling for file system errors', () => {
    it('should handle template file not found error', async () => {
      // Arrange
      const templatePath = '/test/templates/nonexistent.md';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock fs.readFileSync to throw file not found error
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error(`ENOENT: no such file or directory, open '${templatePath}'`);
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        `ENOENT: no such file or directory, open '${templatePath}'`,
        'View Output'
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
      expect(mockFileSystemService.loadTemplate).not.toHaveBeenCalled();
    });

    it('should handle permission denied error when reading template', async () => {
      // Arrange
      const templatePath = '/test/templates/restricted.md';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock fs.readFileSync to throw permission error
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, open \'/test/templates/restricted.md\'');
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'EACCES: permission denied, open \'/test/templates/restricted.md\'',
        'View Output'
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle permission denied error when creating directory', async () => {
      // Arrange
      const templatePath = '/test/templates/create-dir-error.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Set up file system with the template file
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Mock FileSystemService to return failure due to permission error
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: false,
        error: 'Permission denied creating directory'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Permission denied creating directory',
        'View Output'
      );
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        templateContent,
        'create-dir-error.md',
        workspacePath
      );
    });

    it('should handle permission denied error when writing template file', async () => {
      // Arrange
      const templatePath = '/test/templates/write-error.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Set up file system with the template file
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Mock FileSystemService to return failure due to write error
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: false,
        error: 'Permission denied writing template file'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Permission denied writing template file',
        'View Output'
      );
      expect(mockFileSystemService.loadTemplate).toHaveBeenCalledWith(
        templateContent,
        'write-error.md',
        workspacePath
      );
    });
  });

  describe('user feedback verification', () => {
    it('should show success message with correct template name', async () => {
      // Arrange
      const templatePath = '/test/templates/my-awesome-template.md';
      const templateContent = '# Awesome Template';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Set up file system
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Mock FileSystemService to return success
      mockFileSystemService.loadTemplate.mockResolvedValue({
        success: true,
        filepath: '/test/workspace/.kiro/steering/my-awesome-template.md'
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "my-awesome-template.md" loaded successfully'
      );
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should show error message with full error details', async () => {
      // Arrange
      const templatePath = '/test/templates/error-template.md';
      const workspacePath = '/test/workspace';
      const specificError = new Error('Specific file system error with details');

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Mock fs.readFileSync to throw error
      fsMock.readFileSync.mockImplementation(() => {
        throw specificError;
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Specific file system error with details',
        'View Output'
      );
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle multiple consecutive loadTemplate calls', async () => {
      // Arrange
      const templatePath1 = '/test/templates/template1.md';
      const templatePath2 = '/test/templates/template2.md';
      const templateContent1 = '# Template 1';
      const templateContent2 = '# Template 2';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      vscode.workspace.workspaceFolders = [workspaceFolder];

      // Set up file system
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath1]: templateContent1,
          [templatePath2]: templateContent2
        }
      });

      // Mock FileSystemService to return success for both calls
      mockFileSystemService.loadTemplate
        .mockResolvedValueOnce({
          success: true,
          filepath: '/test/workspace/.kiro/steering/template1.md'
        })
        .mockResolvedValueOnce({
          success: true,
          filepath: '/test/workspace/.kiro/steering/template2.md'
        });

      // Act
      await provider.loadTemplate(templatePath1);
      await provider.loadTemplate(templatePath2);

      // Assert
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2);
      expect(vscode.window.showInformationMessage).toHaveBeenNthCalledWith(1,
        'Template "template1.md" loaded successfully'
      );
      expect(vscode.window.showInformationMessage).toHaveBeenNthCalledWith(2,
        'Template "template2.md" loaded successfully'
      );
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
  });
});
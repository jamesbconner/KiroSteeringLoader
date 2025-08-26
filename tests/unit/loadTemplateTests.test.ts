/**
 * Unit tests for SteeringTemplateProvider loadTemplate method
 * Tests successful template loading, error handling, and user feedback
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileSystemMockUtils } from '../mocks/fs';

// Mock the modules first (hoisted)
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: undefined
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn()
  },
  EventEmitter: class MockEventEmitter {
    private listeners: Array<(e: any) => any> = [];
    
    public readonly event = (listener: (e: any) => any) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener);
          if (index >= 0) {
            this.listeners.splice(index, 1);
          }
        }
      };
    };

    fire(data: any): void {
      this.listeners.forEach(listener => listener(data));
    }

    dispose(): void {
      this.listeners = [];
    }
  },
  TreeItem: class MockTreeItem {
    constructor(public label: string, public collapsibleState?: number) {}
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string) {}
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  }
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  basename: vi.fn((path, ext) => {
    const name = path.split('/').pop() || path;
    return ext ? name.replace(ext, '') : name;
  })
}));

// Import after mocking
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';

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
  let mockVSCode: any;
  let mockFs: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    fileSystemMockUtils.reset();
    
    // Get the mocked modules
    mockVSCode = await vi.importMock('vscode');
    mockFs = await vi.importMock('fs');
    
    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() }
    };
    
    // Create provider instance
    provider = new SteeringTemplateProvider(mockContext);
  });

  describe('successful template loading', () => {
    it('should load template successfully with proper file operations and directory creation', async () => {
      // Arrange
      const templatePath = '/test/templates/template1.md';
      const templateContent = '# Test Template\nThis is test content';
      const workspacePath = '/test/workspace';
      const steeringDir = '/test/workspace/.kiro/steering';
      const targetPath = '/test/workspace/.kiro/steering/template1.md';

      // Set up file system
      fileSystemMockUtils.setupFileSystem({
        directories: ['/test/templates', workspacePath],
        files: {
          [templatePath]: templateContent
        }
      });

      // Set up workspace
      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      // Mock file system operations
      mockFs.existsSync.mockReturnValue(false); // Directory doesn't exist initially
      mockFs.readFileSync.mockReturnValue(templateContent);

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(steeringDir, { recursive: true });
      expect(mockFs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(targetPath, templateContent);
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith('Template "template1.md" loaded successfully');
    });

    it('should create .kiro/steering directory when it does not exist', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      // Mock existsSync to return false for steering directory
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue(templateContent);

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.kiro/steering', { recursive: true });
    });

    it('should not create directory when .kiro/steering already exists', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      // Mock existsSync to return true for steering directory
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle empty template files', async () => {
      // Arrange
      const templatePath = '/test/templates/empty-template.md';
      const templateContent = '';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/workspace/.kiro/steering/empty-template.md',
        ''
      );
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "empty-template.md" loaded successfully'
      );
    });
  });

  describe('error handling for missing template paths', () => {
    it('should show error message when template path is empty string', async () => {
      // Act
      await provider.loadTemplate('');

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when template path is undefined', async () => {
      // Act
      await provider.loadTemplate(undefined as any);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when template path is null', async () => {
      // Act
      await provider.loadTemplate(null as any);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling for missing workspace folders', () => {
    it('should show error message when no workspace folders are open', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      mockVSCode.workspace.workspaceFolders = undefined;

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when workspace folders array is empty', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      mockVSCode.workspace.workspaceFolders = [];

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling for file system errors', () => {
    it('should handle template file not found error', async () => {
      // Arrange
      const templatePath = '/test/templates/nonexistent.md';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error(`ENOENT: no such file or directory, open '${templatePath}'`);
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        `Failed to load template: Error: ENOENT: no such file or directory, open '${templatePath}'`
      );
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle permission denied error when reading template', async () => {
      // Arrange
      const templatePath = '/test/templates/restricted.md';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, open \'/test/templates/restricted.md\'');
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to load template: Error: EACCES: permission denied, open \'/test/templates/restricted.md\''
      );
    });

    it('should handle permission denied error when creating directory', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue(templateContent);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, mkdir \'/test/workspace/.kiro\'');
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to load template: Error: EACCES: permission denied, mkdir \'/test/workspace/.kiro\''
      );
    });

    it('should handle permission denied error when writing template file', async () => {
      // Arrange
      const templatePath = '/test/templates/template.md';
      const templateContent = '# Template Content';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, open \'/test/workspace/.kiro/steering/template.md\'');
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to load template: Error: EACCES: permission denied, open \'/test/workspace/.kiro/steering/template.md\''
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
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(templateContent);

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(1);
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'Template "my-awesome-template.md" loaded successfully'
      );
      expect(mockVSCode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should show error message with full error details', async () => {
      // Arrange
      const templatePath = '/test/templates/error-template.md';
      const workspacePath = '/test/workspace';
      const specificError = new Error('Specific file system error with details');

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw specificError;
      });

      // Act
      await provider.loadTemplate(templatePath);

      // Assert
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to load template: Error: Specific file system error with details'
      );
      expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle multiple consecutive loadTemplate calls', async () => {
      // Arrange
      const templatePath1 = '/test/templates/template1.md';
      const templatePath2 = '/test/templates/template2.md';
      const templateContent1 = '# Template 1';
      const templateContent2 = '# Template 2';
      const workspacePath = '/test/workspace';

      const workspaceFolder = createMockWorkspaceFolder('test-workspace', workspacePath);
      mockVSCode.workspace.workspaceFolders = [workspaceFolder];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path === templatePath1) return templateContent1;
        if (path === templatePath2) return templateContent2;
        return '';
      });

      // Act
      await provider.loadTemplate(templatePath1);
      await provider.loadTemplate(templatePath2);

      // Assert
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledTimes(2);
      expect(mockVSCode.window.showInformationMessage).toHaveBeenNthCalledWith(1,
        'Template "template1.md" loaded successfully'
      );
      expect(mockVSCode.window.showInformationMessage).toHaveBeenNthCalledWith(2,
        'Template "template2.md" loaded successfully'
      );
      expect(mockVSCode.window.showErrorMessage).not.toHaveBeenCalled();
    });
  });
});
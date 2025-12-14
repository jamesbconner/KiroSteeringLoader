/**
 * Unit tests for FileSystemService
 * Tests file operations, directory management, error handling,
 * and user interaction for template loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSystemService } from '../../../src/services/FileSystemService';
import { LoadResult } from '../../../src/types';
import { GitHubSteeringError, ErrorCode } from '../../../src/errors';

// Mock Node.js fs module
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn()
  },
  constants: {
    F_OK: 0
  }
}));

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn()
  }
}));

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  let mockFs: any;
  let mockVscode: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get mocked modules
    const fs = await import('fs');
    const vscode = await import('vscode');
    mockFs = fs.promises;
    mockVscode = vscode.window;
    
    // Create service instance
    fileSystemService = new FileSystemService();
  });

  describe('loadTemplate', () => {
    const testContent = '# Test Template\n\nThis is a test template.';
    const testFilename = 'test-template.md';
    const testWorkspacePath = '/workspace';
    const expectedTargetPath = '/workspace/.kiro/steering/test-template.md';

    it('should successfully load template to new file', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true }); // Directory exists
      mockFs.access.mockRejectedValue(new Error('ENOENT')); // File doesn't exist
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath);

      // Assert
      expect(result).toEqual({
        success: true,
        filepath: expectedTargetPath
      });
      expect(mockFs.writeFile).toHaveBeenCalledWith(expectedTargetPath, testContent, 'utf8');
    });

    it('should create steering directory if it does not exist', async () => {
      // Arrange
      mockFs.stat.mockRejectedValue(new Error('ENOENT')); // Directory doesn't exist
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('ENOENT')); // File doesn't exist
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath);

      // Assert
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        '/workspace/.kiro/steering',
        { recursive: true }
      );
      expect(result.success).toBe(true);
    });

    it('should prompt for overwrite when file exists and user chooses overwrite', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true }); // Directory exists
      mockFs.access.mockResolvedValue(undefined); // File exists
      mockVscode.showWarningMessage.mockResolvedValue('Overwrite');
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath);

      // Assert
      expect(mockVscode.showWarningMessage).toHaveBeenCalledWith(
        `File "${testFilename}" already exists. Do you want to overwrite it?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      expect(result.success).toBe(true);
    });

    it('should cancel when file exists and user chooses cancel', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true }); // Directory exists
      mockFs.access.mockResolvedValue(undefined); // File exists
      mockVscode.showWarningMessage.mockResolvedValue('Cancel');

      // Act
      const result = await fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User cancelled overwrite'
      });
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle permission denied errors', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      const permissionError = new Error('EACCES: permission denied');
      mockFs.writeFile.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath))
        .rejects.toThrow(GitHubSteeringError);
    });

    it('should handle disk full errors', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      const diskFullError = new Error('ENOSPC: no space left on device');
      mockFs.writeFile.mockRejectedValue(diskFullError);

      // Act & Assert
      await expect(fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath))
        .rejects.toThrow(GitHubSteeringError);
    });

    it('should return error result for unknown errors', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      const unknownError = new Error('Unknown file system error');
      mockFs.writeFile.mockRejectedValue(unknownError);

      // Act
      const result = await fileSystemService.loadTemplate(testContent, testFilename, testWorkspacePath);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Unknown file system error'
      });
    });
  });

  describe('fileExists', () => {
    const testFilePath = '/test/file.txt';

    it('should return true when file exists', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await fileSystemService.fileExists(testFilePath);

      // Assert
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(testFilePath, 0);
    });

    it('should return false when file does not exist', async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await fileSystemService.fileExists(testFilePath);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('directoryExists', () => {
    const testDirPath = '/test/directory';

    it('should return true when directory exists', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });

      // Act
      const result = await fileSystemService.directoryExists(testDirPath);

      // Assert
      expect(result).toBe(true);
      expect(mockFs.stat).toHaveBeenCalledWith(testDirPath);
    });

    it('should return false when path exists but is not directory', async () => {
      // Arrange
      mockFs.stat.mockResolvedValue({ isDirectory: () => false });

      // Act
      const result = await fileSystemService.directoryExists(testDirPath);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when path does not exist', async () => {
      // Arrange
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await fileSystemService.directoryExists(testDirPath);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('promptOverwrite', () => {
    const testFilename = 'test.md';

    it('should return overwrite when user chooses Overwrite', async () => {
      // Arrange
      mockVscode.showWarningMessage.mockResolvedValue('Overwrite');

      // Act
      const result = await fileSystemService.promptOverwrite(testFilename);

      // Assert
      expect(result).toBe('overwrite');
      expect(mockVscode.showWarningMessage).toHaveBeenCalledWith(
        `File "${testFilename}" already exists. Do you want to overwrite it?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
    });

    it('should return cancel when user chooses Cancel', async () => {
      // Arrange
      mockVscode.showWarningMessage.mockResolvedValue('Cancel');

      // Act
      const result = await fileSystemService.promptOverwrite(testFilename);

      // Assert
      expect(result).toBe('cancel');
    });

    it('should return cancel when user dismisses dialog', async () => {
      // Arrange
      mockVscode.showWarningMessage.mockResolvedValue(undefined);

      // Act
      const result = await fileSystemService.promptOverwrite(testFilename);

      // Assert
      expect(result).toBe('cancel');
    });
  });

  describe('readFile', () => {
    const testFilePath = '/test/file.txt';
    const testContent = 'File content';

    it('should successfully read file content', async () => {
      // Arrange
      mockFs.readFile.mockResolvedValue(testContent);

      // Act
      const result = await fileSystemService.readFile(testFilePath);

      // Assert
      expect(result).toBe(testContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    });

    it('should throw GitHubSteeringError for file not found', async () => {
      // Arrange
      const notFoundError = new Error('ENOENT: no such file or directory');
      mockFs.readFile.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(fileSystemService.readFile(testFilePath))
        .rejects.toThrow(GitHubSteeringError);
    });

    it('should throw GitHubSteeringError for permission denied', async () => {
      // Arrange
      const permissionError = new Error('EACCES: permission denied');
      mockFs.readFile.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(fileSystemService.readFile(testFilePath))
        .rejects.toThrow(GitHubSteeringError);
    });

    it('should rethrow unknown errors', async () => {
      // Arrange
      const unknownError = new Error('Unknown error');
      mockFs.readFile.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(fileSystemService.readFile(testFilePath))
        .rejects.toThrow('Unknown error');
    });
  });

  describe('listFiles', () => {
    const testDirPath = '/test/directory';

    it('should list all files when no extension filter', async () => {
      // Arrange
      const files = ['file1.txt', 'file2.md', 'file3.js'];
      mockFs.readdir.mockResolvedValue(files);

      // Act
      const result = await fileSystemService.listFiles(testDirPath);

      // Assert
      expect(result).toEqual(files);
      expect(mockFs.readdir).toHaveBeenCalledWith(testDirPath);
    });

    it('should filter files by extension', async () => {
      // Arrange
      const files = ['template1.md', 'template2.md', 'readme.txt', 'config.json'];
      const expectedFiltered = ['template1.md', 'template2.md'];
      mockFs.readdir.mockResolvedValue(files);

      // Act
      const result = await fileSystemService.listFiles(testDirPath, '.md');

      // Assert
      expect(result).toEqual(expectedFiltered);
    });

    it('should return empty array when directory does not exist', async () => {
      // Arrange
      const notFoundError = new Error('ENOENT: no such file or directory');
      mockFs.readdir.mockRejectedValue(notFoundError);

      // Act
      const result = await fileSystemService.listFiles(testDirPath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should rethrow non-ENOENT errors', async () => {
      // Arrange
      const permissionError = new Error('EACCES: permission denied');
      mockFs.readdir.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(fileSystemService.listFiles(testDirPath))
        .rejects.toThrow('EACCES: permission denied');
    });

    it('should handle empty directory', async () => {
      // Arrange
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await fileSystemService.listFiles(testDirPath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle extension filter with no matches', async () => {
      // Arrange
      const files = ['file1.txt', 'file2.js'];
      mockFs.readdir.mockResolvedValue(files);

      // Act
      const result = await fileSystemService.listFiles(testDirPath, '.md');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
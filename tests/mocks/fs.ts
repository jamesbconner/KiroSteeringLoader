/**
 * Type-safe file system mocks for testing
 * Provides comprehensive mocking for Node.js fs operations used in the extension
 */

import { vi, type MockedFunction } from 'vitest';

// File system state interface for managing mock file system
export interface MockFileSystemState {
  files: Map<string, string>;
  directories: Set<string>;
}

// Mock file system operations interface
export interface MockedFileSystem {
  existsSync: MockedFunction<(path: string) => boolean>;
  readdirSync: MockedFunction<(path: string) => string[]>;
  readFileSync: MockedFunction<(path: string, encoding?: BufferEncoding) => string>;
  writeFileSync: MockedFunction<(path: string, data: string) => void>;
  mkdirSync: MockedFunction<(path: string, options?: { recursive?: boolean }) => void>;
}

// Global mock file system state
let mockFileSystemState: MockFileSystemState = {
  files: new Map(),
  directories: new Set()
};

/**
 * Normalize path separators for cross-platform compatibility
 * Always normalize to forward slashes for internal storage
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get parent directory path
 */
function getParentDirectory(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  
  if (lastSlash === -1) {
    return '.';
  }
  
  const parent = normalized.substring(0, lastSlash);
  
  // Handle Windows root (C:, D:, etc.)
  if (/^[a-zA-Z]:$/.test(parent)) {
    return parent;
  }
  
  // Handle POSIX root
  if (parent === '') {
    return '/';
  }
  
  return parent;
}

/**
 * Check if a directory exists in the mock file system
 */
function directoryExists(dirPath: string): boolean {
  const normalized = normalizePath(dirPath);
  return mockFileSystemState.directories.has(normalized);
}

/**
 * Check if a file exists in the mock file system
 */
function fileExists(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return mockFileSystemState.files.has(normalized);
}

/**
 * Create directory and all parent directories in mock file system
 */
function createDirectoryRecursive(dirPath: string): void {
  const normalized = normalizePath(dirPath);
  
  // Handle Windows absolute paths (C:, D:, etc.)
  const isWindowsAbsolute = /^[a-zA-Z]:/.test(normalized);
  const parts = normalized.split('/').filter(part => part.length > 0);
  
  let currentPath = '';
  for (const part of parts) {
    if (currentPath === '' && isWindowsAbsolute) {
      // For Windows paths, don't add leading slash
      currentPath = part;
    } else if (currentPath === '' && !isWindowsAbsolute) {
      // For POSIX absolute paths, add leading slash
      currentPath = '/' + part;
    } else {
      currentPath += '/' + part;
    }
    mockFileSystemState.directories.add(currentPath);
  }
}

/**
 * Mock implementation of fs.existsSync
 */
const mockExistsSync = vi.fn().mockImplementation((path: string): boolean => {
  const normalized = normalizePath(path);
  return fileExists(normalized) || directoryExists(normalized);
});

/**
 * Mock implementation of fs.readdirSync
 */
const mockReaddirSync = vi.fn().mockImplementation((path: string): string[] => {
  const normalized = normalizePath(path);
  
  if (!directoryExists(normalized)) {
    throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
  }
  
  const files: string[] = [];
  const directories: string[] = [];
  
  // Find all files in this directory
  for (const [filePath] of mockFileSystemState.files) {
    const fileDir = getParentDirectory(filePath);
    if (fileDir === normalized) {
      const fileName = filePath.substring(normalized.length + 1);
      if (!fileName.includes('/')) {
        files.push(fileName);
      }
    }
  }
  
  // Find all subdirectories in this directory
  for (const dirPath of mockFileSystemState.directories) {
    const parentDir = getParentDirectory(dirPath);
    if (parentDir === normalized) {
      const dirName = dirPath.substring(normalized.length + 1);
      if (!dirName.includes('/')) {
        directories.push(dirName);
      }
    }
  }
  
  return [...directories, ...files].sort();
});

/**
 * Mock implementation of fs.readFileSync
 */
const mockReadFileSync = vi.fn().mockImplementation((path: string, _encoding?: BufferEncoding): string => {
  const normalized = normalizePath(path);
  
  if (!fileExists(normalized)) {
    throw new Error(`ENOENT: no such file or directory, open '${path}'`);
  }
  
  const content = mockFileSystemState.files.get(normalized);
  if (content === undefined) {
    throw new Error(`Failed to read file: ${path}`);
  }
  
  return content;
});

/**
 * Mock implementation of fs.writeFileSync
 */
const mockWriteFileSync = vi.fn().mockImplementation((path: string, data: string): void => {
  const normalized = normalizePath(path);
  const parentDir = getParentDirectory(normalized);
  
  // Ensure parent directory exists
  if (!directoryExists(parentDir)) {
    throw new Error(`ENOENT: no such file or directory, open '${path}'`);
  }
  
  mockFileSystemState.files.set(normalized, data);
});

/**
 * Mock implementation of fs.mkdirSync
 */
const mockMkdirSync = vi.fn().mockImplementation((path: string, options?: { recursive?: boolean }): void => {
  const normalized = normalizePath(path);
  
  if (options?.recursive) {
    createDirectoryRecursive(normalized);
  } else {
    const parentDir = getParentDirectory(normalized);
    if (!directoryExists(parentDir)) {
      throw new Error(`ENOENT: no such file or directory, mkdir '${path}'`);
    }
    mockFileSystemState.directories.add(normalized);
  }
});

// Create the mock file system object
export const createFileSystemMock = (): MockedFileSystem => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync
});

// Default export for easier importing
export const mockFs = createFileSystemMock();

/**
 * File system mock utilities for test setup and management
 */
export const fileSystemMockUtils = {
  /**
   * Reset the mock file system to empty state
   */
  reset(): void {
    mockFileSystemState = {
      files: new Map(),
      directories: new Set()
    };
    
    // Clear all mock call history
    vi.clearAllMocks();
  },

  /**
   * Set up a mock file system state with files and directories
   */
  setupFileSystem(config: {
    files?: Record<string, string>;
    directories?: string[];
  }): void {
    this.reset();
    
    // Add directories
    if (config.directories) {
      for (const dir of config.directories) {
        createDirectoryRecursive(dir);
      }
    }
    
    // Add files (and their parent directories)
    if (config.files) {
      for (const [filePath, content] of Object.entries(config.files)) {
        const normalized = normalizePath(filePath);
        const parentDir = getParentDirectory(normalized);
        
        // Ensure parent directory exists
        createDirectoryRecursive(parentDir);
        
        // Add the file
        mockFileSystemState.files.set(normalized, content);
      }
    }
  },

  /**
   * Add a file to the mock file system
   */
  addFile(filePath: string, content: string): void {
    const normalized = normalizePath(filePath);
    const parentDir = getParentDirectory(normalized);
    
    // Ensure parent directory exists
    createDirectoryRecursive(parentDir);
    
    mockFileSystemState.files.set(normalized, content);
  },

  /**
   * Add a directory to the mock file system
   */
  addDirectory(dirPath: string): void {
    createDirectoryRecursive(dirPath);
  },

  /**
   * Remove a file from the mock file system
   */
  removeFile(filePath: string): void {
    const normalized = normalizePath(filePath);
    mockFileSystemState.files.delete(normalized);
  },

  /**
   * Remove a directory from the mock file system
   */
  removeDirectory(dirPath: string): void {
    const normalized = normalizePath(dirPath);
    mockFileSystemState.directories.delete(normalized);
    
    // Remove all files and subdirectories within this directory
    const filesToRemove: string[] = [];
    const dirsToRemove: string[] = [];
    
    for (const [filePath] of mockFileSystemState.files) {
      if (filePath.startsWith(normalized + '/')) {
        filesToRemove.push(filePath);
      }
    }
    
    for (const dirPath of mockFileSystemState.directories) {
      if (dirPath.startsWith(normalized + '/')) {
        dirsToRemove.push(dirPath);
      }
    }
    
    filesToRemove.forEach(path => mockFileSystemState.files.delete(path));
    dirsToRemove.forEach(path => mockFileSystemState.directories.delete(path));
  },

  /**
   * Get current mock file system state (for debugging)
   */
  getState(): MockFileSystemState {
    return {
      files: new Map(mockFileSystemState.files),
      directories: new Set(mockFileSystemState.directories)
    };
  },

  /**
   * Check if a path exists in the mock file system
   */
  exists(path: string): boolean {
    const normalized = normalizePath(path);
    return fileExists(normalized) || directoryExists(normalized);
  },

  /**
   * Get file content from mock file system
   */
  getFileContent(filePath: string): string | undefined {
    const normalized = normalizePath(filePath);
    return mockFileSystemState.files.get(normalized);
  },

  /**
   * List all files in the mock file system
   */
  listFiles(): string[] {
    return Array.from(mockFileSystemState.files.keys()).sort();
  },

  /**
   * List all directories in the mock file system
   */
  listDirectories(): string[] {
    return Array.from(mockFileSystemState.directories).sort();
  },

  /**
   * Mock readdir to throw an error for a specific path
   */
  mockReadDirError(path: string, error: Error): void {
    const normalized = normalizePath(path);
    mockReaddirSync.mockImplementationOnce((testPath: string) => {
      if (normalizePath(testPath) === normalized) {
        throw error;
      }
      // Fall back to default implementation for other paths
      return mockReaddirSync.getMockImplementation()!(testPath);
    });
  }
};

/**
 * Common file system test scenarios
 */
export const fileSystemScenarios = {
  /**
   * Set up a typical templates directory structure
   */
  templatesDirectory(templatesPath: string = '/test/templates'): void {
    fileSystemMockUtils.setupFileSystem({
      directories: [templatesPath],
      files: {
        [`${templatesPath}/template1.md`]: '# Template 1\nThis is template 1 content',
        [`${templatesPath}/template2.md`]: '# Template 2\nThis is template 2 content',
        [`${templatesPath}/subfolder/template3.md`]: '# Template 3\nThis is template 3 content',
        [`${templatesPath}/not-a-template.txt`]: 'This is not a markdown file'
      }
    });
  },

  /**
   * Set up an empty templates directory
   */
  emptyTemplatesDirectory(templatesPath: string = '/test/templates'): void {
    fileSystemMockUtils.setupFileSystem({
      directories: [templatesPath]
    });
  },

  /**
   * Set up a workspace with .kiro/steering directory
   */
  workspaceWithSteering(workspacePath: string = '/test/workspace'): void {
    fileSystemMockUtils.setupFileSystem({
      directories: [
        workspacePath,
        `${workspacePath}/.kiro`,
        `${workspacePath}/.kiro/steering`
      ],
      files: {
        [`${workspacePath}/.kiro/steering/existing-template.md`]: '# Existing Template\nContent'
      }
    });
  },

  /**
   * Set up a workspace without .kiro directory
   */
  workspaceWithoutKiro(workspacePath: string = '/test/workspace'): void {
    fileSystemMockUtils.setupFileSystem({
      directories: [workspacePath]
    });
  },

  /**
   * Set up a scenario where templates path doesn't exist
   */
  nonExistentTemplatesPath(): void {
    fileSystemMockUtils.setupFileSystem({
      directories: ['/test/other-directory']
    });
  }
};
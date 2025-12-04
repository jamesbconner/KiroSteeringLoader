/**
 * Type-safe path utility mocks for cross-platform testing
 * Provides comprehensive mocking for Node.js path operations used in the extension
 */

import { vi, type MockedFunction } from 'vitest';

// Mock path operations interface
export interface MockedPath {
  join: MockedFunction<(...paths: string[]) => string>;
  basename: MockedFunction<(path: string, ext?: string) => string>;
  dirname: MockedFunction<(path: string) => string>;
  extname: MockedFunction<(path: string) => string>;
  resolve: MockedFunction<(...paths: string[]) => string>;
  relative: MockedFunction<(from: string, to: string) => string>;
  normalize: MockedFunction<(path: string) => string>;
  isAbsolute: MockedFunction<(path: string) => boolean>;
  sep: string;
  delimiter: string;
  posix: {
    join: MockedFunction<(...paths: string[]) => string>;
    basename: MockedFunction<(path: string, ext?: string) => string>;
    dirname: MockedFunction<(path: string) => string>;
    extname: MockedFunction<(path: string) => string>;
    resolve: MockedFunction<(...paths: string[]) => string>;
    relative: MockedFunction<(from: string, to: string) => string>;
    normalize: MockedFunction<(path: string) => string>;
    isAbsolute: MockedFunction<(path: string) => boolean>;
    sep: string;
    delimiter: string;
  };
  win32: {
    join: MockedFunction<(...paths: string[]) => string>;
    basename: MockedFunction<(path: string, ext?: string) => string>;
    dirname: MockedFunction<(path: string) => string>;
    extname: MockedFunction<(path: string) => string>;
    resolve: MockedFunction<(...paths: string[]) => string>;
    relative: MockedFunction<(from: string, to: string) => string>;
    normalize: MockedFunction<(path: string) => string>;
    isAbsolute: MockedFunction<(path: string) => boolean>;
    sep: string;
    delimiter: string;
  };
}

// Platform detection for cross-platform path handling
let mockPlatform: 'posix' | 'win32' = 'posix';

/**
 * Normalize path separators based on current mock platform
 */
function normalizeSeparators(path: string): string {
  if (mockPlatform === 'win32') {
    return path.replace(/\//g, '\\');
  }
  return path.replace(/\\/g, '/');
}

/**
 * Get path separator for current mock platform
 */
function getSeparator(): string {
  return mockPlatform === 'win32' ? '\\' : '/';
}

/**
 * Get path delimiter for current mock platform
 */
function getDelimiter(): string {
  return mockPlatform === 'win32' ? ';' : ':';
}

/**
 * Mock implementation of path.join
 */
const mockJoin = vi.fn().mockImplementation((...paths: string[]): string => {
  if (paths.length === 0) return '.';
  
  const filteredPaths = paths.filter(path => path && path.length > 0);
  if (filteredPaths.length === 0) return '.';
  
  let joined = filteredPaths.join('/');
  
  // Normalize multiple slashes
  joined = joined.replace(/\/+/g, '/');
  
  // Handle leading slash
  if (filteredPaths[0].startsWith('/')) {
    joined = '/' + joined.replace(/^\/+/, '');
  }
  
  // Remove trailing slash unless it's the root
  if (joined.length > 1 && joined.endsWith('/')) {
    joined = joined.slice(0, -1);
  }
  
  return normalizeSeparators(joined);
});

/**
 * Mock implementation of path.basename
 */
const mockBasename = vi.fn().mockImplementation((path: string, ext?: string): string => {
  if (!path || path.length === 0) return '';
  
  const normalized = path.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  let basename = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
  
  if (ext && basename.endsWith(ext)) {
    basename = basename.substring(0, basename.length - ext.length);
  }
  
  return basename;
});

/**
 * Mock implementation of path.dirname
 */
const mockDirname = vi.fn().mockImplementation((path: string): string => {
  if (!path || path.length === 0) return '.';
  
  const normalized = path.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  
  return normalizeSeparators(normalized.substring(0, lastSlash));
});

/**
 * Mock implementation of path.extname
 */
const mockExtname = vi.fn().mockImplementation((path: string): string => {
  if (!path || path.length === 0) return '';
  
  const basename = path.replace(/\\/g, '/').split('/').pop() || '';
  const lastDot = basename.lastIndexOf('.');
  
  if (lastDot === -1 || lastDot === 0) return '';
  
  return basename.substring(lastDot);
});

/**
 * Mock implementation of path.resolve
 */
const mockResolve = vi.fn().mockImplementation((...paths: string[]): string => {
  let resolved = '';
  let isAbsolute = false;
  
  for (let i = paths.length - 1; i >= 0 && !isAbsolute; i--) {
    const path = paths[i];
    if (path && path.length > 0) {
      resolved = path + '/' + resolved;
      isAbsolute = path.startsWith('/') || (mockPlatform === 'win32' && /^[a-zA-Z]:/.test(path));
    }
  }
  
  if (!isAbsolute) {
    resolved = '/current/working/directory/' + resolved;
  }
  
  // Normalize the path
  resolved = resolved.replace(/\/+/g, '/');
  if (resolved.length > 1 && resolved.endsWith('/')) {
    resolved = resolved.slice(0, -1);
  }
  
  return normalizeSeparators(resolved);
});

/**
 * Mock implementation of path.relative
 */
const mockRelative = vi.fn().mockImplementation((from: string, to: string): string => {
  if (!from || !to) return '';
  
  const fromNormalized = from.replace(/\\/g, '/');
  const toNormalized = to.replace(/\\/g, '/');
  
  const fromParts = fromNormalized.split('/').filter(part => part.length > 0);
  const toParts = toNormalized.split('/').filter(part => part.length > 0);
  
  // Find common prefix
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);
  
  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }
  
  // Build relative path
  const upLevels = fromParts.length - commonLength;
  const downPath = toParts.slice(commonLength);
  
  const relativeParts = Array(upLevels).fill('..').concat(downPath);
  const result = relativeParts.length > 0 ? relativeParts.join('/') : '.';
  
  return normalizeSeparators(result);
});

/**
 * Mock implementation of path.normalize
 */
const mockNormalize = vi.fn().mockImplementation((path: string): string => {
  if (!path || path.length === 0) return '.';
  
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    } else if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else if (!normalized.startsWith('/')) {
        result.push('..');
      }
    } else {
      result.push(part);
    }
  }
  
  let finalPath = result.join('/');
  
  if (normalized.startsWith('/')) {
    finalPath = '/' + finalPath;
  }
  
  if (finalPath === '') {
    finalPath = normalized.startsWith('/') ? '/' : '.';
  }
  
  return normalizeSeparators(finalPath);
});

/**
 * Mock implementation of path.isAbsolute
 */
const mockIsAbsolute = vi.fn().mockImplementation((path: string): boolean => {
  if (!path || path.length === 0) return false;
  
  if (mockPlatform === 'win32') {
    return /^[a-zA-Z]:/.test(path) || path.startsWith('\\\\') || path.startsWith('/');
  }
  
  return path.startsWith('/');
});

/**
 * Create platform-specific path mock implementations
 */
function createPlatformMocks(platform: 'posix' | 'win32') {
  const originalPlatform = mockPlatform;
  
  return {
    join: vi.fn().mockImplementation((...paths: string[]) => {
      mockPlatform = platform;
      const result = mockJoin(...paths);
      mockPlatform = originalPlatform;
      return result;
    }),
    basename: vi.fn().mockImplementation((path: string, ext?: string) => {
      mockPlatform = platform;
      const result = mockBasename(path, ext);
      mockPlatform = originalPlatform;
      return result;
    }),
    dirname: vi.fn().mockImplementation((path: string) => {
      mockPlatform = platform;
      const result = mockDirname(path);
      mockPlatform = originalPlatform;
      return result;
    }),
    extname: vi.fn().mockImplementation((path: string) => {
      mockPlatform = platform;
      const result = mockExtname(path);
      mockPlatform = originalPlatform;
      return result;
    }),
    resolve: vi.fn().mockImplementation((...paths: string[]) => {
      mockPlatform = platform;
      const result = mockResolve(...paths);
      mockPlatform = originalPlatform;
      return result;
    }),
    relative: vi.fn().mockImplementation((from: string, to: string) => {
      mockPlatform = platform;
      const result = mockRelative(from, to);
      mockPlatform = originalPlatform;
      return result;
    }),
    normalize: vi.fn().mockImplementation((path: string) => {
      mockPlatform = platform;
      const result = mockNormalize(path);
      mockPlatform = originalPlatform;
      return result;
    }),
    isAbsolute: vi.fn().mockImplementation((path: string) => {
      mockPlatform = platform;
      const result = mockIsAbsolute(path);
      mockPlatform = originalPlatform;
      return result;
    }),
    sep: platform === 'win32' ? '\\' : '/',
    delimiter: platform === 'win32' ? ';' : ':'
  };
}

/**
 * Create the mock path object
 */
export const createPathMock = (): MockedPath => ({
  join: mockJoin,
  basename: mockBasename,
  dirname: mockDirname,
  extname: mockExtname,
  resolve: mockResolve,
  relative: mockRelative,
  normalize: mockNormalize,
  isAbsolute: mockIsAbsolute,
  sep: getSeparator(),
  delimiter: getDelimiter(),
  posix: createPlatformMocks('posix'),
  win32: createPlatformMocks('win32')
});

// Default export for easier importing
export const mockPath = createPathMock();

// Export as default for compatibility
export default mockPath;

/**
 * Path mock utilities for test setup and management
 */
export const pathMockUtils = {
  /**
   * Set the mock platform for path operations
   */
  setPlatform(platform: 'posix' | 'win32'): void {
    mockPlatform = platform;
  },

  /**
   * Get the current mock platform
   */
  getPlatform(): 'posix' | 'win32' {
    return mockPlatform;
  },

  /**
   * Reset all path mocks and clear call history
   */
  reset(): void {
    vi.clearAllMocks();
    mockPlatform = 'posix';
  },

  /**
   * Create a cross-platform path for testing
   */
  createPath(...segments: string[]): string {
    return segments.join(getSeparator());
  },

  /**
   * Convert a path to the current mock platform format
   */
  toPlatformPath(path: string): string {
    return normalizeSeparators(path);
  }
};

/**
 * Common path test scenarios
 */
export const pathScenarios = {
  /**
   * Test paths for Windows platform
   */
  windows: {
    templatesPath: 'C:\\Users\\Test\\Templates',
    workspacePath: 'C:\\Users\\Test\\Workspace',
    templateFile: 'C:\\Users\\Test\\Templates\\template.md',
    steeringDir: 'C:\\Users\\Test\\Workspace\\.kiro\\steering'
  },

  /**
   * Test paths for POSIX platform (Linux/macOS)
   */
  posix: {
    templatesPath: '/home/test/templates',
    workspacePath: '/home/test/workspace',
    templateFile: '/home/test/templates/template.md',
    steeringDir: '/home/test/workspace/.kiro/steering'
  },

  /**
   * Relative paths for testing
   */
  relative: {
    templatesPath: './templates',
    workspacePath: './workspace',
    templateFile: './templates/template.md',
    steeringDir: './workspace/.kiro/steering'
  }
};
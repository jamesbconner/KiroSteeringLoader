/**
 * Unit tests for ErrorHandler
 * 
 * Tests error message formatting, action suggestions, and recovery strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from '../../src/services/ErrorHandler';
import { GitHubSteeringError, ErrorCode, getUserMessage } from '../../src/errors';
import * as vscode from 'vscode';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn()
    })),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn()
  },
  commands: {
    executeCommand: vi.fn()
  }
}));

describe('ErrorHandler Unit Tests', () => {
  let errorHandler: ErrorHandler;
  let mockOutputChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockOutputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn()
    };
    
    (vscode.window.createOutputChannel as any).mockReturnValue(mockOutputChannel);
    
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.dispose();
  });

  describe('Error Message Formatting', () => {
    it('should format NETWORK_ERROR with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.NETWORK_ERROR);
      expect(message).toContain('internet connection');
      expect(message).not.toContain('undefined');
    });

    it('should format TIMEOUT with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.TIMEOUT);
      expect(message).toContain('timed out');
      expect(message).not.toContain('undefined');
    });

    it('should format REPOSITORY_NOT_FOUND with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.REPOSITORY_NOT_FOUND);
      expect(message).toContain('not found');
      expect(message).toContain('repository');
    });

    it('should format UNAUTHORIZED with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.UNAUTHORIZED);
      expect(message).toContain('Authentication');
      expect(message).toContain('token');
    });

    it('should format RATE_LIMIT_EXCEEDED with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(message).toContain('rate limit');
      expect(message).toContain('exceeded');
    });

    it('should format FORBIDDEN with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.FORBIDDEN);
      expect(message).toContain('forbidden');
      expect(message).toContain('permission');
    });

    it('should format PERMISSION_DENIED with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.PERMISSION_DENIED);
      expect(message).toContain('Permission denied');
      expect(message).toContain('file system');
    });

    it('should format DISK_FULL with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.DISK_FULL);
      expect(message).toContain('Disk is full');
      expect(message).toContain('free up space');
    });

    it('should format FILE_EXISTS with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.FILE_EXISTS);
      expect(message).toContain('already exists');
      expect(message).toContain('overwrite');
    });

    it('should format INVALID_CONFIG with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.INVALID_CONFIG);
      expect(message).toContain('Invalid configuration');
      expect(message).toContain('settings');
    });

    it('should format MISSING_CONFIG with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.MISSING_CONFIG);
      expect(message).toContain('No configuration');
      expect(message).toContain('configure');
    });

    it('should format CACHE_CORRUPTED with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.CACHE_CORRUPTED);
      expect(message).toContain('corrupted');
      expect(message).toContain('cache');
    });

    it('should format CACHE_QUOTA_EXCEEDED with user-friendly message', () => {
      const message = getUserMessage(ErrorCode.CACHE_QUOTA_EXCEEDED);
      expect(message).toContain('quota exceeded');
      expect(message).toContain('cache');
    });
  });

  describe('Error Action Suggestions', () => {
    it('should suggest "Configure Token" for UNAUTHORIZED errors', () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('Configure Token');
      
      const error = new GitHubSteeringError(
        'Auth failed',
        ErrorCode.UNAUTHORIZED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Token',
        'View Output'
      );
    });

    it('should suggest "Configure Token" and "View Rate Limit" for RATE_LIMIT_EXCEEDED', () => {
      const error = new GitHubSteeringError(
        'Rate limit exceeded',
        ErrorCode.RATE_LIMIT_EXCEEDED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Token',
        'View Rate Limit',
        'View Output'
      );
    });

    it('should suggest "Configure Repository" for REPOSITORY_NOT_FOUND', () => {
      const error = new GitHubSteeringError(
        'Repo not found',
        ErrorCode.REPOSITORY_NOT_FOUND
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Repository',
        'View Output'
      );
    });

    it('should suggest "Clear Cache" for CACHE_CORRUPTED', () => {
      const error = new GitHubSteeringError(
        'Cache corrupted',
        ErrorCode.CACHE_CORRUPTED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Clear Cache',
        'View Output'
      );
    });

    it('should suggest "Retry" for NETWORK_ERROR', () => {
      const error = new GitHubSteeringError(
        'Network error',
        ErrorCode.NETWORK_ERROR
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Retry',
        'View Output'
      );
    });

    it('should suggest "Use Local Mode" for MISSING_CONFIG', () => {
      const error = new GitHubSteeringError(
        'No config',
        ErrorCode.MISSING_CONFIG
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Repository',
        'Use Local Mode'
      );
    });
  });

  describe('Error Action Execution', () => {
    it('should execute "Configure Token" command when action is selected', async () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('Configure Token');
      
      const error = new GitHubSteeringError(
        'Auth failed',
        ErrorCode.UNAUTHORIZED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      // Wait for promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'kiroSteeringLoader.configureGitHubToken'
      );
    });

    it('should execute "Configure Repository" command when action is selected', async () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('Configure Repository');
      
      const error = new GitHubSteeringError(
        'Repo not found',
        ErrorCode.REPOSITORY_NOT_FOUND
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'kiroSteeringLoader.configureGitHubRepository'
      );
    });

    it('should execute "Clear Cache" command when action is selected', async () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('Clear Cache');
      
      const error = new GitHubSteeringError(
        'Cache corrupted',
        ErrorCode.CACHE_CORRUPTED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'kiroSteeringLoader.clearCache'
      );
    });

    it('should execute "Retry" command when action is selected', async () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('Retry');
      
      const error = new GitHubSteeringError(
        'Network error',
        ErrorCode.NETWORK_ERROR
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'kiroSteeringLoader.refresh'
      );
    });

    it('should show output channel when "View Output" is selected', async () => {
      (vscode.window.showErrorMessage as any).mockResolvedValue('View Output');
      
      const error = new GitHubSteeringError(
        'Some error',
        ErrorCode.NETWORK_ERROR
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle non-GitHubSteeringError errors gracefully', () => {
      const error = new Error('Generic error');
      
      expect(() => {
        errorHandler.handleError(error, { operation: 'test' }, { 
          showNotification: false 
        });
      }).not.toThrow();
      
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should handle unknown error types gracefully', () => {
      const error = 'string error';
      
      expect(() => {
        errorHandler.handleError(error, { operation: 'test' }, { 
          showNotification: false 
        });
      }).not.toThrow();
      
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should handle errors without stack traces', () => {
      const error = new GitHubSteeringError(
        'Error without stack',
        ErrorCode.NETWORK_ERROR
      );
      delete (error as any).stack;
      
      expect(() => {
        errorHandler.handleError(error, { operation: 'test' }, { 
          showNotification: false 
        });
      }).not.toThrow();
    });
  });

  describe('Logging Controls', () => {
    it('should respect showNotification option', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.NETWORK_ERROR
      );
      
      errorHandler.handleError(error, { operation: 'test' }, { 
        showNotification: false 
      });
      
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should respect logToOutput option', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.NETWORK_ERROR
      );
      
      mockOutputChannel.appendLine.mockClear();
      
      errorHandler.handleError(error, { operation: 'test' }, { 
        logToOutput: false,
        showNotification: false
      });
      
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('should respect suggestActions option', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.UNAUTHORIZED
      );
      
      errorHandler.handleError(error, { operation: 'test' }, { 
        suggestActions: false 
      });
      
      // Should show error without action buttons
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String)
      );
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Output Channel Management', () => {
    it('should show output channel when requested', () => {
      errorHandler.showOutput();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should clear output channel when requested', () => {
      errorHandler.clearOutput();
      expect(mockOutputChannel.clear).toHaveBeenCalled();
    });

    it('should dispose output channel on dispose', () => {
      errorHandler.dispose();
      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should track error counts by code', () => {
      const error1 = new GitHubSteeringError('Error 1', ErrorCode.NETWORK_ERROR);
      const error2 = new GitHubSteeringError('Error 2', ErrorCode.NETWORK_ERROR);
      const error3 = new GitHubSteeringError('Error 3', ErrorCode.UNAUTHORIZED);
      
      errorHandler.handleError(error1, { operation: 'test' }, { 
        showNotification: false 
      });
      errorHandler.handleError(error2, { operation: 'test' }, { 
        showNotification: false 
      });
      errorHandler.handleError(error3, { operation: 'test' }, { 
        showNotification: false 
      });
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.get(ErrorCode.NETWORK_ERROR)).toBe(2);
      expect(stats.get(ErrorCode.UNAUTHORIZED)).toBe(1);
    });

    it('should return empty stats for new handler', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Retry Logic and Exponential Backoff', () => {
    it('should handle transient network errors with retry', () => {
      const error = new GitHubSteeringError(
        'Temporary network error',
        ErrorCode.NETWORK_ERROR,
        { retryable: true }
      );
      
      expect(() => {
        errorHandler.handleError(error, { 
          operation: 'fetch templates',
          details: { attempt: 1 }
        }, { 
          showNotification: false 
        });
      }).not.toThrow();
      
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should log retry attempts in error context', () => {
      const error = new GitHubSteeringError(
        'Network error after retries',
        ErrorCode.NETWORK_ERROR,
        { attempts: 3, maxRetries: 3 }
      );
      
      errorHandler.handleError(error, { 
        operation: 'fetch templates',
        details: { retriesExhausted: true }
      }, { 
        showNotification: false 
      });
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('attempts');
      expect(loggedLines).toContain('maxRetries');
    });

    it('should handle timeout errors appropriately', () => {
      const error = new GitHubSteeringError(
        'Request timeout',
        ErrorCode.TIMEOUT,
        { timeoutMs: 30000 }
      );
      
      errorHandler.handleError(error, { 
        operation: 'fetch file content'
      }, { 
        showNotification: false 
      });
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('TIMEOUT');
      expect(loggedLines).toContain('timeoutMs');
    });

    it('should not suggest retry for non-retryable errors', () => {
      const error = new GitHubSteeringError(
        'Invalid token',
        ErrorCode.UNAUTHORIZED
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      // Should not suggest "Retry" for auth errors
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Token',
        'View Output'
      );
    });

    it('should suggest retry for network errors', () => {
      const error = new GitHubSteeringError(
        'Connection failed',
        ErrorCode.NETWORK_ERROR
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Retry',
        'View Output'
      );
    });

    it('should suggest retry for timeout errors', () => {
      const error = new GitHubSteeringError(
        'Request timeout',
        ErrorCode.TIMEOUT
      );
      
      errorHandler.handleError(error, { operation: 'test' });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Retry',
        'View Output'
      );
    });
  });

  describe('Graceful Degradation Scenarios', () => {
    it('should handle rate limit errors with cache fallback suggestion', () => {
      const error = new GitHubSteeringError(
        'Rate limit exceeded',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { resetTime: new Date(Date.now() + 3600000) }
      );
      
      errorHandler.handleError(error, { 
        operation: 'fetch templates',
        details: { cacheAvailable: true }
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('RATE_LIMIT_EXCEEDED');
    });

    it('should handle repository not found with configuration suggestion', () => {
      const error = new GitHubSteeringError(
        'Repository not found',
        ErrorCode.REPOSITORY_NOT_FOUND
      );
      
      errorHandler.handleError(error, { 
        operation: 'validate repository',
        details: { owner: 'test-owner', repo: 'test-repo' }
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Repository',
        'View Output'
      );
    });

    it('should handle cache corruption with clear cache suggestion', () => {
      const error = new GitHubSteeringError(
        'Cache data corrupted',
        ErrorCode.CACHE_CORRUPTED,
        { cacheKey: 'test-key' }
      );
      
      errorHandler.handleError(error, { 
        operation: 'read cache'
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Clear Cache',
        'View Output'
      );
    });

    it('should handle missing configuration with setup suggestions', () => {
      const error = new GitHubSteeringError(
        'No repository configured',
        ErrorCode.MISSING_CONFIG
      );
      
      errorHandler.handleError(error, { 
        operation: 'fetch templates'
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Repository',
        'Use Local Mode'
      );
    });

    it('should handle file system errors gracefully', () => {
      const error = new GitHubSteeringError(
        'Permission denied',
        ErrorCode.PERMISSION_DENIED,
        { path: '/test/path' }
      );
      
      errorHandler.handleError(error, { 
        operation: 'write template file'
      });
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('PERMISSION_DENIED');
      expect(loggedLines).toContain('/test/path');
    });

    it('should handle disk full errors with clear message', () => {
      const error = new GitHubSteeringError(
        'Disk is full',
        ErrorCode.DISK_FULL,
        { availableSpace: 0 }
      );
      
      errorHandler.handleError(error, { 
        operation: 'write template file'
      });
      
      const message = getUserMessage(ErrorCode.DISK_FULL);
      expect(message).toContain('free up space');
    });

    it('should handle forbidden errors with permission guidance', () => {
      const error = new GitHubSteeringError(
        'Access forbidden',
        ErrorCode.FORBIDDEN,
        { status: 403 }
      );
      
      errorHandler.handleError(error, { 
        operation: 'fetch repository contents'
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Configure Token',
        'Configure Repository',
        'View Output'
      );
    });
  });
});

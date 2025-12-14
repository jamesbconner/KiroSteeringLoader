/**
 * Unit tests for ErrorHandler
 * Tests error logging, user notifications, and error statistics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from '../../src/services/ErrorHandler';
import { GitHubSteeringError, ErrorCode } from '../../src/errors';
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
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    showInformationMessage: vi.fn().mockResolvedValue(undefined)
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('ErrorHandler', () => {
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

  describe('Error Logging', () => {
    it('should log error details to output channel', () => {
      const error = new GitHubSteeringError(
        'Test error message',
        ErrorCode.REPOSITORY_NOT_FOUND,
        { detail: 'test detail' },
        'User friendly message'
      );
      
      const context = {
        operation: 'test-operation',
        details: { key: 'value' }
      };
      
      errorHandler.handleError(error, context, { logToOutput: true, showNotification: false });
      
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('test-operation');
      expect(loggedLines).toContain('Test error message');
      expect(loggedLines).toContain('REPOSITORY_NOT_FOUND');
    });

    it('should include stack trace when available', () => {
      const error = new Error('Test error with stack');
      
      errorHandler.handleError(
        error,
        { operation: 'test' },
        { logToOutput: true, showNotification: false }
      );
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('Stack Trace:');
    });
  });

  describe('User Notifications', () => {
    it('should show error notification when enabled', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.REPOSITORY_NOT_FOUND,
        {},
        'User friendly message'
      );
      
      errorHandler.handleError(error, { operation: 'test' }, { 
        logToOutput: false, 
        showNotification: true 
      });
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('User friendly message', 'Configure Repository', 'View Output');
    });

    it('should not show notification when disabled', () => {
      const error = new GitHubSteeringError('Test error', ErrorCode.REPOSITORY_NOT_FOUND);
      
      errorHandler.handleError(error, { operation: 'test' }, { 
        logToOutput: false, 
        showNotification: false 
      });
      
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('Info and Warning Logging', () => {
    it('should log info messages', () => {
      errorHandler.logInfo('Test info message', { key: 'value' });
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('[INFO');
      expect(loggedLines).toContain('Test info message');
      expect(loggedLines).toContain('key');
    });

    it('should log warning messages', () => {
      errorHandler.logWarning('Test warning message', { key: 'value' });
      
      const loggedLines = mockOutputChannel.appendLine.mock.calls
        .map((call: any[]) => call[0])
        .join('\n');
      
      expect(loggedLines).toContain('[WARN');
      expect(loggedLines).toContain('Test warning message');
      expect(loggedLines).toContain('key');
    });
  });

  describe('Error Statistics', () => {
    it('should track error counts by code', () => {
      const error1 = new GitHubSteeringError('Error 1', ErrorCode.REPOSITORY_NOT_FOUND);
      const error2 = new GitHubSteeringError('Error 2', ErrorCode.REPOSITORY_NOT_FOUND);
      const error3 = new GitHubSteeringError('Error 3', ErrorCode.INVALID_CONFIG);
      
      errorHandler.handleError(error1, { operation: 'test' }, { 
        logToOutput: false, 
        showNotification: false 
      });
      errorHandler.handleError(error2, { operation: 'test' }, { 
        logToOutput: false, 
        showNotification: false 
      });
      errorHandler.handleError(error3, { operation: 'test' }, { 
        logToOutput: false, 
        showNotification: false 
      });
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.get(ErrorCode.REPOSITORY_NOT_FOUND)).toBe(2);
      expect(stats.get(ErrorCode.INVALID_CONFIG)).toBe(1);
    });

    it('should return empty stats for new handler', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.size).toBe(0);
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
});
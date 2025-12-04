/**
 * Property-based tests for ErrorHandler
 * 
 * **Feature: github-steering-loader, Property 18: Error logging completeness**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
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
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn()
  },
  commands: {
    executeCommand: vi.fn()
  }
}));

describe('ErrorHandler Property Tests', () => {
  let errorHandler: ErrorHandler;
  let mockOutputChannel: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock output channel
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

  /**
   * **Feature: github-steering-loader, Property 18: Error logging completeness**
   * **Validates: Requirements 7.5**
   * 
   * For any operation that throws an error, the error details (message, stack trace, context)
   * should be written to the VS Code output channel.
   */
  it('Property 18: Error logging completeness - all error details are logged', () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          errorCode: fc.constantFrom(...Object.values(ErrorCode)),
          contextKey: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          contextValue: fc.oneof(
            fc.string().filter(s => s.length < 50),
            fc.integer(),
            fc.boolean()
          )
        }),
        ({ operation, errorMessage, errorCode, contextKey, contextValue }) => {
          // Reset mock before each iteration
          mockOutputChannel.appendLine.mockClear();
          
          const error = new GitHubSteeringError(
            errorMessage,
            errorCode,
            { detail: 'test detail' },
            'User friendly message'
          );
          
          const context = {
            operation,
            details: { [contextKey]: contextValue }
          };
          
          // Handle the error
          errorHandler.handleError(error, context, { logToOutput: true, showNotification: false });
          
          // Verify output channel was called
          expect(mockOutputChannel.appendLine).toHaveBeenCalled();
          
          // Get all logged lines
          const loggedLines = mockOutputChannel.appendLine.mock.calls
            .map((call: any[]) => call[0])
            .join('\n');
          
          // Verify all required information is present in the logs
          expect(loggedLines).toContain(operation.trim());
          expect(loggedLines).toContain(errorMessage.trim());
          expect(loggedLines).toContain(errorCode);
          expect(loggedLines).toContain(contextKey);
          
          // Verify the log contains structured information
          expect(loggedLines).toContain('Operation:');
          expect(loggedLines).toContain('Error Code:');
          expect(loggedLines).toContain('Message:');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Error logging includes stack trace when available', () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.string({ minLength: 1, maxLength: 50 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 })
        }),
        ({ operation, errorMessage }) => {
          mockOutputChannel.appendLine.mockClear();
          
          // Create error with stack trace
          const error = new Error(errorMessage);
          
          errorHandler.handleError(
            error,
            { operation },
            { logToOutput: true, showNotification: false }
          );
          
          const loggedLines = mockOutputChannel.appendLine.mock.calls
            .map((call: any[]) => call[0])
            .join('\n');
          
          // Verify stack trace is logged
          expect(loggedLines).toContain('Stack Trace:');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Info logging includes message and details', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          detailKey: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          detailValue: fc.oneof(fc.string().filter(s => s.length < 50), fc.integer(), fc.boolean())
        }),
        ({ message, detailKey, detailValue }) => {
          mockOutputChannel.appendLine.mockClear();
          
          errorHandler.logInfo(message, { [detailKey]: detailValue });
          
          const loggedLines = mockOutputChannel.appendLine.mock.calls
            .map((call: any[]) => call[0])
            .join('\n');
          
          // Verify message and details are logged
          expect(loggedLines).toContain('[INFO');
          expect(loggedLines).toContain(message.trim());
          expect(loggedLines).toContain(detailKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Warning logging includes message and details', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          detailKey: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          detailValue: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        ({ message, detailKey, detailValue }) => {
          mockOutputChannel.appendLine.mockClear();
          
          errorHandler.logWarning(message, { [detailKey]: detailValue });
          
          const loggedLines = mockOutputChannel.appendLine.mock.calls
            .map((call: any[]) => call[0])
            .join('\n');
          
          // Verify warning and details are logged
          expect(loggedLines).toContain('[WARN');
          expect(loggedLines).toContain(message.trim());
          expect(loggedLines).toContain(detailKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Error tracking increments count for each error code', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...Object.values(ErrorCode)), { minLength: 1, maxLength: 20 }),
        (errorCodes) => {
          // Create fresh error handler for this test
          const handler = new ErrorHandler();
          
          // Handle errors
          errorCodes.forEach(code => {
            const error = new GitHubSteeringError('Test error', code);
            handler.handleError(error, { operation: 'test' }, { 
              logToOutput: false, 
              showNotification: false 
            });
          });
          
          // Get stats
          const stats = handler.getErrorStats();
          
          // Count expected occurrences
          const expectedCounts = new Map<ErrorCode, number>();
          errorCodes.forEach(code => {
            expectedCounts.set(code, (expectedCounts.get(code) || 0) + 1);
          });
          
          // Verify counts match
          expectedCounts.forEach((count, code) => {
            expect(stats.get(code)).toBe(count);
          });
          
          handler.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Context details are preserved in logs', () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          details: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            fc.oneof(fc.string().filter(s => s.length < 50), fc.integer(), fc.boolean()),
            { minKeys: 1, maxKeys: 5 }
          )
        }),
        ({ operation, details }) => {
          mockOutputChannel.appendLine.mockClear();
          
          const error = new Error('Test error');
          
          errorHandler.handleError(
            error,
            { operation, details },
            { logToOutput: true, showNotification: false }
          );
          
          const loggedLines = mockOutputChannel.appendLine.mock.calls
            .map((call: any[]) => call[0])
            .join('\n');
          
          // Verify all context details are in the log
          Object.keys(details).forEach(key => {
            expect(loggedLines).toContain(key);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

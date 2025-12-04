/**
 * ErrorHandler - Centralized error handling and logging service
 * 
 * Provides error logging, user-friendly notifications, and recovery strategies
 */

import * as vscode from 'vscode';
import { GitHubSteeringError, ErrorCode, getUserMessage } from '../errors';

export interface ErrorContext {
  operation: string;
  details?: Record<string, unknown>;
  timestamp?: Date;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToOutput?: boolean;
  suggestActions?: boolean;
}

export class ErrorHandler {
  private outputChannel: vscode.OutputChannel;
  private errorCount: Map<ErrorCode, number> = new Map();

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Kiro Steering Loader');
  }

  /**
   * Handles an error with logging and user notification
   * @param error - The error to handle
   * @param context - Context information about where the error occurred
   * @param options - Options for error handling behavior
   */
  handleError(
    error: unknown,
    context: ErrorContext,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showNotification = true,
      logToOutput = true,
      suggestActions = true
    } = options;

    // Convert to GitHubSteeringError if needed
    const steeringError = this.normalizeError(error, context);

    // Track error frequency
    this.trackError(steeringError.code);

    // Log to output channel
    if (logToOutput) {
      this.logError(steeringError, context);
    }

    // Show user notification
    if (showNotification) {
      this.showErrorNotification(steeringError, suggestActions);
    }
  }

  /**
   * Logs an informational message
   * @param message - Message to log
   * @param details - Optional details object
   */
  logInfo(message: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[INFO ${timestamp}] ${message}`);
    
    if (details) {
      this.outputChannel.appendLine(`  Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param details - Optional details object
   */
  logWarning(message: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[WARN ${timestamp}] ${message}`);
    
    if (details) {
      this.outputChannel.appendLine(`  Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Shows the output channel
   */
  showOutput(): void {
    this.outputChannel.show();
  }

  /**
   * Clears the output channel
   */
  clearOutput(): void {
    this.outputChannel.clear();
  }

  /**
   * Gets error statistics
   */
  getErrorStats(): Map<ErrorCode, number> {
    return new Map(this.errorCount);
  }

  /**
   * Disposes the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }

  /**
   * Normalizes any error to GitHubSteeringError
   */
  private normalizeError(error: unknown, context: ErrorContext): GitHubSteeringError {
    if (error instanceof GitHubSteeringError) {
      return error;
    }

    if (error instanceof Error) {
      return new GitHubSteeringError(
        `${context.operation}: ${error.message}`,
        ErrorCode.NETWORK_ERROR,
        { originalError: error, ...context.details },
        error.message
      );
    }

    return new GitHubSteeringError(
      `${context.operation}: Unknown error`,
      ErrorCode.NETWORK_ERROR,
      { error, ...context.details },
      'An unexpected error occurred'
    );
  }

  /**
   * Logs error details to output channel
   */
  private logError(error: GitHubSteeringError, context: ErrorContext): void {
    const timestamp = context.timestamp || new Date();
    
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine(`[ERROR ${timestamp.toISOString()}]`);
    this.outputChannel.appendLine(`Operation: ${context.operation}`);
    this.outputChannel.appendLine(`Error Code: ${error.code}`);
    this.outputChannel.appendLine(`Message: ${error.message}`);
    
    if (error.userMessage) {
      this.outputChannel.appendLine(`User Message: ${error.userMessage}`);
    }
    
    if (context.details) {
      this.outputChannel.appendLine(`Context Details:`);
      this.outputChannel.appendLine(JSON.stringify(context.details, null, 2));
    }
    
    if (error.details) {
      this.outputChannel.appendLine(`Error Details:`);
      this.outputChannel.appendLine(JSON.stringify(error.details, null, 2));
    }
    
    if (error.stack) {
      this.outputChannel.appendLine(`Stack Trace:`);
      this.outputChannel.appendLine(error.stack);
    }
    
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('');
  }

  /**
   * Shows error notification with action buttons
   */
  private showErrorNotification(error: GitHubSteeringError, suggestActions: boolean): void {
    const userMessage = error.userMessage || getUserMessage(error.code, error.details);
    const actions = suggestActions ? this.getErrorActions(error.code) : [];

    if (actions.length > 0) {
      vscode.window.showErrorMessage(userMessage, ...actions).then(action => {
        if (action) {
          this.executeErrorAction(action, error);
        }
      });
    } else {
      vscode.window.showErrorMessage(userMessage);
    }
  }

  /**
   * Gets suggested actions for an error code
   */
  private getErrorActions(code: ErrorCode): string[] {
    switch (code) {
      case ErrorCode.UNAUTHORIZED:
        return ['Configure Token', 'View Output'];
      
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return ['Configure Token', 'View Rate Limit', 'View Output'];
      
      case ErrorCode.REPOSITORY_NOT_FOUND:
        return ['Configure Repository', 'View Output'];
      
      case ErrorCode.FORBIDDEN:
        return ['Configure Token', 'Configure Repository', 'View Output'];
      
      case ErrorCode.MISSING_CONFIG:
        return ['Configure Repository', 'Use Local Mode'];
      
      case ErrorCode.CACHE_CORRUPTED:
        return ['Clear Cache', 'View Output'];
      
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.TIMEOUT:
        return ['Retry', 'View Output'];
      
      case ErrorCode.PERMISSION_DENIED:
      case ErrorCode.DISK_FULL:
        return ['View Output'];
      
      default:
        return ['View Output'];
    }
  }

  /**
   * Executes an error action
   */
  private executeErrorAction(action: string, error: GitHubSteeringError): void {
    switch (action) {
      case 'Configure Token':
        vscode.commands.executeCommand('kiroSteeringLoader.configureGitHubToken');
        break;
      
      case 'Configure Repository':
        vscode.commands.executeCommand('kiroSteeringLoader.configureGitHubRepository');
        break;
      
      case 'Use Local Mode':
        vscode.commands.executeCommand('kiroSteeringLoader.switchToLocalMode');
        break;
      
      case 'Clear Cache':
        vscode.commands.executeCommand('kiroSteeringLoader.clearCache');
        break;
      
      case 'Retry':
        vscode.commands.executeCommand('kiroSteeringLoader.refresh');
        break;
      
      case 'View Rate Limit':
        this.showRateLimitInfo(error);
        break;
      
      case 'View Output':
        this.showOutput();
        break;
    }
  }

  /**
   * Shows rate limit information
   */
  private showRateLimitInfo(error: GitHubSteeringError): void {
    if (error.details && typeof error.details === 'object' && 'resetTime' in error.details) {
      const resetTime = error.details.resetTime as Date;
      const message = `Rate limit will reset at ${resetTime.toLocaleTimeString()}`;
      vscode.window.showInformationMessage(message);
    }
    this.showOutput();
  }

  /**
   * Tracks error frequency
   */
  private trackError(code: ErrorCode): void {
    const count = this.errorCount.get(code) || 0;
    this.errorCount.set(code, count + 1);
  }
}

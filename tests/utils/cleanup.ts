/**
 * Cleanup utilities for test teardown and resource management
 * Provides comprehensive cleanup functionality for tests to prevent memory leaks and state pollution
 */

import { vi, afterEach, beforeEach } from 'vitest';
import { fileSystemMockUtils } from '../mocks/fs';
import { pathMockUtils } from '../mocks/path';

/**
 * Interface for cleanup task
 */
export interface CleanupTask {
  id: string;
  description: string;
  cleanup: () => void | Promise<void>;
  priority: number; // Lower numbers run first
}

/**
 * Interface for resource tracker
 */
export interface ResourceTracker {
  type: 'mock' | 'file' | 'directory' | 'subscription' | 'timer' | 'custom';
  id: string;
  resource: any;
  cleanup: () => void | Promise<void>;
}

/**
 * Cleanup manager class for handling test resource cleanup
 */
export class CleanupManager {
  private static instance: CleanupManager;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private resourceTrackers: Map<string, ResourceTracker> = new Map();
  private isCleaningUp = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(task: CleanupTask): void {
    if (this.isCleaningUp) {
      console.warn(`Cannot register cleanup task '${task.id}' during cleanup`);
      return;
    }

    this.cleanupTasks.set(task.id, task);
  }

  /**
   * Register a resource for tracking and cleanup
   */
  trackResource(tracker: ResourceTracker): void {
    if (this.isCleaningUp) {
      console.warn(`Cannot track resource '${tracker.id}' during cleanup`);
      return;
    }

    this.resourceTrackers.set(tracker.id, tracker);
  }

  /**
   * Unregister a cleanup task
   */
  unregisterCleanupTask(taskId: string): void {
    this.cleanupTasks.delete(taskId);
  }

  /**
   * Untrack a resource
   */
  untrackResource(resourceId: string): void {
    this.resourceTrackers.delete(resourceId);
  }

  /**
   * Execute all cleanup tasks
   */
  async executeCleanup(): Promise<void> {
    if (this.isCleaningUp) {
      return;
    }

    this.isCleaningUp = true;

    try {
      // Sort cleanup tasks by priority
      const sortedTasks = Array.from(this.cleanupTasks.values())
        .sort((a, b) => a.priority - b.priority);

      // Execute cleanup tasks
      for (const task of sortedTasks) {
        try {
          await task.cleanup();
        } catch (error) {
          console.error(`Cleanup task '${task.id}' failed:`, error);
        }
      }

      // Clean up tracked resources
      const sortedResources = Array.from(this.resourceTrackers.values())
        .sort((a, b) => this.getResourcePriority(a.type) - this.getResourcePriority(b.type));

      for (const tracker of sortedResources) {
        try {
          await tracker.cleanup();
        } catch (error) {
          console.error(`Resource cleanup '${tracker.id}' failed:`, error);
        }
      }

      // Clear all tasks and trackers
      this.cleanupTasks.clear();
      this.resourceTrackers.clear();
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Get resource cleanup priority (lower numbers run first)
   */
  private getResourcePriority(type: ResourceTracker['type']): number {
    switch (type) {
      case 'timer': return 1;
      case 'subscription': return 2;
      case 'mock': return 3;
      case 'file': return 4;
      case 'directory': return 5;
      case 'custom': return 6;
      default: return 10;
    }
  }

  /**
   * Get current cleanup status
   */
  getStatus(): {
    isCleaningUp: boolean;
    taskCount: number;
    resourceCount: number;
    tasks: string[];
    resources: string[];
  } {
    return {
      isCleaningUp: this.isCleaningUp,
      taskCount: this.cleanupTasks.size,
      resourceCount: this.resourceTrackers.size,
      tasks: Array.from(this.cleanupTasks.keys()),
      resources: Array.from(this.resourceTrackers.keys())
    };
  }

  /**
   * Reset the cleanup manager (for testing)
   */
  reset(): void {
    this.cleanupTasks.clear();
    this.resourceTrackers.clear();
    this.isCleaningUp = false;
  }
}

/**
 * Singleton instance for easy access
 */
export const cleanupManager = CleanupManager.getInstance();

/**
 * Test cleanup utilities
 */
export class TestCleanup {
  private static timers: Set<NodeJS.Timeout> = new Set();
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static subscriptions: Set<{ dispose: () => void }> = new Set();
  private static mockFunctions: Set<any> = new Set();

  /**
   * Track a timer for cleanup
   */
  static trackTimer(timer: NodeJS.Timeout): NodeJS.Timeout {
    this.timers.add(timer);
    
    cleanupManager.trackResource({
      type: 'timer',
      id: `timer-${timer}`,
      resource: timer,
      cleanup: () => {
        clearTimeout(timer);
        this.timers.delete(timer);
      }
    });

    return timer;
  }

  /**
   * Track an interval for cleanup
   */
  static trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.intervals.add(interval);
    
    cleanupManager.trackResource({
      type: 'timer',
      id: `interval-${interval}`,
      resource: interval,
      cleanup: () => {
        clearInterval(interval);
        this.intervals.delete(interval);
      }
    });

    return interval;
  }

  /**
   * Track a subscription for cleanup
   */
  static trackSubscription(subscription: { dispose: () => void }): { dispose: () => void } {
    this.subscriptions.add(subscription);
    
    cleanupManager.trackResource({
      type: 'subscription',
      id: `subscription-${Date.now()}-${Math.random()}`,
      resource: subscription,
      cleanup: () => {
        subscription.dispose();
        this.subscriptions.delete(subscription);
      }
    });

    return subscription;
  }

  /**
   * Track a mock function for cleanup
   */
  static trackMock(mockFn: any): any {
    this.mockFunctions.add(mockFn);
    
    cleanupManager.trackResource({
      type: 'mock',
      id: `mock-${Date.now()}-${Math.random()}`,
      resource: mockFn,
      cleanup: () => {
        if (mockFn && typeof mockFn.mockRestore === 'function') {
          mockFn.mockRestore();
        }
        this.mockFunctions.delete(mockFn);
      }
    });

    return mockFn;
  }

  /**
   * Create a tracked timeout
   */
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(callback, delay);
    return this.trackTimer(timer);
  }

  /**
   * Create a tracked interval
   */
  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    return this.trackInterval(interval);
  }

  /**
   * Clear all tracked timers
   */
  static clearAllTimers(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Dispose all tracked subscriptions
   */
  static disposeAllSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.dispose();
      } catch (error) {
        console.warn('Failed to dispose subscription:', error);
      }
    }
    this.subscriptions.clear();
  }

  /**
   * Restore all tracked mocks
   */
  static restoreAllMocks(): void {
    for (const mockFn of this.mockFunctions) {
      try {
        if (mockFn && typeof mockFn.mockRestore === 'function') {
          mockFn.mockRestore();
        }
      } catch (error) {
        console.warn('Failed to restore mock:', error);
      }
    }
    this.mockFunctions.clear();
  }

  /**
   * Clean up all tracked resources
   */
  static cleanupAll(): void {
    this.clearAllTimers();
    this.disposeAllSubscriptions();
    this.restoreAllMocks();
  }
}

/**
 * VS Code specific cleanup utilities
 */
export class VSCodeCleanup {
  /**
   * Clean up VS Code mocks
   */
  static cleanupVSCodeMocks(): void {
    const vscode = require('vscode');
    
    // Reset workspace state
    if (vscode.workspace) {
      vscode.workspace.workspaceFolders = undefined;
      
      if (vscode.workspace.getConfiguration) {
        vscode.workspace.getConfiguration.mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
          update: vi.fn().mockResolvedValue(undefined),
          has: vi.fn().mockReturnValue(false),
          inspect: vi.fn().mockReturnValue({})
        });
      }
    }

    // Clear all mock call history
    vi.clearAllMocks();
  }

  /**
   * Clean up extension context
   */
  static cleanupExtensionContext(context: any): void {
    if (context && context.subscriptions) {
      // Dispose all subscriptions
      for (const subscription of context.subscriptions) {
        try {
          if (subscription && typeof subscription.dispose === 'function') {
            subscription.dispose();
          }
        } catch (error) {
          console.warn('Failed to dispose subscription:', error);
        }
      }
      
      // Clear subscriptions array
      context.subscriptions.length = 0;
    }
  }

  /**
   * Reset VS Code window mocks
   */
  static resetWindowMocks(): void {
    const vscode = require('vscode');
    
    if (vscode.window) {
      // Reset message mocks
      if (vscode.window.showInformationMessage) {
        vscode.window.showInformationMessage.mockReset();
      }
      if (vscode.window.showErrorMessage) {
        vscode.window.showErrorMessage.mockReset();
      }
      if (vscode.window.showWarningMessage) {
        vscode.window.showWarningMessage.mockReset();
      }
      if (vscode.window.showOpenDialog) {
        vscode.window.showOpenDialog.mockReset();
      }
      if (vscode.window.registerTreeDataProvider) {
        vscode.window.registerTreeDataProvider.mockReset();
      }
    }
  }

  /**
   * Reset VS Code commands mocks
   */
  static resetCommandsMocks(): void {
    const vscode = require('vscode');
    
    if (vscode.commands && vscode.commands.registerCommand) {
      vscode.commands.registerCommand.mockReset();
    }
  }
}

/**
 * File system cleanup utilities
 */
export class FileSystemCleanup {
  /**
   * Clean up mock file system
   */
  static cleanupMockFileSystem(): void {
    fileSystemMockUtils.reset();
  }

  /**
   * Clean up mock path utilities
   */
  static cleanupMockPath(): void {
    pathMockUtils.reset();
  }

  /**
   * Clean up all file system mocks
   */
  static cleanupAll(): void {
    this.cleanupMockFileSystem();
    this.cleanupMockPath();
  }
}

/**
 * Memory cleanup utilities
 */
export class MemoryCleanup {
  private static references: WeakSet<object> = new WeakSet();

  /**
   * Track an object for memory leak detection
   */
  static trackObject(obj: object): void {
    this.references.add(obj);
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get memory usage information
   */
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(label: string = 'Memory Usage'): void {
    const usage = this.getMemoryUsage();
    console.log(`${label}:`, {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    });
  }
}

/**
 * Comprehensive cleanup function for all test resources
 */
export async function cleanupAllTestResources(): Promise<void> {
  // Execute cleanup manager tasks
  await cleanupManager.executeCleanup();
  
  // Clean up test-specific resources
  TestCleanup.cleanupAll();
  
  // Clean up VS Code mocks
  VSCodeCleanup.cleanupVSCodeMocks();
  VSCodeCleanup.resetWindowMocks();
  VSCodeCleanup.resetCommandsMocks();
  
  // Clean up file system mocks
  FileSystemCleanup.cleanupAll();
  
  // Force garbage collection if available
  MemoryCleanup.forceGC();
}

/**
 * Setup automatic cleanup for tests
 */
export function setupAutomaticCleanup(): void {
  beforeEach(() => {
    // Reset cleanup manager before each test
    cleanupManager.reset();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupAllTestResources();
  });
}

/**
 * Cleanup utilities for specific test scenarios
 */
export const scenarioCleanup = {
  /**
   * Clean up after extension activation tests
   */
  extensionActivation: (context?: any) => {
    if (context) {
      VSCodeCleanup.cleanupExtensionContext(context);
    }
    VSCodeCleanup.resetCommandsMocks();
    VSCodeCleanup.resetWindowMocks();
  },

  /**
   * Clean up after tree data provider tests
   */
  treeDataProvider: () => {
    VSCodeCleanup.resetWindowMocks();
    FileSystemCleanup.cleanupMockFileSystem();
  },

  /**
   * Clean up after configuration tests
   */
  configuration: () => {
    VSCodeCleanup.cleanupVSCodeMocks();
  },

  /**
   * Clean up after file system operation tests
   */
  fileSystemOperations: () => {
    FileSystemCleanup.cleanupAll();
  },

  /**
   * Clean up after command execution tests
   */
  commandExecution: () => {
    VSCodeCleanup.resetCommandsMocks();
    VSCodeCleanup.resetWindowMocks();
  }
};

/**
 * Utility for creating cleanup-aware test functions
 */
export function withCleanup<T extends (...args: any[]) => any>(
  testFn: T,
  cleanupFn?: () => void | Promise<void>
): T {
  return ((...args: any[]) => {
    const result = testFn(...args);
    
    if (cleanupFn) {
      cleanupManager.registerCleanupTask({
        id: `test-cleanup-${Date.now()}-${Math.random()}`,
        description: 'Custom test cleanup',
        cleanup: cleanupFn,
        priority: 100
      });
    }
    
    return result;
  }) as T;
}

/**
 * Decorator for automatic cleanup registration
 */
export function autoCleanup(cleanupFn: () => void | Promise<void>) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    
    if (originalMethod) {
      descriptor.value = withCleanup(originalMethod, cleanupFn) as T;
    }
    
    return descriptor;
  };
}
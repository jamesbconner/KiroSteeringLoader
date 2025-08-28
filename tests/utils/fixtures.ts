/**
 * Test data factories for generating TemplateItem and configuration fixtures
 * Provides type-safe factory functions for creating consistent test data
 */

import { vi } from 'vitest';
import * as vscode from 'vscode';
import { createTemplateItem, createMockWorkspaceConfiguration } from '../mocks/vscodeFactories';
import { TreeItemCollapsibleState } from '../mocks/vscode';

/**
 * Interface for template fixture configuration
 */
export interface TemplateFixture {
  name: string;
  content: string;
  path: string;
  itemType: 'template' | 'info' | 'error' | 'setup';
  expectedTreeItem: {
    label: string;
    collapsibleState: vscode.TreeItemCollapsibleState;
    tooltip?: string;
    command?: vscode.Command;
    iconPath?: vscode.ThemeIcon;
  };
}

/**
 * Interface for workspace fixture configuration
 */
export interface WorkspaceFixture {
  name: string;
  path: string;
  hasKiroDirectory: boolean;
  hasSteeringDirectory: boolean;
  existingTemplates: string[];
  workspaceFolder: vscode.WorkspaceFolder;
}

/**
 * Interface for configuration fixture
 */
export interface ConfigurationFixture {
  templatesPath?: string;
  otherSettings?: Record<string, any>;
  expectedBehavior: 'success' | 'error' | 'setup' | 'info';
  expectedItems: TemplateFixture[];
  mockConfiguration: vscode.WorkspaceConfiguration;
}

/**
 * Interface for extension context fixture
 */
export interface ExtensionContextFixture {
  extensionPath: string;
  storagePath: string;
  globalStoragePath: string;
  subscriptions: vscode.Disposable[];
  workspaceState: Record<string, any>;
  globalState: Record<string, any>;
}

/**
 * Factory class for creating test fixtures
 */
export class FixtureFactory {
  private static instance: FixtureFactory;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FixtureFactory {
    if (!FixtureFactory.instance) {
      FixtureFactory.instance = new FixtureFactory();
    }
    return FixtureFactory.instance;
  }

  /**
   * Create a template fixture with specified properties
   */
  createTemplateFixture(overrides: Partial<TemplateFixture> = {}): TemplateFixture {
    const defaults: TemplateFixture = {
      name: 'test-template',
      content: '# Test Template\nThis is a test template content.',
      path: '/test/templates/test-template.md',
      itemType: 'template',
      expectedTreeItem: {
        label: 'test-template',
        collapsibleState: TreeItemCollapsibleState.None,
        tooltip: 'Load template: test-template',
        command: {
          command: 'kiroSteeringLoader.loadTemplate',
          title: 'Load Template',
          arguments: ['/test/templates/test-template.md']
        },
        iconPath: { id: 'file-text' } as vscode.ThemeIcon
      }
    };

    const fixture = { ...defaults, ...overrides };

    // Update expected tree item based on item type
    if (fixture.itemType === 'setup') {
      fixture.expectedTreeItem = {
        label: fixture.name,
        collapsibleState: TreeItemCollapsibleState.None,
        tooltip: 'Click to configure templates directory',
        command: {
          command: 'kiroSteeringLoader.setTemplatesPath',
          title: 'Set Templates Path'
        },
        iconPath: { id: 'folder-opened' } as vscode.ThemeIcon
      };
    } else if (fixture.itemType === 'info') {
      fixture.expectedTreeItem = {
        label: fixture.name,
        collapsibleState: TreeItemCollapsibleState.None,
        iconPath: { id: 'info' } as vscode.ThemeIcon
      };
    } else if (fixture.itemType === 'error') {
      fixture.expectedTreeItem = {
        label: fixture.name,
        collapsibleState: TreeItemCollapsibleState.None,
        iconPath: { id: 'error' } as vscode.ThemeIcon
      };
    }

    return fixture;
  }

  /**
   * Create multiple template fixtures
   */
  createTemplateFixtures(count: number, baseOverrides: Partial<TemplateFixture> = {}): TemplateFixture[] {
    return Array.from({ length: count }, (_, index) => {
      const name = `template-${index + 1}`;
      const path = `/test/templates/${name}.md`;
      
      return this.createTemplateFixture({
        name,
        path,
        content: `# Template ${index + 1}\nContent for template ${index + 1}`,
        expectedTreeItem: {
          label: name,
          collapsibleState: TreeItemCollapsibleState.None,
          tooltip: `Load template: ${name}`,
          command: {
            command: 'kiroSteeringLoader.loadTemplate',
            title: 'Load Template',
            arguments: [path]
          },
          iconPath: { id: 'file-text' } as vscode.ThemeIcon
        },
        ...baseOverrides
      });
    });
  }

  /**
   * Create workspace fixture with specified properties
   */
  createWorkspaceFixture(overrides: Partial<WorkspaceFixture> = {}): WorkspaceFixture {
    const defaults = {
      name: 'test-workspace',
      path: '/test/workspace',
      hasKiroDirectory: true,
      hasSteeringDirectory: true,
      existingTemplates: ['existing-template.md']
    };

    const config = { ...defaults, ...overrides };
    
    return {
      ...config,
      workspaceFolder: {
        uri: {
          fsPath: config.path,
          scheme: 'file',
          authority: '',
          path: config.path,
          query: '',
          fragment: ''
        } as vscode.Uri,
        name: config.name,
        index: 0
      }
    };
  }

  /**
   * Create configuration fixture with specified properties
   */
  createConfigurationFixture(overrides: Partial<ConfigurationFixture> = {}): ConfigurationFixture {
    const defaults: Partial<ConfigurationFixture> = {
      templatesPath: '/test/templates',
      otherSettings: {},
      expectedBehavior: 'success',
      expectedItems: []
    };

    const config = { ...defaults, ...overrides };
    
    // Create mock configuration
    const configValues = {
      templatesPath: config.templatesPath,
      ...config.otherSettings
    };

    const mockConfiguration = createMockWorkspaceConfiguration(configValues);

    // Generate expected items based on behavior if not provided
    if (!config.expectedItems || config.expectedItems.length === 0) {
      config.expectedItems = this.generateExpectedItemsForBehavior(
        config.expectedBehavior!,
        config.templatesPath
      );
    }

    return {
      ...config,
      mockConfiguration
    } as ConfigurationFixture;
  }

  /**
   * Create extension context fixture with specified properties
   */
  createExtensionContextFixture(overrides: Partial<ExtensionContextFixture> = {}): ExtensionContextFixture {
    const defaults: ExtensionContextFixture = {
      extensionPath: '/test/extension',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      subscriptions: [],
      workspaceState: {},
      globalState: {}
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate expected items based on behavior type
   */
  private generateExpectedItemsForBehavior(
    behavior: 'success' | 'error' | 'setup' | 'info',
    templatesPath?: string
  ): TemplateFixture[] {
    switch (behavior) {
      case 'setup':
        return [
          this.createTemplateFixture({
            name: 'Click to set templates path',
            itemType: 'setup',
            path: '',
            content: ''
          })
        ];

      case 'error':
        return [
          this.createTemplateFixture({
            name: 'Templates path not found',
            itemType: 'error',
            path: '',
            content: ''
          }),
          this.createTemplateFixture({
            name: 'Click to set new path',
            itemType: 'setup',
            path: '',
            content: ''
          })
        ];

      case 'info':
        return [
          this.createTemplateFixture({
            name: 'No .md template files found',
            itemType: 'info',
            path: '',
            content: ''
          }),
          this.createTemplateFixture({
            name: `Path: ${templatesPath || '/test/templates'}`,
            itemType: 'info',
            path: '',
            content: ''
          })
        ];

      case 'success':
      default:
        return this.createTemplateFixtures(2);
    }
  }
}

/**
 * Singleton instance for easy access
 */
export const fixtureFactory = FixtureFactory.getInstance();

/**
 * Pre-defined fixture collections for common scenarios
 */
export const commonFixtures = {
  /**
   * Template fixtures for various scenarios
   */
  templates: {
    /**
     * Single template fixture
     */
    single: (): TemplateFixture => fixtureFactory.createTemplateFixture(),

    /**
     * Multiple template fixtures
     */
    multiple: (count: number = 3): TemplateFixture[] => fixtureFactory.createTemplateFixtures(count),

    /**
     * Setup item fixture (when no templates path is configured)
     */
    setup: (): TemplateFixture => fixtureFactory.createTemplateFixture({
      name: 'Click to set templates path',
      itemType: 'setup',
      path: '',
      content: ''
    }),

    /**
     * Error item fixture (when templates path doesn't exist)
     */
    error: (): TemplateFixture => fixtureFactory.createTemplateFixture({
      name: 'Templates path not found',
      itemType: 'error',
      path: '',
      content: ''
    }),

    /**
     * Info item fixture (when templates directory is empty)
     */
    info: (): TemplateFixture => fixtureFactory.createTemplateFixture({
      name: 'No .md template files found',
      itemType: 'info',
      path: '',
      content: ''
    }),

    /**
     * Mixed template types fixture
     */
    mixed: (): TemplateFixture[] => [
      fixtureFactory.createTemplateFixture({
        name: 'valid-template',
        itemType: 'template'
      }),
      fixtureFactory.createTemplateFixture({
        name: 'Info message',
        itemType: 'info',
        path: '',
        content: ''
      }),
      fixtureFactory.createTemplateFixture({
        name: 'Setup action',
        itemType: 'setup',
        path: '',
        content: ''
      })
    ]
  },

  /**
   * Workspace fixtures for various scenarios
   */
  workspaces: {
    /**
     * Standard workspace with .kiro/steering directory
     */
    withSteering: (): WorkspaceFixture => fixtureFactory.createWorkspaceFixture({
      hasKiroDirectory: true,
      hasSteeringDirectory: true,
      existingTemplates: ['existing-template.md']
    }),

    /**
     * Workspace without .kiro directory
     */
    withoutKiro: (): WorkspaceFixture => fixtureFactory.createWorkspaceFixture({
      hasKiroDirectory: false,
      hasSteeringDirectory: false,
      existingTemplates: []
    }),

    /**
     * Workspace with .kiro but no steering directory
     */
    withKiroNoSteering: (): WorkspaceFixture => fixtureFactory.createWorkspaceFixture({
      hasKiroDirectory: true,
      hasSteeringDirectory: false,
      existingTemplates: []
    }),

    /**
     * Empty workspace
     */
    empty: (): WorkspaceFixture => fixtureFactory.createWorkspaceFixture({
      name: 'empty-workspace',
      path: '/test/empty-workspace',
      hasKiroDirectory: false,
      hasSteeringDirectory: false,
      existingTemplates: []
    })
  },

  /**
   * Configuration fixtures for various scenarios
   */
  configurations: {
    /**
     * Valid configuration with templates path
     */
    valid: (templatesPath: string = '/test/templates'): ConfigurationFixture => 
      fixtureFactory.createConfigurationFixture({
        templatesPath,
        expectedBehavior: 'success'
      }),

    /**
     * Empty configuration (no templates path set)
     */
    empty: (): ConfigurationFixture => fixtureFactory.createConfigurationFixture({
      templatesPath: undefined,
      expectedBehavior: 'setup'
    }),

    /**
     * Configuration with non-existent templates path
     */
    nonExistent: (templatesPath: string = '/test/nonexistent'): ConfigurationFixture => 
      fixtureFactory.createConfigurationFixture({
        templatesPath,
        expectedBehavior: 'error'
      }),

    /**
     * Configuration with empty templates directory
     */
    emptyDirectory: (templatesPath: string = '/test/empty'): ConfigurationFixture => 
      fixtureFactory.createConfigurationFixture({
        templatesPath,
        expectedBehavior: 'info'
      }),

    /**
     * Configuration with additional settings
     */
    withSettings: (settings: Record<string, any>): ConfigurationFixture => 
      fixtureFactory.createConfigurationFixture({
        templatesPath: '/test/templates',
        otherSettings: settings,
        expectedBehavior: 'success'
      })
  },

  /**
   * Extension context fixtures
   */
  contexts: {
    /**
     * Standard extension context
     */
    standard: (): ExtensionContextFixture => fixtureFactory.createExtensionContextFixture(),

    /**
     * Extension context with custom paths
     */
    customPaths: (paths: { extension?: string; storage?: string; globalStorage?: string }): ExtensionContextFixture => 
      fixtureFactory.createExtensionContextFixture({
        extensionPath: paths.extension || '/custom/extension',
        storagePath: paths.storage || '/custom/storage',
        globalStoragePath: paths.globalStorage || '/custom/global-storage'
      }),

    /**
     * Extension context with pre-existing state
     */
    withState: (workspaceState: Record<string, any>, globalState: Record<string, any>): ExtensionContextFixture => 
      fixtureFactory.createExtensionContextFixture({
        workspaceState,
        globalState
      })
  }
};

/**
 * Utility functions for working with fixtures
 */
export const fixtureUtils = {
  /**
   * Convert template fixture to actual TemplateItem mock
   */
  toTemplateItem: (fixture: TemplateFixture) => {
    return createTemplateItem(fixture.name, fixture.path, fixture.itemType);
  },

  /**
   * Convert multiple template fixtures to TemplateItem mocks
   */
  toTemplateItems: (fixtures: TemplateFixture[]) => {
    return fixtures.map(fixture => fixtureUtils.toTemplateItem(fixture));
  },

  /**
   * Create a fixture with random data for property-based testing
   */
  random: {
    template: (): TemplateFixture => {
      const id = Math.random().toString(36).substring(2, 8);
      return fixtureFactory.createTemplateFixture({
        name: `random-template-${id}`,
        path: `/test/templates/random-template-${id}.md`,
        content: `# Random Template ${id}\nRandom content for testing.`
      });
    },

    workspace: (): WorkspaceFixture => {
      const id = Math.random().toString(36).substring(2, 8);
      return fixtureFactory.createWorkspaceFixture({
        name: `random-workspace-${id}`,
        path: `/test/random-workspace-${id}`,
        hasKiroDirectory: Math.random() > 0.5,
        hasSteeringDirectory: Math.random() > 0.5,
        existingTemplates: Math.random() > 0.5 ? [`template-${id}.md`] : []
      });
    },

    configuration: (): ConfigurationFixture => {
      const id = Math.random().toString(36).substring(2, 8);
      const behaviors: Array<'success' | 'error' | 'setup' | 'info'> = ['success', 'error', 'setup', 'info'];
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      
      return fixtureFactory.createConfigurationFixture({
        templatesPath: behavior === 'setup' ? undefined : `/test/random-templates-${id}`,
        expectedBehavior: behavior
      });
    }
  },

  /**
   * Validate that a fixture matches expected structure
   */
  validate: {
    template: (fixture: TemplateFixture): boolean => {
      return !!(
        fixture.name &&
        typeof fixture.content === 'string' &&
        typeof fixture.path === 'string' &&
        ['template', 'info', 'error', 'setup'].includes(fixture.itemType) &&
        fixture.expectedTreeItem &&
        fixture.expectedTreeItem.label &&
        typeof fixture.expectedTreeItem.collapsibleState === 'number'
      );
    },

    workspace: (fixture: WorkspaceFixture): boolean => {
      return !!(
        fixture.name &&
        fixture.path &&
        typeof fixture.hasKiroDirectory === 'boolean' &&
        typeof fixture.hasSteeringDirectory === 'boolean' &&
        Array.isArray(fixture.existingTemplates) &&
        fixture.workspaceFolder &&
        fixture.workspaceFolder.uri &&
        fixture.workspaceFolder.name
      );
    },

    configuration: (fixture: ConfigurationFixture): boolean => {
      return !!(
        ['success', 'error', 'setup', 'info'].includes(fixture.expectedBehavior) &&
        Array.isArray(fixture.expectedItems) &&
        fixture.mockConfiguration
      );
    }
  }
};
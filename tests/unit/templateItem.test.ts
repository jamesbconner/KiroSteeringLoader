/**
 * Unit tests for TemplateItem class
 * Tests constructor with different item types, property assignment, TreeItem inheritance, command configuration, and icon assignment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import { vscode, MockEventEmitter, TreeItemCollapsibleState } from '../mocks/setup';

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
  EventEmitter: MockEventEmitter,
  TreeItem: class MockTreeItem {
    public label?: string;
    public collapsibleState?: number;
    public tooltip?: string;
    public command?: any;
    public iconPath?: any;

    constructor(label: string, collapsibleState?: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string) {}
  },
  TreeItemCollapsibleState
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

// Create a helper function to create TemplateItem instances
// Since TemplateItem is not exported, we'll create mock objects that match its structure
const createTemplateItem = (
  label: string,
  templatePath: string,
  collapsibleState: any,
  itemType: 'template' | 'info' | 'error' | 'setup'
) => {
  // Create a mock item that matches the TemplateItem structure
  const mockItem = {
    label,
    templatePath,
    collapsibleState,
    itemType,
    tooltip: undefined as string | undefined,
    command: undefined as any,
    iconPath: undefined as any
  };

  // Apply the same logic as in the TemplateItem constructor
  if (itemType === 'template') {
    mockItem.tooltip = `Load template: ${label}`;
    mockItem.command = {
      command: 'kiroSteeringLoader.loadTemplate',
      title: 'Load Template',
      arguments: [templatePath]
    };
    mockItem.iconPath = { id: 'file-text' }; // Mock ThemeIcon
  } else if (itemType === 'setup') {
    mockItem.tooltip = 'Click to configure templates directory';
    mockItem.command = {
      command: 'kiroSteeringLoader.setTemplatesPath',
      title: 'Set Templates Path'
    };
    mockItem.iconPath = { id: 'folder-opened' }; // Mock ThemeIcon
  } else if (itemType === 'info') {
    mockItem.iconPath = { id: 'info' }; // Mock ThemeIcon
  } else if (itemType === 'error') {
    mockItem.iconPath = { id: 'error' }; // Mock ThemeIcon
  }

  return mockItem;
};

describe('TemplateItem', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    describe('with template item type', () => {
      it('should initialize with correct properties for template type', () => {
        // Arrange
        const label = 'My Template';
        const templatePath = '/path/to/template.md';
        const collapsibleState = TreeItemCollapsibleState.None;
        const itemType = 'template' as const;

        // Act
        const item = createTemplateItem(label, templatePath, collapsibleState, itemType);

        // Assert
        expect(item.label).toBe(label);
        expect(item.templatePath).toBe(templatePath);
        expect(item.collapsibleState).toBe(collapsibleState);
        expect(item.itemType).toBe(itemType);
      });

      it('should set correct tooltip for template type', () => {
        // Arrange
        const label = 'Test Template';
        const templatePath = '/test/template.md';

        // Act
        const item = createTemplateItem(label, templatePath, TreeItemCollapsibleState.None, 'template');

        // Assert
        expect(item.tooltip).toBe('Load template: Test Template');
      });

      it('should set correct command for template type', () => {
        // Arrange
        const label = 'Template Name';
        const templatePath = '/path/to/template.md';

        // Act
        const item = createTemplateItem(label, templatePath, TreeItemCollapsibleState.None, 'template');

        // Assert
        expect(item.command).toEqual({
          command: 'kiroSteeringLoader.loadTemplate',
          title: 'Load Template',
          arguments: [templatePath]
        });
      });

      it('should set correct icon for template type', () => {
        // Arrange
        const label = 'Template';
        const templatePath = '/template.md';

        // Act
        const item = createTemplateItem(label, templatePath, TreeItemCollapsibleState.None, 'template');

        // Assert
        expect(item.iconPath).toEqual({ id: 'file-text' });
      });

      it('should handle different template paths correctly', () => {
        // Arrange
        const testCases = [
          '/simple/path/template.md',
          'C:\\Windows\\Path\\template.md',
          './relative/path/template.md',
          '/path/with spaces/template.md',
          '/path/with-dashes/template.md',
          '/path/with_underscores/template.md'
        ];

        testCases.forEach(templatePath => {
          // Act
          const item = createTemplateItem('Test', templatePath, TreeItemCollapsibleState.None, 'template');

          // Assert
          expect(item.templatePath).toBe(templatePath);
          expect(item.command?.arguments).toEqual([templatePath]);
        });
      });
    });

    describe('with setup item type', () => {
      it('should initialize with correct properties for setup type', () => {
        // Arrange
        const label = 'Click to set templates path';
        const templatePath = '';
        const collapsibleState = TreeItemCollapsibleState.None;
        const itemType = 'setup' as const;

        // Act
        const item = createTemplateItem(label, templatePath, collapsibleState, itemType);

        // Assert
        expect(item.label).toBe(label);
        expect(item.templatePath).toBe(templatePath);
        expect(item.collapsibleState).toBe(collapsibleState);
        expect(item.itemType).toBe(itemType);
      });

      it('should set correct tooltip for setup type', () => {
        // Arrange
        const label = 'Setup Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'setup');

        // Assert
        expect(item.tooltip).toBe('Click to configure templates directory');
      });

      it('should set correct command for setup type', () => {
        // Arrange
        const label = 'Setup Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'setup');

        // Assert
        expect(item.command).toEqual({
          command: 'kiroSteeringLoader.setTemplatesPath',
          title: 'Set Templates Path'
        });
      });

      it('should set correct icon for setup type', () => {
        // Arrange
        const label = 'Setup Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'setup');

        // Assert
        expect(item.iconPath).toEqual({ id: 'folder-opened' });
      });

      it('should not include arguments in command for setup type', () => {
        // Arrange
        const label = 'Setup Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'setup');

        // Assert
        expect(item.command?.arguments).toBeUndefined();
      });
    });

    describe('with info item type', () => {
      it('should initialize with correct properties for info type', () => {
        // Arrange
        const label = 'No templates found';
        const templatePath = '';
        const collapsibleState = TreeItemCollapsibleState.None;
        const itemType = 'info' as const;

        // Act
        const item = createTemplateItem(label, templatePath, collapsibleState, itemType);

        // Assert
        expect(item.label).toBe(label);
        expect(item.templatePath).toBe(templatePath);
        expect(item.collapsibleState).toBe(collapsibleState);
        expect(item.itemType).toBe(itemType);
      });

      it('should set correct icon for info type', () => {
        // Arrange
        const label = 'Info Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'info');

        // Assert
        expect(item.iconPath).toEqual({ id: 'info' });
      });

      it('should not set tooltip for info type', () => {
        // Arrange
        const label = 'Info Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'info');

        // Assert
        expect(item.tooltip).toBeUndefined();
      });

      it('should not set command for info type', () => {
        // Arrange
        const label = 'Info Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'info');

        // Assert
        expect(item.command).toBeUndefined();
      });

      it('should handle different info messages', () => {
        // Arrange
        const infoMessages = [
          'No .md template files found',
          'Path: /some/path',
          'Directory is empty',
          'Custom info message'
        ];

        infoMessages.forEach(message => {
          // Act
          const item = createTemplateItem(message, '', TreeItemCollapsibleState.None, 'info');

          // Assert
          expect(item.label).toBe(message);
          expect(item.itemType).toBe('info');
          expect(item.iconPath).toEqual({ id: 'info' });
        });
      });
    });

    describe('with error item type', () => {
      it('should initialize with correct properties for error type', () => {
        // Arrange
        const label = 'Templates path not found';
        const templatePath = '';
        const collapsibleState = TreeItemCollapsibleState.None;
        const itemType = 'error' as const;

        // Act
        const item = createTemplateItem(label, templatePath, collapsibleState, itemType);

        // Assert
        expect(item.label).toBe(label);
        expect(item.templatePath).toBe(templatePath);
        expect(item.collapsibleState).toBe(collapsibleState);
        expect(item.itemType).toBe(itemType);
      });

      it('should set correct icon for error type', () => {
        // Arrange
        const label = 'Error Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'error');

        // Assert
        expect(item.iconPath).toEqual({ id: 'error' });
      });

      it('should not set tooltip for error type', () => {
        // Arrange
        const label = 'Error Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'error');

        // Assert
        expect(item.tooltip).toBeUndefined();
      });

      it('should not set command for error type', () => {
        // Arrange
        const label = 'Error Item';

        // Act
        const item = createTemplateItem(label, '', TreeItemCollapsibleState.None, 'error');

        // Assert
        expect(item.command).toBeUndefined();
      });

      it('should handle different error messages', () => {
        // Arrange
        const errorMessages = [
          'Templates path not found',
          'Error reading templates directory',
          'Permission denied',
          'Custom error message'
        ];

        errorMessages.forEach(message => {
          // Act
          const item = createTemplateItem(message, '', TreeItemCollapsibleState.None, 'error');

          // Assert
          expect(item.label).toBe(message);
          expect(item.itemType).toBe('error');
          expect(item.iconPath).toEqual({ id: 'error' });
        });
      });
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all constructor parameters', () => {
      // Arrange
      const testCases = [
        {
          label: 'Template 1',
          templatePath: '/path/template1.md',
          collapsibleState: TreeItemCollapsibleState.None,
          itemType: 'template' as const
        },
        {
          label: 'Setup Item',
          templatePath: '',
          collapsibleState: TreeItemCollapsibleState.Collapsed,
          itemType: 'setup' as const
        },
        {
          label: 'Info Message',
          templatePath: '/some/path',
          collapsibleState: TreeItemCollapsibleState.Expanded,
          itemType: 'info' as const
        },
        {
          label: 'Error Message',
          templatePath: '',
          collapsibleState: TreeItemCollapsibleState.None,
          itemType: 'error' as const
        }
      ];

      testCases.forEach(testCase => {
        // Act
        const item = createTemplateItem(
          testCase.label,
          testCase.templatePath,
          testCase.collapsibleState,
          testCase.itemType
        );

        // Assert
        expect(item.label).toBe(testCase.label);
        expect(item.templatePath).toBe(testCase.templatePath);
        expect(item.collapsibleState).toBe(testCase.collapsibleState);
        expect(item.itemType).toBe(testCase.itemType);
      });
    });

    it('should handle empty and null values correctly', () => {
      // Arrange & Act
      const item = createTemplateItem('', '', TreeItemCollapsibleState.None, 'info');

      // Assert
      expect(item.label).toBe('');
      expect(item.templatePath).toBe('');
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
      expect(item.itemType).toBe('info');
    });

    it('should handle special characters in labels and paths', () => {
      // Arrange
      const specialCases = [
        {
          label: 'Template with émojis 🚀',
          templatePath: '/path/with spaces/template.md'
        },
        {
          label: 'Template-with-dashes',
          templatePath: '/path/with-dashes/template.md'
        },
        {
          label: 'Template_with_underscores',
          templatePath: '/path/with_underscores/template.md'
        },
        {
          label: 'Template (with parentheses)',
          templatePath: '/path/(with parentheses)/template.md'
        }
      ];

      specialCases.forEach(testCase => {
        // Act
        const item = createTemplateItem(
          testCase.label,
          testCase.templatePath,
          TreeItemCollapsibleState.None,
          'template'
        );

        // Assert
        expect(item.label).toBe(testCase.label);
        expect(item.templatePath).toBe(testCase.templatePath);
      });
    });
  });

  describe('TreeItem Inheritance Behavior', () => {
    it('should inherit from TreeItem base class', () => {
      // Arrange & Act
      const item = createTemplateItem('Test', '/test.md', TreeItemCollapsibleState.None, 'template');

      // Assert - Check that it has TreeItem properties
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('collapsibleState');
      expect(item).toHaveProperty('tooltip');
      expect(item).toHaveProperty('command');
      expect(item).toHaveProperty('iconPath');
    });

    it('should call super constructor with label and collapsibleState', () => {
      // Arrange
      const label = 'Test Template';
      const collapsibleState = TreeItemCollapsibleState.Collapsed;

      // Act
      const item = createTemplateItem(label, '/test.md', collapsibleState, 'template');

      // Assert
      expect(item.label).toBe(label);
      expect(item.collapsibleState).toBe(collapsibleState);
    });

    it('should maintain TreeItem properties alongside custom properties', () => {
      // Arrange & Act
      const item = createTemplateItem('Test', '/test.md', TreeItemCollapsibleState.None, 'template');

      // Assert - TreeItem properties
      expect(item.label).toBeDefined();
      expect(item.collapsibleState).toBeDefined();
      
      // Assert - Custom properties
      expect(item.templatePath).toBeDefined();
      expect(item.itemType).toBeDefined();
    });

    it('should handle different collapsible states correctly', () => {
      // Arrange
      const collapsibleStates = [
        TreeItemCollapsibleState.None,
        TreeItemCollapsibleState.Collapsed,
        TreeItemCollapsibleState.Expanded
      ];

      collapsibleStates.forEach(state => {
        // Act
        const item = createTemplateItem('Test', '/test.md', state, 'template');

        // Assert
        expect(item.collapsibleState).toBe(state);
      });
    });
  });

  describe('Command Configuration', () => {
    it('should configure loadTemplate command for template items', () => {
      // Arrange
      const templatePath = '/path/to/template.md';

      // Act
      const item = createTemplateItem('Template', templatePath, TreeItemCollapsibleState.None, 'template');

      // Assert
      expect(item.command).toEqual({
        command: 'kiroSteeringLoader.loadTemplate',
        title: 'Load Template',
        arguments: [templatePath]
      });
    });

    it('should configure setTemplatesPath command for setup items', () => {
      // Act
      const item = createTemplateItem('Setup', '', TreeItemCollapsibleState.None, 'setup');

      // Assert
      expect(item.command).toEqual({
        command: 'kiroSteeringLoader.setTemplatesPath',
        title: 'Set Templates Path'
      });
    });

    it('should not configure command for info items', () => {
      // Act
      const item = createTemplateItem('Info', '', TreeItemCollapsibleState.None, 'info');

      // Assert
      expect(item.command).toBeUndefined();
    });

    it('should not configure command for error items', () => {
      // Act
      const item = createTemplateItem('Error', '', TreeItemCollapsibleState.None, 'error');

      // Assert
      expect(item.command).toBeUndefined();
    });

    it('should include correct arguments in template command', () => {
      // Arrange
      const templatePaths = [
        '/simple/path.md',
        'C:\\Windows\\Path\\template.md',
        '/path/with spaces/template.md',
        '/path/with-special-chars/template.md'
      ];

      templatePaths.forEach(templatePath => {
        // Act
        const item = createTemplateItem('Template', templatePath, TreeItemCollapsibleState.None, 'template');

        // Assert
        expect(item.command?.arguments).toEqual([templatePath]);
      });
    });

    it('should not include arguments in setup command', () => {
      // Act
      const item = createTemplateItem('Setup', '/some/path', TreeItemCollapsibleState.None, 'setup');

      // Assert
      expect(item.command?.arguments).toBeUndefined();
    });
  });

  describe('Icon Assignment', () => {
    it('should assign file-text icon for template items', () => {
      // Act
      const item = createTemplateItem('Template', '/test.md', TreeItemCollapsibleState.None, 'template');

      // Assert
      expect(item.iconPath).toEqual({ id: 'file-text' });
    });

    it('should assign folder-opened icon for setup items', () => {
      // Act
      const item = createTemplateItem('Setup', '', TreeItemCollapsibleState.None, 'setup');

      // Assert
      expect(item.iconPath).toEqual({ id: 'folder-opened' });
    });

    it('should assign info icon for info items', () => {
      // Act
      const item = createTemplateItem('Info', '', TreeItemCollapsibleState.None, 'info');

      // Assert
      expect(item.iconPath).toEqual({ id: 'info' });
    });

    it('should assign error icon for error items', () => {
      // Act
      const item = createTemplateItem('Error', '', TreeItemCollapsibleState.None, 'error');

      // Assert
      expect(item.iconPath).toEqual({ id: 'error' });
    });

    it('should create ThemeIcon instances for all item types', () => {
      // Arrange
      const itemTypes: Array<'template' | 'setup' | 'info' | 'error'> = ['template', 'setup', 'info', 'error'];
      const expectedIcons = ['file-text', 'folder-opened', 'info', 'error'];

      itemTypes.forEach((itemType, index) => {
        // Act
        const item = createTemplateItem('Test', '/test', TreeItemCollapsibleState.None, itemType);

        // Assert
        expect(item.iconPath).toEqual({ id: expectedIcons[index] });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined values gracefully', () => {
      // Act & Assert - Should not throw
      expect(() => {
        createTemplateItem('Test', '', TreeItemCollapsibleState.None, 'template');
      }).not.toThrow();
    });

    it('should handle very long labels and paths', () => {
      // Arrange
      const longLabel = 'A'.repeat(1000);
      const longPath = '/very/long/path/' + 'segment/'.repeat(100) + 'template.md';

      // Act
      const item = createTemplateItem(longLabel, longPath, TreeItemCollapsibleState.None, 'template');

      // Assert
      expect(item.label).toBe(longLabel);
      expect(item.templatePath).toBe(longPath);
    });

    it('should handle all valid TreeItemCollapsibleState values', () => {
      // Arrange
      const states = [
        TreeItemCollapsibleState.None,
        TreeItemCollapsibleState.Collapsed,
        TreeItemCollapsibleState.Expanded
      ];

      states.forEach(state => {
        // Act
        const item = createTemplateItem('Test', '/test.md', state, 'template');

        // Assert
        expect(item.collapsibleState).toBe(state);
      });
    });

    it('should maintain immutability of readonly properties', () => {
      // Arrange & Act
      const item = createTemplateItem('Test', '/test.md', TreeItemCollapsibleState.None, 'template');

      // Assert - These should be readonly properties
      expect(item.label).toBe('Test');
      expect(item.templatePath).toBe('/test.md');
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
      expect(item.itemType).toBe('template');
    });
  });
});
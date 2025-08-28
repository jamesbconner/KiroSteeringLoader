/**
 * Global setup for end-to-end tests using @vscode/test-electron
 * This file is executed before E2E tests run and provides VS Code instance management
 */

import { beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';

// Global VS Code instance management
let vscodeExecutablePath: string | undefined;
let testWorkspaceRoot: string;

// E2E test configuration
beforeAll(async () => {
  // Set E2E test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'e2e';
  process.env.VSCODE_TEST_MODE = 'true';
  
  // Configure paths for E2E testing
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  testWorkspaceRoot = path.resolve(__dirname, '../fixtures/workspaces');
  
  console.log('🚀 Initializing E2E test environment...');
  console.log(`Extension path: ${extensionDevelopmentPath}`);
  console.log(`Test workspace root: ${testWorkspaceRoot}`);
  
  try {
    // Download and setup VS Code for testing
    console.log('📥 Downloading VS Code for testing...');
    vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    console.log(`✅ VS Code downloaded to: ${vscodeExecutablePath}`);
    
    // Ensure test workspace directory exists
    if (!fs.existsSync(testWorkspaceRoot)) {
      fs.mkdirSync(testWorkspaceRoot, { recursive: true });
      console.log(`📁 Created test workspace directory: ${testWorkspaceRoot}`);
    }
    
    // Create default test workspace structure
    await createDefaultTestWorkspaces();
    
  } catch (error) {
    console.error('❌ Failed to initialize E2E test environment:', error);
    throw error;
  }
}, 60000); // 60 second timeout for VS Code download

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  try {
    // Clean up test workspaces
    await cleanupTestWorkspaces();
    
    // Note: We don't delete the VS Code installation as it can be reused
    console.log('✅ E2E test cleanup completed');
  } catch (error) {
    console.error('❌ Error during E2E test cleanup:', error);
  }
});

/**
 * Create default test workspace structures
 */
async function createDefaultTestWorkspaces(): Promise<void> {
  const workspaces = [
    'empty-workspace',
    'workspace-with-kiro',
    'workspace-with-templates'
  ];
  
  for (const workspace of workspaces) {
    const workspacePath = path.join(testWorkspaceRoot, workspace);
    
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
      
      // Create workspace-specific structure
      if (workspace === 'workspace-with-kiro') {
        const kiroPath = path.join(workspacePath, '.kiro');
        const steeringPath = path.join(kiroPath, 'steering');
        fs.mkdirSync(steeringPath, { recursive: true });
      }
      
      if (workspace === 'workspace-with-templates') {
        const kiroPath = path.join(workspacePath, '.kiro');
        const steeringPath = path.join(kiroPath, 'steering');
        fs.mkdirSync(steeringPath, { recursive: true });
        
        // Add sample template files
        fs.writeFileSync(
          path.join(steeringPath, 'sample-template.md'),
          '# Sample Template\n\nThis is a sample steering template for testing.'
        );
        fs.writeFileSync(
          path.join(steeringPath, 'another-template.md'),
          '# Another Template\n\nThis is another sample steering template for testing.'
        );
      }
      
      console.log(`📁 Created test workspace: ${workspace}`);
    }
  }
}

/**
 * Clean up test workspaces
 */
async function cleanupTestWorkspaces(): Promise<void> {
  if (fs.existsSync(testWorkspaceRoot)) {
    // Remove all test workspace directories
    const workspaces = fs.readdirSync(testWorkspaceRoot);
    for (const workspace of workspaces) {
      const workspacePath = path.join(testWorkspaceRoot, workspace);
      if (fs.statSync(workspacePath).isDirectory()) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
        console.log(`🗑️ Removed test workspace: ${workspace}`);
      }
    }
  }
}

// Export E2E test utilities
export const e2eUtils = {
  /**
   * Get the VS Code executable path
   */
  getVSCodeExecutablePath: (): string => {
    if (!vscodeExecutablePath) {
      throw new Error('VS Code executable path not available. Ensure E2E setup has completed.');
    }
    return vscodeExecutablePath;
  },
  
  /**
   * Get the extension development path
   */
  getExtensionPath: (): string => path.resolve(__dirname, '../../'),
  
  /**
   * Get the test workspace root path
   */
  getTestWorkspaceRoot: (): string => testWorkspaceRoot,
  
  /**
   * Get a specific test workspace path
   */
  getTestWorkspacePath: (name: string): string => path.join(testWorkspaceRoot, name),
  
  /**
   * Create a test workspace configuration
   */
  createTestWorkspace: (name: string, options: {
    hasKiroDirectory?: boolean;
    hasSteeringDirectory?: boolean;
    templatesPath?: string;
    existingTemplates?: string[];
  } = {}) => {
    const workspacePath = path.join(testWorkspaceRoot, name);
    
    // Ensure workspace directory exists
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    
    // Create .kiro directory if requested
    if (options.hasKiroDirectory) {
      const kiroPath = path.join(workspacePath, '.kiro');
      if (!fs.existsSync(kiroPath)) {
        fs.mkdirSync(kiroPath, { recursive: true });
      }
      
      // Create steering directory if requested
      if (options.hasSteeringDirectory) {
        const steeringPath = path.join(kiroPath, 'steering');
        if (!fs.existsSync(steeringPath)) {
          fs.mkdirSync(steeringPath, { recursive: true });
        }
        
        // Add existing templates if specified
        if (options.existingTemplates) {
          for (const template of options.existingTemplates) {
            fs.writeFileSync(
              path.join(steeringPath, `${template}.md`),
              `# ${template}\n\nThis is a test template: ${template}`
            );
          }
        }
      }
    }
    
    return {
      name,
      path: workspacePath,
      settings: {
        'kiroSteeringLoader.templatesPath': options.templatesPath || path.resolve(__dirname, '../fixtures/templates')
      }
    };
  },
  
  /**
   * Run VS Code with extension for testing
   */
  runVSCodeTest: async (options: {
    extensionTestsPath: string;
    workspacePath?: string;
    launchArgs?: string[];
  }): Promise<void> => {
    if (!vscodeExecutablePath) {
      throw new Error('VS Code executable not available');
    }
    
    const extensionDevelopmentPath = e2eUtils.getExtensionPath();
    
    try {
      await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath: options.extensionTestsPath,
        launchArgs: [
          ...(options.workspacePath ? [options.workspacePath] : []),
          '--disable-extensions',
          '--disable-workspace-trust',
          ...(options.launchArgs || [])
        ]
      });
    } catch (error) {
      console.error('❌ VS Code test execution failed:', error);
      throw error;
    }
  },
  
  /**
   * Wait for VS Code extension to be ready
   */
  waitForExtensionReady: async (timeout: number = 10000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // In a real implementation, this would check for extension activation
      // For now, we'll just wait a reasonable amount of time
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
  
  /**
   * Clean up a specific test workspace
   */
  cleanupTestWorkspace: (name: string): void => {
    const workspacePath = path.join(testWorkspaceRoot, name);
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
      console.log(`🗑️ Cleaned up test workspace: ${name}`);
    }
  },
  
  /**
   * Get CLI arguments for VS Code executable
   */
  getVSCodeCliArgs: (): string[] => {
    if (!vscodeExecutablePath) {
      throw new Error('VS Code executable not available');
    }
    return resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  },

  /**
   * Get workspace information by name
   */
  getWorkspaceInfo: (name: string) => {
    const workspacePath = path.join(testWorkspaceRoot, name);
    if (!fs.existsSync(workspacePath)) {
      return null;
    }
    
    return {
      name,
      path: workspacePath
    };
  }
};
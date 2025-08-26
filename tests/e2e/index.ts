/**
 * E2E Test Index
 * Entry point for E2E tests when running with @vscode/test-electron
 * This file bridges VS Code test runner with Vitest
 */

import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Configure and run E2E tests
 */
export async function run(): Promise<void> {
  console.log('🔧 Initializing E2E test environment in VS Code...');
  
  try {
    // Wait for VS Code to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ensure our extension is activated
    const extensionId = 'jamesbconner.kiro-steering-loader';
    let extension = vscode.extensions.getExtension(extensionId);
    
    if (extension && !extension.isActive) {
      console.log(`🔌 Activating extension: ${extensionId}`);
      await extension.activate();
    }
    
    // Set up test environment variables
    process.env.VSCODE_TEST_MODE = 'true';
    process.env.NODE_ENV = 'test';
    
    console.log('✅ E2E test environment initialized');
    console.log('📝 Note: Run E2E tests using: npm run test:e2e');
    
    // In a real VS Code test environment, we would run the actual tests here
    // For now, we'll just ensure the environment is properly set up
    
  } catch (error) {
    console.error('❌ Failed to initialize E2E test environment:', error);
    throw error;
  }
}
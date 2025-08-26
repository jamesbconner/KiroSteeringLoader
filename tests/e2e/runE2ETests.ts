/**
 * E2E Test Runner
 * Alternative runner for E2E tests using @vscode/test-electron directly
 * This is useful for debugging or running tests outside of Vitest
 */

import * as path from 'path';
import { runTests } from '@vscode/test-electron';

/**
 * Main function to run E2E tests with VS Code
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting E2E test execution with VS Code...');
    
    // Get paths
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './index.js');
    
    console.log(`Extension development path: ${extensionDevelopmentPath}`);
    console.log(`Extension tests path: ${extensionTestsPath}`);
    
    // Run the tests in VS Code
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    console.log('✅ E2E tests completed successfully');
  } catch (error) {
    console.error('❌ E2E tests failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { main };
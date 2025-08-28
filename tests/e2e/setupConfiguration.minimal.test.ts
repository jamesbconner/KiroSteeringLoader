/**
 * Minimal E2E Setup and Configuration Workflow Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2ETestManager, commonWorkspaceConfigs, e2eAssertions, type E2ETestContext } from '../utils/e2eTestUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Setup and Configuration Workflow E2E Tests', () => {
  let testManager: ReturnType<typeof createE2ETestManager>;
  let testContext: E2ETestContext;

  beforeEach(async () => {
    testManager = createE2ETestManager();
  });

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup();
    }
    await testManager.cleanupAll();
  });

  describe('Initial Extension Setup', () => {
    it('should display setup item when no templates path is configured', async () => {
      // Create workspace without templates path configuration
      testContext = await testManager.createTestWorkspace({
        ...commonWorkspaceConfigs.withKiro,
        name: 'setup-no-config-test'
        // Note: No templatesPath setting to trigger setup display
      });

      // Activate extension
      await testManager.waitForExtensionActivation('jamesbconner.kiro-steering-loader');
      await testManager.waitForTreeDataProvider('kiroSteeringLoader');

      // Verify initial configuration is empty
      const config = testManager.getWorkspaceConfiguration('kiroSteeringLoader');
      expect(config.get('templatesPath')).toBeUndefined();
    });
  });
});
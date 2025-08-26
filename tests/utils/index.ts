/**
 * Test utilities index - provides a clean API for importing test helper utilities
 * Exports all test utilities, fixtures, assertions, and cleanup functions
 */

// Export test helpers
export {
  TestHelpers,
  testHelpers,
  commonTestScenarios,
  testUtils,
  type TestWorkspace,
  type TestTemplatesDirectory,
  type TestConfiguration,
  type TestScenario
} from './testHelpers';

// Export fixtures
export {
  FixtureFactory,
  fixtureFactory,
  commonFixtures,
  fixtureUtils,
  type TemplateFixture,
  type WorkspaceFixture,
  type ConfigurationFixture,
  type ExtensionContextFixture
} from './fixtures';

// Export type assertions
export {
  TypeAssertions,
  typeAssertions,
  assertVSCode,
  isVSCode,
  type CommandAssertion,
  type TreeItemAssertion,
  type MessageAssertion,
  type WorkspaceAssertion
} from './typeAssertions';

// Export cleanup utilities
export {
  CleanupManager,
  cleanupManager,
  TestCleanup,
  VSCodeCleanup,
  FileSystemCleanup,
  MemoryCleanup,
  cleanupAllTestResources,
  setupAutomaticCleanup,
  scenarioCleanup,
  withCleanup,
  autoCleanup,
  type CleanupTask,
  type ResourceTracker
} from './cleanup';

// Re-export commonly used utilities for convenience
export const createTestUtilities = () => ({
  // Helper instances
  helpers: testHelpers,
  fixtures: fixtureFactory,
  assertions: typeAssertions,
  cleanup: cleanupManager,

  // Common scenarios
  scenarios: commonTestScenarios,
  commonFixtures,

  // Assertion helpers
  assertVSCode,
  isVSCode,

  // Cleanup functions
  cleanupAll: cleanupAllTestResources,
  setupAutoCleanup: setupAutomaticCleanup,
  scenarioCleanup,

  // Utility functions
  utils: testUtils
});

// Default export for easy importing
export default createTestUtilities;
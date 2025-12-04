/**
 * Property-based tests for ConfigurationService
 * Feature: github-steering-loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { RepositoryConfig } from '../../src/types';

// Mock VS Code API
const mockSecrets = {
  store: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
};

const mockConfig = {
  get: vi.fn(),
  update: vi.fn(),
  inspect: vi.fn()
};

const mockContext = {
  secrets: mockSecrets,
  subscriptions: [],
  workspaceState: {} as any,
  globalState: {} as any,
  extensionUri: {} as any,
  extensionPath: '',
  environmentVariableCollection: {} as any,
  extensionMode: 1,
  storageUri: undefined,
  storagePath: undefined,
  globalStorageUri: {} as any,
  globalStoragePath: '',
  logUri: {} as any,
  logPath: '',
  extension: {} as any
};

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => mockConfig),
    workspaceFolders: undefined
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  }
}));

describe('ConfigurationService - Property Tests', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConfigurationService(mockContext as any);
  });

  /**
   * Property 3: Configuration persistence round-trip
   * Feature: github-steering-loader, Property 3: Configuration persistence round-trip
   * Validates: Requirements 1.3
   */
  it('should persist and retrieve repository configuration correctly', async () => {
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    const configArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb,
      path: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      branch: fc.option(fc.constantFrom('main', 'master', 'develop'), { nil: undefined })
    });

    await fc.assert(
      fc.asyncProperty(configArb, async (config) => {
        // Mock the update to store the config
        let storedConfig: RepositoryConfig | null = null;
        mockConfig.update.mockImplementation(async (key: string, value: any) => {
          if (key === 'repository') {
            storedConfig = value;
          }
        });

        // Mock the get to return the stored config
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'repository') {
            return storedConfig;
          }
          return undefined;
        });

        // Set the configuration
        await service.setRepositoryConfig(config);

        // Retrieve the configuration
        const retrieved = service.getRepositoryConfig();

        // Should match the original config
        expect(retrieved).not.toBeNull();
        expect(retrieved?.owner).toBe(config.owner);
        expect(retrieved?.repo).toBe(config.repo);
        expect(retrieved?.path).toBe(config.path);
        expect(retrieved?.branch).toBe(config.branch || 'main');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Token storage round-trip
   * Feature: github-steering-loader, Property 8: Token storage round-trip
   * Validates: Requirements 3.1
   */
  it('should store and retrieve authentication tokens correctly', async () => {
    const tokenArb = fc.string({ minLength: 10, maxLength: 100 })
      .filter(token => token.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(tokenArb, async (token) => {
        // Mock the secrets storage
        let storedToken: string | null = null;
        mockSecrets.store.mockImplementation(async (key: string, value: string) => {
          storedToken = value;
        });
        mockSecrets.get.mockImplementation(async (key: string) => {
          return storedToken;
        });

        // Store the token
        await service.setAuthToken(token);

        // Retrieve the token
        const retrieved = await service.getAuthToken();

        // Should match the original token
        expect(retrieved).toBe(token);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Token clearing completeness
   * Feature: github-steering-loader, Property 9: Token clearing completeness
   * Validates: Requirements 3.5
   */
  it('should completely clear authentication tokens', async () => {
    const tokenArb = fc.string({ minLength: 10, maxLength: 100 })
      .filter(token => token.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(tokenArb, async (token) => {
        // Mock the secrets storage
        let storedToken: string | null = null;
        mockSecrets.store.mockImplementation(async (key: string, value: string) => {
          storedToken = value;
        });
        mockSecrets.get.mockImplementation(async (key: string) => {
          return storedToken;
        });
        mockSecrets.delete.mockImplementation(async (key: string) => {
          storedToken = null;
        });

        // Store the token
        await service.setAuthToken(token);

        // Clear the token
        await service.clearAuthToken();

        // Retrieve should return null
        const retrieved = await service.getAuthToken();
        expect(retrieved).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Configuration source priority
   * Feature: github-steering-loader, Property 19: Configuration source priority
   * Validates: Requirements 8.2
   */
  it('should prioritize GitHub configuration over local configuration', () => {
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    const configArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb
    });

    const localPathArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(configArb, localPathArb, (repoConfig, localPath) => {
        // Mock both GitHub and local configurations present
        mockConfig.get.mockImplementation((key: string) => {
          if (key === 'repository') {
            return repoConfig;
          }
          if (key === 'templatesPath') {
            return localPath;
          }
          return undefined;
        });

        // Should return 'github' as the source
        const source = service.getConfigurationSource();
        expect(source).toBe('github');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22: Workspace configuration priority
   * Feature: github-steering-loader, Property 22: Workspace configuration priority
   * Validates: Requirements 9.4
   */
  it('should prioritize workspace configuration over user configuration', () => {
    const githubNameArb = fc.string({ minLength: 1, maxLength: 39 })
      .filter(name => {
        return name.length > 0 && 
               name[0] !== '-' && 
               /^[a-zA-Z0-9-]+$/.test(name) &&
               /[a-zA-Z0-9]/.test(name);
      });

    const workspaceConfigArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb
    });

    const userConfigArb = fc.record({
      owner: githubNameArb,
      repo: githubNameArb
    });

    fc.assert(
      fc.property(workspaceConfigArb, userConfigArb, (workspaceConfig, userConfig) => {
        // Mock inspection to show both workspace and user configs
        mockConfig.inspect.mockReturnValue({
          workspaceValue: workspaceConfig,
          globalValue: userConfig
        });

        // Get configuration inspection
        const inspection = service.getConfigurationInspection();

        // Should indicate workspace is active
        expect(inspection.hasWorkspaceConfig).toBe(true);
        expect(inspection.hasUserConfig).toBe(true);
        expect(inspection.activeSource).toBe('workspace');
      }),
      { numRuns: 100 }
    );
  });
});

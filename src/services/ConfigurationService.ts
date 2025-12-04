/**
 * ConfigurationService - Manages extension configuration
 * 
 * Handles repository configuration, authentication tokens, and configuration priority
 */

import * as vscode from 'vscode';
import { RepositoryConfig, ConfigSource } from '../types';

const CONFIG_SECTION = 'kiroSteeringLoader';
const TOKEN_KEY = 'githubToken';

export class ConfigurationService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Gets the configured GitHub repository
   * @returns Repository configuration or null
   */
  getRepositoryConfig(): RepositoryConfig | null {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const repoConfig = config.get<RepositoryConfig>('repository');
    
    if (!repoConfig || !repoConfig.owner || !repoConfig.repo) {
      return null;
    }
    
    return {
      owner: repoConfig.owner,
      repo: repoConfig.repo,
      path: repoConfig.path,
      branch: repoConfig.branch || 'main'
    };
  }

  /**
   * Sets the GitHub repository configuration
   * @param config - Repository configuration
   */
  async setRepositoryConfig(config: RepositoryConfig): Promise<void> {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_SECTION);
    
    // Determine configuration target based on workspace
    const target = vscode.workspace.workspaceFolders 
      ? vscode.ConfigurationTarget.Workspace 
      : vscode.ConfigurationTarget.Global;
    
    await vsConfig.update('repository', {
      owner: config.owner,
      repo: config.repo,
      path: config.path,
      branch: config.branch || 'main'
    }, target);
  }

  /**
   * Gets the authentication token from secure storage
   * @returns Token or null if not configured
   */
  async getAuthToken(): Promise<string | null> {
    return await this.context.secrets.get(TOKEN_KEY) || null;
  }

  /**
   * Stores authentication token in secure storage
   * @param token - GitHub personal access token
   */
  async setAuthToken(token: string): Promise<void> {
    await this.context.secrets.store(TOKEN_KEY, token);
  }

  /**
   * Removes authentication token from secure storage
   */
  async clearAuthToken(): Promise<void> {
    await this.context.secrets.delete(TOKEN_KEY);
  }

  /**
   * Gets the legacy local templates path if configured
   * @returns Local path or null
   */
  getLocalTemplatesPath(): string | null {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const path = config.get<string>('templatesPath');
    return path && path.trim().length > 0 ? path : null;
  }

  /**
   * Determines which configuration source to use
   * Priority: GitHub (workspace) > GitHub (user) > Local > None
   * @returns Configuration source priority
   */
  getConfigurationSource(): ConfigSource {
    // Check for GitHub repository configuration
    const repoConfig = this.getRepositoryConfig();
    if (repoConfig) {
      return 'github';
    }
    
    // Check for legacy local path configuration
    const localPath = this.getLocalTemplatesPath();
    if (localPath) {
      return 'local';
    }
    
    return 'none';
  }

  /**
   * Clears the local templates path configuration
   */
  async clearLocalTemplatesPath(): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const target = vscode.workspace.workspaceFolders 
      ? vscode.ConfigurationTarget.Workspace 
      : vscode.ConfigurationTarget.Global;
    
    await config.update('templatesPath', undefined, target);
  }

  /**
   * Gets the configuration inspection to determine source
   * @returns Configuration inspection details
   */
  getConfigurationInspection(): {
    hasWorkspaceConfig: boolean;
    hasUserConfig: boolean;
    activeSource: 'workspace' | 'user' | 'none';
  } {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const inspection = config.inspect<RepositoryConfig>('repository');
    
    const hasWorkspaceConfig = !!inspection?.workspaceValue;
    const hasUserConfig = !!inspection?.globalValue;
    
    let activeSource: 'workspace' | 'user' | 'none' = 'none';
    if (hasWorkspaceConfig) {
      activeSource = 'workspace';
    } else if (hasUserConfig) {
      activeSource = 'user';
    }
    
    return {
      hasWorkspaceConfig,
      hasUserConfig,
      activeSource
    };
  }
}

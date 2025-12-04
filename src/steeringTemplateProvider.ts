import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationService } from './services/ConfigurationService';
import { GitHubRepositoryService } from './services/GitHubRepositoryService';
import { CacheManager } from './services/CacheManager';
import { FileSystemService } from './services/FileSystemService';
import { ErrorHandler } from './services/ErrorHandler';
import { TemplateMetadata } from './types';
import { buildTreeStructure, convertToEnhancedItems, TreeNode } from './utils/treeBuilder';
import { formatConfigurationSource, generateTooltip } from './utils/displayUtils';
import { GitHubSteeringError, ErrorCode } from './errors';

export class SteeringTemplateProvider implements vscode.TreeDataProvider<TemplateItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TemplateItem | undefined | null | void> = new vscode.EventEmitter<TemplateItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TemplateItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private lastFetchTime: Date | null = null;
    private cacheStatus: 'fresh' | 'stale' | 'none' = 'none';

    constructor(
        private context: vscode.ExtensionContext,
        private configService?: ConfigurationService,
        private githubService?: GitHubRepositoryService,
        private cacheManager?: CacheManager,
        private fileSystemService?: FileSystemService,
        private errorHandler?: ErrorHandler
    ) {
        // Initialize services if not provided (for backward compatibility)
        if (!this.configService) {
            this.configService = new ConfigurationService(context);
        }
        if (!this.githubService) {
            this.githubService = new GitHubRepositoryService();
        }
        if (!this.cacheManager) {
            this.cacheManager = new CacheManager(context);
        }
        if (!this.fileSystemService) {
            this.fileSystemService = new FileSystemService();
        }
        if (!this.errorHandler) {
            this.errorHandler = new ErrorHandler();
        }
    }

    refresh(forceRefresh: boolean = false): void {
        if (forceRefresh && this.cacheManager) {
            // Clear cache on force refresh
            const repoConfig = this.configService?.getRepositoryConfig();
            if (repoConfig) {
                const cacheKey = `${repoConfig.owner}/${repoConfig.repo}${repoConfig.path ? `/${repoConfig.path}` : ''}`;
                this.cacheManager.invalidateCache(cacheKey);
            }
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TemplateItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TemplateItem): Promise<TemplateItem[]> {
        if (!element) {
            return this.getTemplateItems();
        }
        
        // Handle directory expansion
        if (element.itemType === 'directory' && element.children) {
            return element.children;
        }
        
        return [];
    }

    private async getTemplateItems(): Promise<TemplateItem[]> {
        try {
            const configSource = this.configService!.getConfigurationSource();
            
            this.errorHandler!.logInfo('Fetching templates', { source: configSource });
            
            // Add configuration source indicator
            const sourceIndicator = this.createSourceIndicator(configSource);
            
            if (configSource === 'github') {
                return this.getGitHubTemplates(sourceIndicator);
            } else if (configSource === 'local') {
                return this.getLocalTemplates(sourceIndicator);
            } else {
                return [
                    sourceIndicator,
                    new TemplateItem('Click to configure GitHub repository', '', vscode.TreeItemCollapsibleState.None, 'setup', undefined)
                ];
            }
        } catch (error) {
            this.errorHandler!.handleError(error, {
                operation: 'Fetch templates',
                details: { source: this.configService!.getConfigurationSource() }
            });
            return this.handleError(error);
        }
    }

    private createSourceIndicator(source: 'github' | 'local' | 'none'): TemplateItem {
        const repoConfig = this.configService!.getRepositoryConfig();
        const localPath = this.configService!.getLocalTemplatesPath();
        
        const sourceText = formatConfigurationSource(source, {
            owner: repoConfig?.owner,
            repo: repoConfig?.repo,
            path: repoConfig?.path,
            localPath: localPath || undefined
        });
        
        let statusText = '';
        if (source === 'github' && this.lastFetchTime) {
            const timeSince = Math.floor((Date.now() - this.lastFetchTime.getTime()) / 1000);
            const timeStr = timeSince < 60 ? `${timeSince}s ago` : `${Math.floor(timeSince / 60)}m ago`;
            statusText = ` • Last fetch: ${timeStr} • Cache: ${this.cacheStatus}`;
        }
        
        return new TemplateItem(
            `${sourceText}${statusText}`,
            '',
            vscode.TreeItemCollapsibleState.None,
            'info',
            undefined
        );
    }

    private async getGitHubTemplates(sourceIndicator: TemplateItem): Promise<TemplateItem[]> {
        const repoConfig = this.configService!.getRepositoryConfig();
        if (!repoConfig) {
            return [
                sourceIndicator,
                new TemplateItem('GitHub configuration error', '', vscode.TreeItemCollapsibleState.None, 'error', undefined)
            ];
        }

        try {
            // Set auth token if available
            const token = await this.configService!.getAuthToken();
            if (token) {
                this.githubService!.setAuthToken(token);
            }

            // Check cache first
            const cacheKey = `${repoConfig.owner}/${repoConfig.repo}${repoConfig.path ? `/${repoConfig.path}` : ''}`;
            const cachedTemplates = this.cacheManager!.getCachedTemplates(cacheKey);
            
            let templates: TemplateMetadata[];
            
            if (cachedTemplates && this.cacheManager!.isCacheFresh(cacheKey)) {
                templates = cachedTemplates;
                this.cacheStatus = 'fresh';
            } else {
                // Fetch from GitHub
                templates = await this.githubService!.fetchTemplates(
                    repoConfig.owner,
                    repoConfig.repo,
                    repoConfig.path
                );
                
                // Cache the results
                this.cacheManager!.setCachedTemplates(cacheKey, templates);
                this.lastFetchTime = new Date();
                this.cacheStatus = 'fresh';
            }

            if (templates.length === 0) {
                return [
                    sourceIndicator,
                    new TemplateItem('No templates found in repository', '', vscode.TreeItemCollapsibleState.None, 'info', undefined)
                ];
            }

            // Build hierarchical tree structure
            const tree = buildTreeStructure(templates);
            const treeItems = this.convertTreeToItems(tree);
            
            return [sourceIndicator, ...treeItems];
        } catch (error) {
            if (error instanceof GitHubSteeringError) {
                return [
                    sourceIndicator,
                    new TemplateItem(
                        error.userMessage || error.message,
                        '',
                        vscode.TreeItemCollapsibleState.None,
                        'error',
                        undefined
                    ),
                    new TemplateItem('Click to reconfigure', '', vscode.TreeItemCollapsibleState.None, 'setup', undefined)
                ];
            }
            throw error;
        }
    }

    private getLocalTemplates(sourceIndicator: TemplateItem): TemplateItem[] {
        const templatesPath = this.configService!.getLocalTemplatesPath();

        if (!templatesPath) {
            return [
                sourceIndicator,
                new TemplateItem('Local path not configured', '', vscode.TreeItemCollapsibleState.None, 'error', undefined)
            ];
        }

        if (!fs.existsSync(templatesPath)) {
            return [
                sourceIndicator,
                new TemplateItem('Templates path not found', '', vscode.TreeItemCollapsibleState.None, 'error', undefined),
                new TemplateItem('Click to set new path', '', vscode.TreeItemCollapsibleState.None, 'setup', undefined)
            ];
        }

        try {
            const files = fs.readdirSync(templatesPath);
            const templateFiles = files.filter(file => file.endsWith('.md'));

            if (templateFiles.length === 0) {
                return [
                    sourceIndicator,
                    new TemplateItem('No .md template files found', '', vscode.TreeItemCollapsibleState.None, 'info', undefined),
                    new TemplateItem(`Path: ${templatesPath}`, '', vscode.TreeItemCollapsibleState.None, 'info', undefined)
                ];
            }

            const items = templateFiles.map(file => {
                const fullPath = path.join(templatesPath, file);
                return new TemplateItem(
                    path.basename(file, '.md'),
                    fullPath,
                    vscode.TreeItemCollapsibleState.None,
                    'template',
                    undefined
                );
            });
            
            return [sourceIndicator, ...items];
        } catch (error) {
            return [
                sourceIndicator,
                new TemplateItem('Error reading templates directory', '', vscode.TreeItemCollapsibleState.None, 'error', undefined),
                new TemplateItem('Click to set new path', '', vscode.TreeItemCollapsibleState.None, 'setup', undefined)
            ];
        }
    }

    private convertTreeToItems(nodes: TreeNode[]): TemplateItem[] {
        return nodes.map(node => {
            if (node.type === 'directory') {
                const children = this.convertTreeToItems(node.children);
                return new TemplateItem(
                    node.name,
                    '',
                    children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    'directory',
                    undefined,
                    children
                );
            } else {
                const metadata = node.metadata!;
                return new TemplateItem(
                    metadata.name,
                    metadata.downloadUrl,
                    vscode.TreeItemCollapsibleState.None,
                    'template',
                    metadata
                );
            }
        });
    }

    private handleError(error: unknown): TemplateItem[] {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return [
            new TemplateItem('Error loading templates', '', vscode.TreeItemCollapsibleState.None, 'error', undefined),
            new TemplateItem(errorMessage, '', vscode.TreeItemCollapsibleState.None, 'info', undefined)
        ];
    }

    async loadTemplate(templatePathOrUrl: string, metadata?: TemplateMetadata): Promise<void> {
        if (!templatePathOrUrl || !templatePathOrUrl.trim()) {
            vscode.window.showErrorMessage('No template path provided');
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            let content: string;
            let filename: string;

            // Determine if this is a GitHub URL or local path
            if (templatePathOrUrl.startsWith('http')) {
                // GitHub template
                this.errorHandler!.logInfo('Loading template from GitHub', { 
                    url: templatePathOrUrl,
                    filename: metadata?.filename 
                });
                content = await this.githubService!.fetchFileContent(templatePathOrUrl);
                filename = metadata?.filename || path.basename(templatePathOrUrl);
            } else {
                // Local template
                this.errorHandler!.logInfo('Loading template from local filesystem', { 
                    path: templatePathOrUrl 
                });
                content = fs.readFileSync(templatePathOrUrl, 'utf8');
                filename = path.basename(templatePathOrUrl);
            }

            // Use FileSystemService to load the template
            const result = await this.fileSystemService!.loadTemplate(
                content,
                filename,
                workspaceFolder.uri.fsPath
            );

            if (result.success) {
                this.errorHandler!.logInfo('Template loaded successfully', { 
                    filename,
                    filepath: result.filepath 
                });
                vscode.window.showInformationMessage(`Template "${filename}" loaded successfully`);
            } else {
                this.errorHandler!.handleError(
                    new Error(result.error || 'Failed to load template'),
                    { operation: 'Load template', details: { filename } }
                );
                vscode.window.showErrorMessage(result.error || 'Failed to load template');
            }
        } catch (error) {
            this.errorHandler!.handleError(error, {
                operation: 'Load template',
                details: { 
                    templatePath: templatePathOrUrl,
                    filename: metadata?.filename 
                }
            });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load template: ${errorMessage}`);
        }
    }
}

class TemplateItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly templatePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'template' | 'directory' | 'info' | 'error' | 'setup',
        public readonly metadata?: TemplateMetadata,
        public readonly children?: TemplateItem[]
    ) {
        super(label, collapsibleState);

        if (itemType === 'template') {
            if (metadata) {
                this.tooltip = generateTooltip(metadata);
            } else {
                this.tooltip = `Load template: ${this.label}`;
            }
            this.command = {
                command: 'kiroSteeringLoader.loadTemplate',
                title: 'Load Template',
                arguments: [templatePath, metadata]
            };
            this.iconPath = new vscode.ThemeIcon('file-text');
        } else if (itemType === 'directory') {
            this.tooltip = `Directory: ${this.label}`;
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'directory';
        } else if (itemType === 'setup') {
            this.tooltip = 'Click to configure templates directory';
            this.command = {
                command: 'kiroSteeringLoader.setTemplatesPath',
                title: 'Set Templates Path'
            };
            this.iconPath = new vscode.ThemeIcon('folder-opened');
        } else if (itemType === 'info') {
            this.iconPath = new vscode.ThemeIcon('info');
        } else if (itemType === 'error') {
            this.iconPath = new vscode.ThemeIcon('error');
        }
    }
}
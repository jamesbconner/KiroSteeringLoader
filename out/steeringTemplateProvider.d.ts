import * as vscode from 'vscode';
import { ConfigurationService } from './services/ConfigurationService';
import { GitHubRepositoryService } from './services/GitHubRepositoryService';
import { CacheManager } from './services/CacheManager';
import { FileSystemService } from './services/FileSystemService';
import { ErrorHandler } from './services/ErrorHandler';
import { TemplateMetadata } from './types';
export declare class SteeringTemplateProvider implements vscode.TreeDataProvider<TemplateItem> {
    private context;
    private configService?;
    private githubService?;
    private cacheManager?;
    private fileSystemService?;
    private errorHandler?;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TemplateItem | undefined | null | void>;
    private lastFetchTime;
    private cacheStatus;
    constructor(context: vscode.ExtensionContext, configService?: ConfigurationService | undefined, githubService?: GitHubRepositoryService | undefined, cacheManager?: CacheManager | undefined, fileSystemService?: FileSystemService | undefined, errorHandler?: ErrorHandler | undefined);
    refresh(forceRefresh?: boolean): void;
    getTreeItem(element: TemplateItem): vscode.TreeItem;
    getChildren(element?: TemplateItem): Promise<TemplateItem[]>;
    private getTemplateItems;
    private createSourceIndicator;
    private getGitHubTemplates;
    private getLocalTemplates;
    private convertTreeToItems;
    private handleError;
    loadTemplate(templatePathOrUrl: string, metadata?: TemplateMetadata): Promise<void>;
}
declare class TemplateItem extends vscode.TreeItem {
    readonly label: string;
    readonly templatePath: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly itemType: 'template' | 'directory' | 'info' | 'error' | 'setup';
    readonly metadata?: TemplateMetadata | undefined;
    readonly children?: TemplateItem[] | undefined;
    constructor(label: string, templatePath: string, collapsibleState: vscode.TreeItemCollapsibleState, itemType: 'template' | 'directory' | 'info' | 'error' | 'setup', metadata?: TemplateMetadata | undefined, children?: TemplateItem[] | undefined);
}
export {};
//# sourceMappingURL=steeringTemplateProvider.d.ts.map
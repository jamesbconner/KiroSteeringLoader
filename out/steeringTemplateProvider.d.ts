import * as vscode from 'vscode';
export declare class SteeringTemplateProvider implements vscode.TreeDataProvider<TemplateItem> {
    private context;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TemplateItem | undefined | null | void>;
    constructor(context: vscode.ExtensionContext);
    refresh(): void;
    getTreeItem(element: TemplateItem): vscode.TreeItem;
    getChildren(element?: TemplateItem): Thenable<TemplateItem[]>;
    private getTemplateItems;
    loadTemplate(templatePath: string): Promise<void>;
}
declare class TemplateItem extends vscode.TreeItem {
    readonly label: string;
    readonly templatePath: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly itemType: 'template' | 'info' | 'error' | 'setup';
    constructor(label: string, templatePath: string, collapsibleState: vscode.TreeItemCollapsibleState, itemType: 'template' | 'info' | 'error' | 'setup');
}
export {};
//# sourceMappingURL=steeringTemplateProvider.d.ts.map
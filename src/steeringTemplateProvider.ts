import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class SteeringTemplateProvider implements vscode.TreeDataProvider<TemplateItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TemplateItem | undefined | null | void> = new vscode.EventEmitter<TemplateItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TemplateItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TemplateItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TemplateItem): Thenable<TemplateItem[]> {
        if (!element) {
            return Promise.resolve(this.getTemplateItems());
        }
        return Promise.resolve([]);
    }

    private getTemplateItems(): TemplateItem[] {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const templatesPath = config.get<string>('templatesPath');

        if (!templatesPath) {
            return [new TemplateItem('Click to set templates path', '', vscode.TreeItemCollapsibleState.None, 'setup')];
        }

        if (!fs.existsSync(templatesPath)) {
            return [
                new TemplateItem('Templates path not found', '', vscode.TreeItemCollapsibleState.None, 'error'),
                new TemplateItem('Click to set new path', '', vscode.TreeItemCollapsibleState.None, 'setup')
            ];
        }

        try {
            const files = fs.readdirSync(templatesPath);
            const templateFiles = files.filter(file => file.endsWith('.md'));

            if (templateFiles.length === 0) {
                return [
                    new TemplateItem('No .md template files found', '', vscode.TreeItemCollapsibleState.None, 'info'),
                    new TemplateItem(`Path: ${templatesPath}`, '', vscode.TreeItemCollapsibleState.None, 'info')
                ];
            }

            return templateFiles.map(file => {
                const fullPath = path.join(templatesPath, file);
                return new TemplateItem(
                    path.basename(file, '.md'),
                    fullPath,
                    vscode.TreeItemCollapsibleState.None,
                    'template'
                );
            });
        } catch (error) {
            return [
                new TemplateItem('Error reading templates directory', '', vscode.TreeItemCollapsibleState.None, 'error'),
                new TemplateItem('Click to set new path', '', vscode.TreeItemCollapsibleState.None, 'setup')
            ];
        }
    }

    async loadTemplate(templatePath: string): Promise<void> {
        if (!templatePath || !templatePath.trim()) {
            vscode.window.showErrorMessage('No template path provided');
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            const steeringDir = path.join(workspaceFolder.uri.fsPath, '.kiro', 'steering');
            
            // Ensure .kiro/steering directory exists
            if (!fs.existsSync(steeringDir)) {
                fs.mkdirSync(steeringDir, { recursive: true });
            }

            // Read template content
            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const templateName = path.basename(templatePath);
            const targetPath = path.join(steeringDir, templateName);

            // Write template to steering directory
            fs.writeFileSync(targetPath, templateContent);

            vscode.window.showInformationMessage(`Template "${templateName}" loaded successfully`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load template: ${error}`);
        }
    }
}

class TemplateItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly templatePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'template' | 'info' | 'error' | 'setup'
    ) {
        super(label, collapsibleState);

        if (itemType === 'template') {
            this.tooltip = `Load template: ${this.label}`;
            this.command = {
                command: 'kiroSteeringLoader.loadTemplate',
                title: 'Load Template',
                arguments: [templatePath]
            };
            this.iconPath = new vscode.ThemeIcon('file-text');
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
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SteeringTemplateProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SteeringTemplateProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getTemplateItems());
        }
        return Promise.resolve([]);
    }
    getTemplateItems() {
        const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
        const templatesPath = config.get('templatesPath');
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
                return new TemplateItem(path.basename(file, '.md'), fullPath, vscode.TreeItemCollapsibleState.None, 'template');
            });
        }
        catch (error) {
            return [
                new TemplateItem('Error reading templates directory', '', vscode.TreeItemCollapsibleState.None, 'error'),
                new TemplateItem('Click to set new path', '', vscode.TreeItemCollapsibleState.None, 'setup')
            ];
        }
    }
    async loadTemplate(templatePath) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to load template: ${error}`);
        }
    }
}
exports.SteeringTemplateProvider = SteeringTemplateProvider;
class TemplateItem extends vscode.TreeItem {
    constructor(label, templatePath, collapsibleState, itemType) {
        super(label, collapsibleState);
        this.label = label;
        this.templatePath = templatePath;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        if (itemType === 'template') {
            this.tooltip = `Load template: ${this.label}`;
            this.command = {
                command: 'kiroSteeringLoader.loadTemplate',
                title: 'Load Template',
                arguments: [templatePath]
            };
            this.iconPath = new vscode.ThemeIcon('file-text');
        }
        else if (itemType === 'setup') {
            this.tooltip = 'Click to configure templates directory';
            this.command = {
                command: 'kiroSteeringLoader.setTemplatesPath',
                title: 'Set Templates Path'
            };
            this.iconPath = new vscode.ThemeIcon('folder-opened');
        }
        else if (itemType === 'info') {
            this.iconPath = new vscode.ThemeIcon('info');
        }
        else if (itemType === 'error') {
            this.iconPath = new vscode.ThemeIcon('error');
        }
    }
}
//# sourceMappingURL=steeringTemplateProvider.js.map
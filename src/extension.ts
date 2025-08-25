import * as vscode from 'vscode';
import { SteeringTemplateProvider } from './steeringTemplateProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new SteeringTemplateProvider(context);
    
    vscode.window.registerTreeDataProvider('kiroSteeringLoader', provider);
    
    const refreshCommand = vscode.commands.registerCommand('kiroSteeringLoader.refresh', () => {
        provider.refresh();
    });
    
    const loadTemplateCommand = vscode.commands.registerCommand('kiroSteeringLoader.loadTemplate', 
        (templatePath: string) => {
            provider.loadTemplate(templatePath);
        }
    );
    
    const setTemplatesPathCommand = vscode.commands.registerCommand('kiroSteeringLoader.setTemplatesPath', 
        async () => {
            const result = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Templates Directory'
            });
            
            if (result && result[0]) {
                const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
                await config.update('templatesPath', result[0].fsPath, vscode.ConfigurationTarget.Global);
                provider.refresh();
            }
        }
    );
    
    context.subscriptions.push(refreshCommand, loadTemplateCommand, setTemplatesPathCommand);
}

export function deactivate() {}
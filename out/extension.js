"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const steeringTemplateProvider_1 = require("./steeringTemplateProvider");
function activate(context) {
    const provider = new steeringTemplateProvider_1.SteeringTemplateProvider(context);
    vscode.window.registerTreeDataProvider('kiroSteeringLoader', provider);
    const refreshCommand = vscode.commands.registerCommand('kiroSteeringLoader.refresh', () => {
        provider.refresh();
    });
    const loadTemplateCommand = vscode.commands.registerCommand('kiroSteeringLoader.loadTemplate', (templatePath) => {
        provider.loadTemplate(templatePath);
    });
    const setTemplatesPathCommand = vscode.commands.registerCommand('kiroSteeringLoader.setTemplatesPath', async () => {
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
    });
    context.subscriptions.push(refreshCommand, loadTemplateCommand, setTemplatesPathCommand);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
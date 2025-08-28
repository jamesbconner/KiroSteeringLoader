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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
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
function deactivate() { }
//# sourceMappingURL=extension.js.map
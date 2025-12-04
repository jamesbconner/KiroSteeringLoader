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
const ConfigurationService_1 = require("./services/ConfigurationService");
const GitHubRepositoryService_1 = require("./services/GitHubRepositoryService");
const CacheManager_1 = require("./services/CacheManager");
const FileSystemService_1 = require("./services/FileSystemService");
const ErrorHandler_1 = require("./services/ErrorHandler");
const urlValidator_1 = require("./utils/urlValidator");
function activate(context) {
    // Initialize services
    const errorHandler = new ErrorHandler_1.ErrorHandler();
    const configService = new ConfigurationService_1.ConfigurationService(context);
    const githubService = new GitHubRepositoryService_1.GitHubRepositoryService();
    const cacheManager = new CacheManager_1.CacheManager(context);
    const fileSystemService = new FileSystemService_1.FileSystemService();
    // Log activation
    errorHandler.logInfo('Kiro Steering Loader activated');
    // Initialize GitHub service with token if available
    configService.getAuthToken().then(token => {
        if (token) {
            githubService.setAuthToken(token);
            errorHandler.logInfo('GitHub authentication token loaded');
        }
    }).catch(error => {
        errorHandler.logWarning('Failed to load GitHub token', { error: error.message });
    });
    // Create provider with services
    const provider = new steeringTemplateProvider_1.SteeringTemplateProvider(context, configService, githubService, cacheManager, fileSystemService, errorHandler);
    vscode.window.registerTreeDataProvider('kiroSteeringLoader', provider);
    // Refresh command - now supports force refresh
    const refreshCommand = vscode.commands.registerCommand('kiroSteeringLoader.refresh', () => {
        provider.refresh(false);
    });
    // Force refresh command - bypasses cache
    const forceRefreshCommand = vscode.commands.registerCommand('kiroSteeringLoader.forceRefresh', () => {
        provider.refresh(true);
        vscode.window.showInformationMessage('Cache cleared and templates refreshed');
    });
    // Load template command
    const loadTemplateCommand = vscode.commands.registerCommand('kiroSteeringLoader.loadTemplate', (templatePath, metadata) => {
        provider.loadTemplate(templatePath, metadata);
    });
    // Set templates path command (legacy local mode)
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
    // Configure GitHub Repository command
    const configureGitHubRepoCommand = vscode.commands.registerCommand('kiroSteeringLoader.configureGitHubRepository', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter GitHub repository URL or owner/repo',
            placeHolder: 'e.g., https://github.com/owner/repo or owner/repo',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Repository URL cannot be empty';
                }
                const parsed = (0, urlValidator_1.parseRepositoryUrl)(value);
                if (!parsed) {
                    return 'Invalid repository URL format. Use: owner/repo or https://github.com/owner/repo';
                }
                return null;
            }
        });
        if (!input) {
            return;
        }
        const parsed = (0, urlValidator_1.parseRepositoryUrl)(input);
        if (!parsed) {
            vscode.window.showErrorMessage('Invalid repository URL format');
            return;
        }
        // Optional: Ask for subdirectory path
        const pathInput = await vscode.window.showInputBox({
            prompt: 'Enter subdirectory path (optional)',
            placeHolder: 'e.g., templates/steering',
            value: ''
        });
        // Optional: Ask for branch
        const branchInput = await vscode.window.showInputBox({
            prompt: 'Enter branch name (optional, default: main)',
            placeHolder: 'main',
            value: 'main'
        });
        // Save configuration
        await configService.setRepositoryConfig({
            owner: parsed.owner,
            repo: parsed.repo,
            path: pathInput || undefined,
            branch: branchInput || 'main'
        });
        vscode.window.showInformationMessage(`GitHub repository configured: ${parsed.owner}/${parsed.repo}`);
        provider.refresh();
    });
    // Configure GitHub Token command
    const configureGitHubTokenCommand = vscode.commands.registerCommand('kiroSteeringLoader.configureGitHubToken', async () => {
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your GitHub Personal Access Token',
            placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
            password: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Token cannot be empty';
                }
                if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
                    return 'Token should start with ghp_ or github_pat_';
                }
                return null;
            }
        });
        if (!token) {
            return;
        }
        await configService.setAuthToken(token);
        githubService.setAuthToken(token);
        vscode.window.showInformationMessage('GitHub token configured successfully');
        provider.refresh();
    });
    // Clear GitHub Token command
    const clearGitHubTokenCommand = vscode.commands.registerCommand('kiroSteeringLoader.clearGitHubToken', async () => {
        const confirm = await vscode.window.showWarningMessage('Are you sure you want to clear the GitHub token?', { modal: true }, 'Clear Token');
        if (confirm === 'Clear Token') {
            await configService.clearAuthToken();
            githubService.clearAuthToken();
            vscode.window.showInformationMessage('GitHub token cleared');
            provider.refresh();
        }
    });
    // Clear Cache command
    const clearCacheCommand = vscode.commands.registerCommand('kiroSteeringLoader.clearCache', async () => {
        cacheManager.clearAllCache();
        vscode.window.showInformationMessage('Cache cleared successfully');
        provider.refresh();
    });
    // Switch to Local Mode command
    const switchToLocalModeCommand = vscode.commands.registerCommand('kiroSteeringLoader.switchToLocalMode', async () => {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Local Templates Directory'
        });
        if (result && result[0]) {
            const config = vscode.workspace.getConfiguration('kiroSteeringLoader');
            // Clear GitHub configuration
            await config.update('repository', undefined, vscode.ConfigurationTarget.Global);
            // Set local path
            await config.update('templatesPath', result[0].fsPath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Switched to local mode');
            provider.refresh();
        }
    });
    // Switch to GitHub Mode command
    const switchToGitHubModeCommand = vscode.commands.registerCommand('kiroSteeringLoader.switchToGitHubMode', async () => {
        // Check if GitHub is already configured
        const repoConfig = configService.getRepositoryConfig();
        if (repoConfig) {
            vscode.window.showInformationMessage('Already using GitHub mode');
            return;
        }
        // Prompt to configure GitHub repository
        await vscode.commands.executeCommand('kiroSteeringLoader.configureGitHubRepository');
    });
    // Register all commands
    context.subscriptions.push(refreshCommand, forceRefreshCommand, loadTemplateCommand, setTemplatesPathCommand, configureGitHubRepoCommand, configureGitHubTokenCommand, clearGitHubTokenCommand, clearCacheCommand, switchToLocalModeCommand, switchToGitHubModeCommand, errorHandler);
}
function deactivate() {
    // Clean up sensitive data from memory
    // ErrorHandler is disposed via context.subscriptions
    // Other services will be garbage collected
    // No explicit cleanup needed as VS Code handles disposal
}
//# sourceMappingURL=extension.js.map
/**
 * FileSystemService - Handles file operations for loading templates
 * 
 * Manages file system operations for template loading with error handling
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LoadResult, OverwriteChoice } from '../types';
import { GitHubSteeringError, ErrorCode } from '../errors';

export class FileSystemService {
  /**
   * Loads a template into the workspace .kiro/steering directory
   * @param content - Template file content
   * @param filename - Target filename
   * @param workspacePath - Workspace root path
   * @returns Success status
   */
  async loadTemplate(content: string, filename: string, workspacePath: string): Promise<LoadResult> {
    try {
      // Ensure the steering directory exists
      await this.ensureSteeringDirectory(workspacePath);
      
      // Build the target file path
      const targetPath = path.join(workspacePath, '.kiro', 'steering', filename);
      
      // Check if file already exists
      if (await this.fileExists(targetPath)) {
        const choice = await this.promptOverwrite(filename);
        
        if (choice === 'cancel') {
          return {
            success: false,
            error: 'User cancelled overwrite'
          };
        }
      }
      
      // Write the file
      await fs.promises.writeFile(targetPath, content, 'utf8');
      
      return {
        success: true,
        filepath: targetPath
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new GitHubSteeringError(
            'Permission denied writing template file',
            ErrorCode.PERMISSION_DENIED,
            error,
            'Unable to write template file. Please check file permissions.'
          );
        }
        
        if (error.message.includes('ENOSPC')) {
          throw new GitHubSteeringError(
            'Disk full',
            ErrorCode.DISK_FULL,
            error,
            'Not enough disk space to write template file.'
          );
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensures .kiro/steering directory exists
   * @param workspacePath - Workspace root path
   */
  async ensureSteeringDirectory(workspacePath: string): Promise<void> {
    const steeringDir = path.join(workspacePath, '.kiro', 'steering');
    
    try {
      // Check if directory exists
      const exists = await this.directoryExists(steeringDir);
      
      if (!exists) {
        // Create directory recursively
        await fs.promises.mkdir(steeringDir, { recursive: true });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new GitHubSteeringError(
            'Permission denied creating directory',
            ErrorCode.PERMISSION_DENIED,
            error,
            'Unable to create .kiro/steering directory. Please check permissions.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Checks if a file already exists
   * @param filepath - Full file path to check
   * @returns True if file exists
   */
  async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.promises.access(filepath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a directory exists
   * @param dirpath - Full directory path to check
   * @returns True if directory exists
   */
  async directoryExists(dirpath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirpath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Prompts user for overwrite confirmation
   * @param filename - Name of existing file
   * @returns User's choice (overwrite, cancel)
   */
  async promptOverwrite(filename: string): Promise<OverwriteChoice> {
    const choice = await vscode.window.showWarningMessage(
      `File "${filename}" already exists. Do you want to overwrite it?`,
      { modal: true },
      'Overwrite',
      'Cancel'
    );
    
    return choice === 'Overwrite' ? 'overwrite' : 'cancel';
  }

  /**
   * Reads file content
   * @param filepath - Full file path to read
   * @returns File content as string
   */
  async readFile(filepath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filepath, 'utf8');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new GitHubSteeringError(
            'File not found',
            ErrorCode.INVALID_CONFIG,
            error,
            `File not found: ${filepath}`
          );
        }
        
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new GitHubSteeringError(
            'Permission denied reading file',
            ErrorCode.PERMISSION_DENIED,
            error,
            'Unable to read file. Please check file permissions.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Lists files in a directory
   * @param dirpath - Directory path
   * @param extension - Optional file extension filter (e.g., '.md')
   * @returns Array of filenames
   */
  async listFiles(dirpath: string, extension?: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(dirpath);
      
      if (extension) {
        return files.filter(file => file.endsWith(extension));
      }
      
      return files;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }
}

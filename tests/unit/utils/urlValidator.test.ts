/**
 * URL Validator Tests
 * 
 * Comprehensive tests for GitHub repository URL parsing and validation including:
 * - Full GitHub URL parsing (https://github.com/owner/repo)
 * - Short format parsing (owner/repo, owner/repo/path)
 * - GitHub name validation (alphanumeric, hyphens, no leading hyphen)
 * - Repository configuration validation
 * - Error handling for invalid formats and names
 * - Edge cases and special characters
 */

import { describe, it, expect } from 'vitest';
import { parseRepositoryUrl, parseRepositoryUrlStrict, validateRepositoryConfig } from '../../../src/utils/urlValidator';
import { GitHubSteeringError, ErrorCode } from '../../../src/errors';
import type { RepositoryConfig } from '../../../src/types';

describe('urlValidator', () => {
  describe('parseRepositoryUrl', () => {
    describe('full GitHub URL format', () => {
      it('should parse standard HTTPS GitHub URL', () => {
        const result = parseRepositoryUrl('https://github.com/microsoft/vscode');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          branch: 'main'
        });
      });

      it('should parse HTTP GitHub URL', () => {
        const result = parseRepositoryUrl('http://github.com/facebook/react');
        
        expect(result).toEqual({
          owner: 'facebook',
          repo: 'react',
          branch: 'main'
        });
      });

      it('should remove .git suffix from repository name', () => {
        const result = parseRepositoryUrl('https://github.com/nodejs/node.git');
        
        expect(result).toEqual({
          owner: 'nodejs',
          repo: 'node',
          branch: 'main'
        });
      });

      it('should handle URLs with additional path segments', () => {
        const result = parseRepositoryUrl('https://github.com/microsoft/vscode/tree/main/src');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          branch: 'main'
        });
      });

      it('should handle repository names with hyphens', () => {
        const result = parseRepositoryUrl('https://github.com/microsoft/vscode-extension-samples');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode-extension-samples',
          branch: 'main'
        });
      });

      it('should handle owner names with hyphens', () => {
        const result = parseRepositoryUrl('https://github.com/microsoft-samples/vscode-extension');
        
        expect(result).toEqual({
          owner: 'microsoft-samples',
          repo: 'vscode-extension',
          branch: 'main'
        });
      });

      it('should handle repository names with underscores', () => {
        const result = parseRepositoryUrl('https://github.com/owner/my_project');
        
        expect(result).toEqual({
          owner: 'owner',
          repo: 'my_project',
          branch: 'main'
        });
      });

      it('should handle repository names with periods', () => {
        const result = parseRepositoryUrl('https://github.com/dotnet/dotnet.core');
        
        expect(result).toEqual({
          owner: 'dotnet',
          repo: 'dotnet.core',
          branch: 'main'
        });
      });

      it('should handle owner names with underscores', () => {
        const result = parseRepositoryUrl('https://github.com/my_organization/project');
        
        expect(result).toEqual({
          owner: 'my_organization',
          repo: 'project',
          branch: 'main'
        });
      });

      it('should handle owner names with periods', () => {
        const result = parseRepositoryUrl('https://github.com/company.inc/project');
        
        expect(result).toEqual({
          owner: 'company.inc',
          repo: 'project',
          branch: 'main'
        });
      });

      it('should handle complex names with mixed valid characters', () => {
        const result = parseRepositoryUrl('https://github.com/my-org_2023/project.v2_beta-1');
        
        expect(result).toEqual({
          owner: 'my-org_2023',
          repo: 'project.v2_beta-1',
          branch: 'main'
        });
      });
    });

    describe('short format parsing', () => {
      it('should parse owner/repo format', () => {
        const result = parseRepositoryUrl('microsoft/vscode');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          branch: 'main'
        });
      });

      it('should parse owner/repo/path format', () => {
        const result = parseRepositoryUrl('microsoft/vscode/src/extensions');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          path: 'src/extensions',
          branch: 'main'
        });
      });

      it('should parse owner/repo/deep/nested/path format', () => {
        const result = parseRepositoryUrl('facebook/react/packages/react-dom/src');
        
        expect(result).toEqual({
          owner: 'facebook',
          repo: 'react',
          path: 'packages/react-dom/src',
          branch: 'main'
        });
      });

      it('should handle trailing slashes in path', () => {
        const result = parseRepositoryUrl('microsoft/vscode/src/');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          path: 'src',
          branch: 'main'
        });
      });

      it('should handle multiple trailing slashes', () => {
        const result = parseRepositoryUrl('microsoft/vscode/src///');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          path: 'src',
          branch: 'main'
        });
      });

      it('should handle empty path segments', () => {
        const result = parseRepositoryUrl('microsoft/vscode//src//extensions/');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          path: 'src/extensions',
          branch: 'main'
        });
      });

      it('should parse short format with underscores in names', () => {
        const result = parseRepositoryUrl('my_org/my_project');
        
        expect(result).toEqual({
          owner: 'my_org',
          repo: 'my_project',
          branch: 'main'
        });
      });

      it('should parse short format with periods in names', () => {
        const result = parseRepositoryUrl('company.inc/project.core');
        
        expect(result).toEqual({
          owner: 'company.inc',
          repo: 'project.core',
          branch: 'main'
        });
      });

      it('should parse short format with mixed valid characters', () => {
        const result = parseRepositoryUrl('my-org_2023/project.v2_beta-1/src/main');
        
        expect(result).toEqual({
          owner: 'my-org_2023',
          repo: 'project.v2_beta-1',
          path: 'src/main',
          branch: 'main'
        });
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading and trailing whitespace', () => {
        const result = parseRepositoryUrl('  microsoft/vscode  ');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          branch: 'main'
        });
      });

      it('should handle tabs and newlines', () => {
        const result = parseRepositoryUrl('\t\nmicrosoft/vscode\n\t');
        
        expect(result).toEqual({
          owner: 'microsoft',
          repo: 'vscode',
          branch: 'main'
        });
      });
    });

    describe('error handling', () => {
      it('should return null for empty URL', () => {
        const result = parseRepositoryUrl('');
        expect(result).toBeNull();
      });

      it('should return null for whitespace-only URL', () => {
        const result = parseRepositoryUrl('   ');
        expect(result).toBeNull();
      });

      it('should return null for single part URL', () => {
        const result = parseRepositoryUrl('microsoft');
        expect(result).toBeNull();
      });

      it('should return null for invalid owner name starting with hyphen', () => {
        const result = parseRepositoryUrl('-microsoft/vscode');
        expect(result).toBeNull();
      });

      it('should return null for invalid repo name starting with hyphen', () => {
        const result = parseRepositoryUrl('microsoft/-vscode');
        expect(result).toBeNull();
      });

      it('should return null for owner name with special characters', () => {
        const result = parseRepositoryUrl('micro$oft/vscode');
        expect(result).toBeNull();
      });

      it('should return null for repo name with special characters', () => {
        const result = parseRepositoryUrl('microsoft/vs@code');
        expect(result).toBeNull();
      });

      it('should return null for owner name starting with underscore', () => {
        const result = parseRepositoryUrl('_microsoft/vscode');
        expect(result).toBeNull();
      });

      it('should return null for repo name starting with underscore', () => {
        const result = parseRepositoryUrl('microsoft/_vscode');
        expect(result).toBeNull();
      });

      it('should return null for owner name starting with period', () => {
        const result = parseRepositoryUrl('.microsoft/vscode');
        expect(result).toBeNull();
      });

      it('should return null for repo name starting with period', () => {
        const result = parseRepositoryUrl('microsoft/.vscode');
        expect(result).toBeNull();
      });

      it('should return null for owner name ending with period', () => {
        const result = parseRepositoryUrl('microsoft./vscode');
        expect(result).toBeNull();
      });

      it('should return null for repo name ending with period', () => {
        const result = parseRepositoryUrl('microsoft/vscode.');
        expect(result).toBeNull();
      });

      it('should accept single character names', () => {
        const result = parseRepositoryUrl('a/b');
        expect(result).toEqual({
          owner: 'a',
          repo: 'b',
          branch: 'main'
        });
      });

      it('should accept single digit names', () => {
        const result = parseRepositoryUrl('1/2');
        expect(result).toEqual({
          owner: '1',
          repo: '2',
          branch: 'main'
        });
      });

      it('should return null for empty owner name', () => {
        const result = parseRepositoryUrl('/vscode');
        expect(result).toBeNull();
      });

      it('should return null for empty repo name', () => {
        const result = parseRepositoryUrl('microsoft/');
        expect(result).toBeNull();
      });
    });

    describe('parseRepositoryUrlStrict error handling', () => {
      it('should throw error for empty URL', () => {
        expect(() => parseRepositoryUrlStrict('')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository URL cannot be empty');
        }
      });

      it('should throw error for whitespace-only URL', () => {
        expect(() => parseRepositoryUrlStrict('   ')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('   ');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository URL cannot be empty');
        }
      });

      it('should throw error for single part URL', () => {
        expect(() => parseRepositoryUrlStrict('microsoft')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('microsoft');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository URL must be in format');
        }
      });

      it('should throw error for invalid owner name starting with hyphen', () => {
        expect(() => parseRepositoryUrlStrict('-microsoft/vscode')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('-microsoft/vscode');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Owner name contains invalid characters');
        }
      });

      it('should throw error for invalid repo name starting with hyphen', () => {
        expect(() => parseRepositoryUrlStrict('microsoft/-vscode')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('microsoft/-vscode');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository name contains invalid characters');
        }
      });

      it('should throw error for owner name with special characters', () => {
        expect(() => parseRepositoryUrlStrict('micro$oft/vscode')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('micro$oft/vscode');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Owner name contains invalid characters');
        }
      });

      it('should throw error for repo name with special characters', () => {
        expect(() => parseRepositoryUrlStrict('microsoft/vs@code')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('microsoft/vs@code');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository name contains invalid characters');
        }
      });

      it('should throw error for empty owner name', () => {
        expect(() => parseRepositoryUrlStrict('/vscode')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('/vscode');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Owner name contains invalid characters');
        }
      });

      it('should throw error for empty repo name', () => {
        expect(() => parseRepositoryUrlStrict('microsoft/')).toThrow(GitHubSteeringError);
        
        try {
          parseRepositoryUrlStrict('microsoft/');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubSteeringError);
          expect((error as GitHubSteeringError).code).toBe(ErrorCode.INVALID_CONFIG);
          expect((error as GitHubSteeringError).userMessage).toContain('Repository name contains invalid characters');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle numeric owner and repo names', () => {
        const result = parseRepositoryUrl('123/456');
        
        expect(result).toEqual({
          owner: '123',
          repo: '456',
          branch: 'main'
        });
      });

      it('should handle mixed alphanumeric names', () => {
        const result = parseRepositoryUrl('user123/repo456');
        
        expect(result).toEqual({
          owner: 'user123',
          repo: 'repo456',
          branch: 'main'
        });
      });

      it('should handle names ending with hyphens', () => {
        const result = parseRepositoryUrl('microsoft-/vscode-');
        
        expect(result).toEqual({
          owner: 'microsoft-',
          repo: 'vscode-',
          branch: 'main'
        });
      });

      it('should handle single character names', () => {
        const result = parseRepositoryUrl('a/b');
        
        expect(result).toEqual({
          owner: 'a',
          repo: 'b',
          branch: 'main'
        });
      });

      it('should handle very long names', () => {
        const longName = 'a'.repeat(100);
        const result = parseRepositoryUrl(`${longName}/${longName}`);
        
        expect(result).toEqual({
          owner: longName,
          repo: longName,
          branch: 'main'
        });
      });
    });
  });

  describe('validateRepositoryConfig', () => {
    it('should validate valid repository config', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft',
        repo: 'vscode',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(true);
    });

    it('should validate config with path', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft',
        repo: 'vscode',
        path: 'src/extensions',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(true);
    });

    it('should validate config with hyphens in names', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft-samples',
        repo: 'vscode-extension-samples',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(true);
    });

    it('should reject config with missing owner', () => {
      const config = {
        repo: 'vscode',
        branch: 'main'
      } as RepositoryConfig;
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with missing repo', () => {
      const config = {
        owner: 'microsoft',
        branch: 'main'
      } as RepositoryConfig;
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with empty owner', () => {
      const config: RepositoryConfig = {
        owner: '',
        repo: 'vscode',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with empty repo', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft',
        repo: '',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with invalid owner name', () => {
      const config: RepositoryConfig = {
        owner: '-microsoft',
        repo: 'vscode',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with invalid repo name', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft',
        repo: 'vs@code',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with special characters in owner', () => {
      const config: RepositoryConfig = {
        owner: 'micro$oft',
        repo: 'vscode',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });

    it('should reject config with special characters in repo', () => {
      const config: RepositoryConfig = {
        owner: 'microsoft',
        repo: 'vs@code',
        branch: 'main'
      };
      
      expect(validateRepositoryConfig(config)).toBe(false);
    });
  });
});
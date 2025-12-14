/**
 * Display Utils Tests
 * 
 * Comprehensive tests for display formatting utilities including:
 * - Filename extension removal
 * - Tooltip generation with file size
 * - Human-readable file size formatting
 * - Display name formatting from filenames
 * - Configuration source indicator formatting
 */

import { describe, it, expect } from 'vitest';
import {
  removeExtension,
  generateTooltip,
  formatFileSize,
  formatDisplayName,
  formatConfigurationSource
} from '../../../src/utils/displayUtils';
import type { TemplateMetadata } from '../../../src/types';

describe('displayUtils', () => {
  describe('removeExtension', () => {
    it('should remove .md extension from filename', () => {
      expect(removeExtension('template.md')).toBe('template');
      expect(removeExtension('my-component.md')).toBe('my-component');
      expect(removeExtension('nested-file.md')).toBe('nested-file');
    });

    it('should handle filenames without .md extension', () => {
      expect(removeExtension('template.txt')).toBe('template.txt');
      expect(removeExtension('README')).toBe('README');
      expect(removeExtension('config.json')).toBe('config.json');
    });

    it('should handle empty strings', () => {
      expect(removeExtension('')).toBe('');
    });

    it('should handle filenames ending with .md but containing other dots', () => {
      expect(removeExtension('file.name.md')).toBe('file.name');
      expect(removeExtension('v1.2.3.md')).toBe('v1.2.3');
    });

    it('should handle edge cases', () => {
      expect(removeExtension('.md')).toBe('');
      expect(removeExtension('md')).toBe('md');
      expect(removeExtension('.hidden.md')).toBe('.hidden');
    });
  });

  describe('generateTooltip', () => {
    const createMockMetadata = (filename: string, size: number): TemplateMetadata => ({
      name: filename.replace('.md', ''),
      filename,
      path: `path/to/${filename}`,
      sha: 'abc123',
      size,
      downloadUrl: `https://example.com/${filename}`,
      type: 'file'
    });

    it('should generate tooltip with filename and size in KB', () => {
      const metadata = createMockMetadata('template.md', 1024);
      const result = generateTooltip(metadata);
      expect(result).toBe('template.md (1.00 KB)');
    });

    it('should format file sizes correctly', () => {
      const smallFile = createMockMetadata('small.md', 512);
      expect(generateTooltip(smallFile)).toBe('small.md (0.50 KB)');

      const largeFile = createMockMetadata('large.md', 2048);
      expect(generateTooltip(largeFile)).toBe('large.md (2.00 KB)');

      const veryLargeFile = createMockMetadata('huge.md', 1536);
      expect(generateTooltip(veryLargeFile)).toBe('huge.md (1.50 KB)');
    });

    it('should handle zero-byte files', () => {
      const emptyFile = createMockMetadata('empty.md', 0);
      expect(generateTooltip(emptyFile)).toBe('empty.md (0.00 KB)');
    });

    it('should handle very small files', () => {
      const tinyFile = createMockMetadata('tiny.md', 1);
      expect(generateTooltip(tinyFile)).toBe('tiny.md (0.00 KB)');
    });

    it('should handle files with special characters in names', () => {
      const specialFile = createMockMetadata('special-file_name.md', 1024);
      expect(generateTooltip(specialFile)).toBe('special-file_name.md (1.00 KB)');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1.00 B');
      expect(formatFileSize(512)).toBe('512.00 B');
      expect(formatFileSize(1023)).toBe('1023.00 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(2048)).toBe('2.00 KB');
      expect(formatFileSize(1048575)).toBe('1024.00 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB'); // 1024 * 1024
      expect(formatFileSize(1572864)).toBe('1.50 MB'); // 1.5 MB
      expect(formatFileSize(2097152)).toBe('2.00 MB'); // 2 MB
      expect(formatFileSize(1073741823)).toBe('1024.00 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB'); // 1024^3
      expect(formatFileSize(1610612736)).toBe('1.50 GB'); // 1.5 GB
      expect(formatFileSize(2147483648)).toBe('2.00 GB'); // 2 GB
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(1025)).toBe('1.00 KB');
      expect(formatFileSize(999)).toBe('999.00 B');
    });
  });

  describe('formatDisplayName', () => {
    it('should format basic filenames', () => {
      expect(formatDisplayName('template.md')).toBe('Template');
      expect(formatDisplayName('component.md')).toBe('Component');
    });

    it('should handle hyphenated names', () => {
      expect(formatDisplayName('my-component.md')).toBe('My Component');
      expect(formatDisplayName('react-hook.md')).toBe('React Hook');
      expect(formatDisplayName('api-service-client.md')).toBe('Api Service Client');
    });

    it('should handle underscored names', () => {
      expect(formatDisplayName('my_component.md')).toBe('My Component');
      expect(formatDisplayName('react_hook.md')).toBe('React Hook');
      expect(formatDisplayName('api_service_client.md')).toBe('Api Service Client');
    });

    it('should handle mixed separators', () => {
      expect(formatDisplayName('my-component_hook.md')).toBe('My Component Hook');
      expect(formatDisplayName('react_hook-service.md')).toBe('React Hook Service');
    });

    it('should handle single words', () => {
      expect(formatDisplayName('readme.md')).toBe('Readme');
      expect(formatDisplayName('index.md')).toBe('Index');
    });

    it('should handle files without extensions', () => {
      expect(formatDisplayName('my-component')).toBe('My Component');
      expect(formatDisplayName('README')).toBe('README');
    });

    it('should handle empty strings', () => {
      expect(formatDisplayName('')).toBe('');
    });

    it('should handle multiple consecutive separators', () => {
      expect(formatDisplayName('my--component.md')).toBe('My  Component');
      expect(formatDisplayName('my__component.md')).toBe('My  Component');
    });

    it('should preserve capitalization patterns', () => {
      expect(formatDisplayName('API-client.md')).toBe('API Client');
      expect(formatDisplayName('HTTP-service.md')).toBe('HTTP Service');
    });
  });

  describe('formatConfigurationSource', () => {
    describe('GitHub source', () => {
      it('should format GitHub source with owner and repo', () => {
        const result = formatConfigurationSource('github', {
          owner: 'microsoft',
          repo: 'vscode'
        });
        expect(result).toBe('GitHub: microsoft/vscode');
      });

      it('should format GitHub source with owner, repo, and path', () => {
        const result = formatConfigurationSource('github', {
          owner: 'microsoft',
          repo: 'vscode',
          path: 'templates'
        });
        expect(result).toBe('GitHub: microsoft/vscode/templates');
      });

      it('should handle GitHub source without details', () => {
        const result = formatConfigurationSource('github');
        expect(result).toBe('GitHub Repository');
      });

      it('should handle GitHub source with incomplete details', () => {
        const result1 = formatConfigurationSource('github', { owner: 'microsoft' });
        expect(result1).toBe('GitHub Repository');

        const result2 = formatConfigurationSource('github', { repo: 'vscode' });
        expect(result2).toBe('GitHub Repository');
      });

      it('should handle empty path', () => {
        const result = formatConfigurationSource('github', {
          owner: 'microsoft',
          repo: 'vscode',
          path: ''
        });
        expect(result).toBe('GitHub: microsoft/vscode');
      });
    });

    describe('Local source', () => {
      it('should format local source with path', () => {
        const result = formatConfigurationSource('local', {
          localPath: '/home/user/templates'
        });
        expect(result).toBe('Local: /home/user/templates');
      });

      it('should format local source with Windows path', () => {
        const result = formatConfigurationSource('local', {
          localPath: 'C:\\Users\\User\\Templates'
        });
        expect(result).toBe('Local: C:\\Users\\User\\Templates');
      });

      it('should handle local source without path', () => {
        const result = formatConfigurationSource('local');
        expect(result).toBe('Local Filesystem');
      });

      it('should handle local source with empty path', () => {
        const result = formatConfigurationSource('local', { localPath: '' });
        expect(result).toBe('Local Filesystem');
      });
    });

    describe('No configuration', () => {
      it('should format none source', () => {
        const result = formatConfigurationSource('none');
        expect(result).toBe('No Configuration');
      });

      it('should ignore details for none source', () => {
        const result = formatConfigurationSource('none', {
          owner: 'test',
          repo: 'test',
          localPath: '/test'
        });
        expect(result).toBe('No Configuration');
      });
    });

    describe('Unknown source', () => {
      it('should handle unknown source types', () => {
        // @ts-expect-error Testing invalid source type
        const result = formatConfigurationSource('unknown');
        expect(result).toBe('Unknown Source');
      });
    });

    describe('Edge cases', () => {
      it('should handle special characters in paths', () => {
        const result1 = formatConfigurationSource('github', {
          owner: 'user-name',
          repo: 'repo_name',
          path: 'path/with-special_chars'
        });
        expect(result1).toBe('GitHub: user-name/repo_name/path/with-special_chars');

        const result2 = formatConfigurationSource('local', {
          localPath: '/path/with spaces/and-special_chars'
        });
        expect(result2).toBe('Local: /path/with spaces/and-special_chars');
      });

      it('should handle very long paths', () => {
        const longPath = 'very/long/path/that/goes/on/and/on/with/many/segments';
        const result = formatConfigurationSource('github', {
          owner: 'owner',
          repo: 'repo',
          path: longPath
        });
        expect(result).toBe(`GitHub: owner/repo/${longPath}`);
      });
    });
  });
});
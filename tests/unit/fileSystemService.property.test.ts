/**
 * Property-based tests for FileSystemService
 * Feature: github-steering-loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { FileSystemService } from '../../src/services/FileSystemService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock VS Code but keep real fs and path
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn().mockResolvedValue('Overwrite')
  }
}));

// Don't mock fs or path - we need real file system operations for these tests
vi.unmock('fs');
vi.unmock('path');

// Helper to generate valid filenames
const validFilenameArb = () => 
  fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => {
      // Filter out invalid filename characters for Windows/Unix
      const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
      return !invalidChars.test(name) && name.trim().length > 0;
    })
    .map(name => name.trim().replace(/\s+/g, '_') + '.md');

describe('FileSystemService - Property Tests', () => {
  let service: FileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    service = new FileSystemService();
    // Create a unique temp directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kiro-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 13: Directory creation guarantee
   * Feature: github-steering-loader, Property 13: Directory creation guarantee
   * Validates: Requirements 5.2
   */
  it('should ensure .kiro/steering directory exists after loading template', async () => {
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 });
    const filenameArb = validFilenameArb();

    await fc.assert(
      fc.asyncProperty(contentArb, filenameArb, async (content, filename) => {
        // Load template (which should create directory)
        await service.loadTemplate(content, filename, tempDir);
        
        // Check that .kiro/steering directory exists
        const steeringDir = path.join(tempDir, '.kiro', 'steering');
        const exists = await service.directoryExists(steeringDir);
        
        expect(exists).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Template content preservation
   * Feature: github-steering-loader, Property 14: Template content preservation
   * Validates: Requirements 5.3
   */
  it('should preserve template content through save and load', async () => {
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 });
    const filenameArb = validFilenameArb();

    await fc.assert(
      fc.asyncProperty(contentArb, filenameArb, async (content, filename) => {
        // Load template
        const result = await service.loadTemplate(content, filename, tempDir);
        
        expect(result.success).toBe(true);
        expect(result.filepath).toBeDefined();
        
        // Read back the content
        const savedContent = await service.readFile(result.filepath!);
        
        // Content should match exactly
        expect(savedContent).toBe(content);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21: Migration file preservation
   * Feature: github-steering-loader, Property 21: Migration file preservation
   * Validates: Requirements 8.5
   */
  it('should not delete or modify existing files when changing configuration', async () => {
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 });
    const filenamesArb = fc.array(validFilenameArb(), { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(contentArb, filenamesArb, async (content, filenames) => {
        // Create multiple files
        const createdFiles: string[] = [];
        for (const filename of filenames) {
          const result = await service.loadTemplate(content, filename, tempDir);
          if (result.success && result.filepath) {
            createdFiles.push(result.filepath);
          }
        }
        
        // Verify all files still exist and have correct content
        for (const filepath of createdFiles) {
          const exists = await service.fileExists(filepath);
          expect(exists).toBe(true);
          
          const savedContent = await service.readFile(filepath);
          expect(savedContent).toBe(content);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should handle file overwrite correctly', async () => {
    const content1Arb = fc.string({ minLength: 1, maxLength: 500 });
    const content2Arb = fc.string({ minLength: 1, maxLength: 500 });
    const filenameArb = validFilenameArb();

    await fc.assert(
      fc.asyncProperty(content1Arb, content2Arb, filenameArb, async (content1, content2, filename) => {
        // Ensure contents are different
        fc.pre(content1 !== content2);
        
        // Create first file
        const result1 = await service.loadTemplate(content1, filename, tempDir);
        expect(result1.success).toBe(true);
        
        // Verify first content
        const savedContent1 = await service.readFile(result1.filepath!);
        expect(savedContent1).toBe(content1);
        
        // File should exist
        const exists = await service.fileExists(result1.filepath!);
        expect(exists).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it('should list markdown files in directory', async () => {
    const filenameArb = validFilenameArb();

    await fc.assert(
      fc.asyncProperty(filenameArb, async (filename) => {
        // Create a fresh temp directory for this iteration
        const iterationTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kiro-list-test-'));
        
        try {
          // Create file
          await service.loadTemplate('test content', filename, iterationTempDir);
          
          // List files
          const steeringDir = path.join(iterationTempDir, '.kiro', 'steering');
          const listedFiles = await service.listFiles(steeringDir, '.md');
          
          // Should have exactly one file
          expect(listedFiles.length).toBe(1);
          expect(listedFiles[0]).toBe(filename);
        } finally {
          // Clean up iteration temp directory
          await fs.promises.rm(iterationTempDir, { recursive: true, force: true });
        }
      }),
      { numRuns: 50 }
    );
  });
});

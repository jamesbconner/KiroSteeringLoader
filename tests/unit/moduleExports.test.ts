/**
 * Unit tests for module exports and index files
 * Tests proper module structure, export completeness, and import resolution
 * Requirements: Module Architecture, Export Contracts
 */

import { describe, it, expect } from 'vitest';

describe('Module Exports and Index Files', () => {
  describe('Services Index Exports', () => {
    it('should export all service classes from services index', async () => {
      const servicesIndex = await import('../../src/services/index');

      // Verify all expected services are exported
      expect(servicesIndex.ConfigurationService).toBeDefined();
      expect(servicesIndex.CacheManager).toBeDefined();
      expect(servicesIndex.GitHubRepositoryService).toBeDefined();
      expect(servicesIndex.FileSystemService).toBeDefined();

      // Verify exports are constructors/classes
      expect(typeof servicesIndex.ConfigurationService).toBe('function');
      expect(typeof servicesIndex.CacheManager).toBe('function');
      expect(typeof servicesIndex.GitHubRepositoryService).toBe('function');
      expect(typeof servicesIndex.FileSystemService).toBe('function');
    });

    it('should allow instantiation of exported service classes', async () => {
      const { ConfigurationService, CacheManager, GitHubRepositoryService, FileSystemService } = 
        await import('../../src/services/index');

      // Test that classes can be instantiated (with mock context)
      const mockContext = {} as any;

      expect(() => new ConfigurationService(mockContext)).not.toThrow();
      expect(() => new CacheManager()).not.toThrow();
      expect(() => new GitHubRepositoryService()).not.toThrow();
      expect(() => new FileSystemService()).not.toThrow();
    });

    it('should maintain proper class inheritance and prototypes', async () => {
      const { ConfigurationService, CacheManager } = await import('../../src/services/index');

      const mockContext = {} as any;
      const configService = new ConfigurationService(mockContext);
      const cacheManager = new CacheManager();

      expect(configService).toBeInstanceOf(ConfigurationService);
      expect(cacheManager).toBeInstanceOf(CacheManager);
      expect(configService.constructor.name).toBe('ConfigurationService');
      expect(cacheManager.constructor.name).toBe('CacheManager');
    });

    it('should not export internal implementation details', async () => {
      const servicesIndex = await import('../../src/services/index');
      const exportedKeys = Object.keys(servicesIndex);

      // Should only export the main service classes
      expect(exportedKeys).toEqual([
        'ConfigurationService',
        'CacheManager', 
        'GitHubRepositoryService',
        'FileSystemService'
      ]);

      // Should not export internal helpers or private classes
      expect(exportedKeys).not.toContain('ErrorHandler'); // This is separate
      expect(exportedKeys).not.toContain('default');
    });
  });

  describe('Utils Index Exports', () => {
    it('should export all utility functions from utils index', async () => {
      const utilsIndex = await import('../../src/utils/index');

      // Verify URL validator exports
      expect(utilsIndex.parseRepositoryUrl).toBeDefined();
      expect(utilsIndex.validateRepositoryConfig).toBeDefined();

      // Verify display utils exports
      expect(utilsIndex.removeExtension).toBeDefined();
      expect(utilsIndex.generateTooltip).toBeDefined();
      expect(utilsIndex.formatFileSize).toBeDefined();
      expect(utilsIndex.formatDisplayName).toBeDefined();
      expect(utilsIndex.formatConfigurationSource).toBeDefined();

      // Verify front matter parser exports
      expect(utilsIndex.parseFrontMatter).toBeDefined();
      expect(utilsIndex.extractDisplayMetadata).toBeDefined();

      // Verify tree builder exports
      expect(utilsIndex.buildTreeStructure).toBeDefined();
      expect(utilsIndex.flattenTree).toBeDefined();
      expect(utilsIndex.filterByDirectory).toBeDefined();
      expect(utilsIndex.filterByTag).toBeDefined();
      expect(utilsIndex.convertToEnhancedItems).toBeDefined();
      expect(utilsIndex.getDirectoryPaths).toBeDefined();
    });

    it('should export functions that are callable', async () => {
      const utilsIndex = await import('../../src/utils/index');

      // Test URL validator functions
      expect(typeof utilsIndex.parseRepositoryUrl).toBe('function');
      expect(typeof utilsIndex.validateRepositoryConfig).toBe('function');

      // Test display utils functions
      expect(typeof utilsIndex.removeExtension).toBe('function');
      expect(typeof utilsIndex.formatFileSize).toBe('function');

      // Test front matter parser functions
      expect(typeof utilsIndex.parseFrontMatter).toBe('function');
      expect(typeof utilsIndex.extractDisplayMetadata).toBe('function');

      // Test tree builder functions
      expect(typeof utilsIndex.buildTreeStructure).toBe('function');
      expect(typeof utilsIndex.flattenTree).toBe('function');
    });

    it('should allow direct function calls from index exports', async () => {
      const { removeExtension, formatFileSize, parseRepositoryUrl } = 
        await import('../../src/utils/index');

      // Test that functions work when called through index
      expect(removeExtension('test.md')).toBe('test');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      
      const repoConfig = parseRepositoryUrl('owner/repo');
      expect(repoConfig.owner).toBe('owner');
      expect(repoConfig.repo).toBe('repo');
    });

    it('should maintain function signatures and behavior through re-exports', async () => {
      // Import from index
      const { parseFrontMatter: indexParseFrontMatter } = await import('../../src/utils/index');
      
      // Import directly from module
      const { parseFrontMatter: directParseFrontMatter } = await import('../../src/utils/frontMatterParser');

      const testContent = '---\ntitle: Test\n---\nContent';
      
      const indexResult = indexParseFrontMatter(testContent);
      const directResult = directParseFrontMatter(testContent);

      expect(indexResult).toEqual(directResult);
      expect(indexResult.metadata.title).toBe('Test');
      expect(indexResult.content).toBe('Content');
    });

    it('should not create naming conflicts in exports', async () => {
      const utilsIndex = await import('../../src/utils/index');
      const exportedNames = Object.keys(utilsIndex);

      // Check for duplicate names
      const uniqueNames = new Set(exportedNames);
      expect(uniqueNames.size).toBe(exportedNames.length);

      // Verify no unexpected exports
      expect(exportedNames).not.toContain('default');
      expect(exportedNames).not.toContain('__esModule');
    });
  });

  describe('Cross-Module Import Resolution', () => {
    it('should allow importing services and utils together', async () => {
      const [servicesModule, utilsModule] = await Promise.all([
        import('../../src/services/index'),
        import('../../src/utils/index')
      ]);

      // Should be able to use both together
      const mockContext = {} as any;
      const configService = new servicesModule.ConfigurationService(mockContext);
      const displayName = utilsModule.formatDisplayName('test.md');

      expect(configService).toBeDefined();
      expect(displayName).toBe('Test');
    });

    it('should maintain proper module boundaries', async () => {
      const servicesIndex = await import('../../src/services/index');
      const utilsIndex = await import('../../src/utils/index');

      // Services should not export utility functions
      expect('parseRepositoryUrl' in servicesIndex).toBe(false);
      expect('formatFileSize' in servicesIndex).toBe(false);

      // Utils should not export service classes
      expect('ConfigurationService' in utilsIndex).toBe(false);
      expect('CacheManager' in utilsIndex).toBe(false);
    });

    it('should support tree-shaking through named exports', async () => {
      // Import only specific functions
      const { removeExtension } = await import('../../src/utils/index');
      const { ConfigurationService } = await import('../../src/services/index');

      expect(removeExtension).toBeDefined();
      expect(ConfigurationService).toBeDefined();

      // Functions should work independently
      expect(removeExtension('example.md')).toBe('example');
    });
  });

  describe('Module Loading Performance', () => {
    it('should load services index without errors', async () => {
      const startTime = performance.now();
      
      await import('../../src/services/index');
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(100); // Should load quickly
    });

    it('should load utils index without errors', async () => {
      const startTime = performance.now();
      
      await import('../../src/utils/index');
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(100); // Should load quickly
    });

    it('should handle concurrent module imports', async () => {
      const importPromises = [
        import('../../src/services/index'),
        import('../../src/utils/index'),
        import('../../src/services/index'), // Duplicate to test caching
        import('../../src/utils/index')     // Duplicate to test caching
      ];

      const results = await Promise.all(importPromises);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toBe(results[2]); // Same module instance
      expect(results[1]).toBe(results[3]); // Same module instance
    });
  });

  describe('Export Consistency and Documentation', () => {
    it('should have consistent export patterns across modules', async () => {
      const servicesIndex = await import('../../src/services/index');
      const utilsIndex = await import('../../src/utils/index');

      // Services should export classes (PascalCase)
      const serviceNames = Object.keys(servicesIndex);
      for (const name of serviceNames) {
        expect(name[0]).toMatch(/[A-Z]/); // Should start with capital letter
        expect(name).not.toContain('_'); // Should not use snake_case
      }

      // Utils should export functions (camelCase)
      const utilNames = Object.keys(utilsIndex);
      for (const name of utilNames) {
        expect(name[0]).toMatch(/[a-z]/); // Should start with lowercase letter
        expect(name).not.toContain('_'); // Should not use snake_case
      }
    });

    it('should maintain stable export interfaces', async () => {
      // This test ensures that the public API remains stable
      const servicesIndex = await import('../../src/services/index');
      const utilsIndex = await import('../../src/utils/index');

      // Core services that should always be available
      const expectedServices = [
        'ConfigurationService',
        'CacheManager',
        'GitHubRepositoryService',
        'FileSystemService'
      ];

      // Core utilities that should always be available
      const expectedUtils = [
        'parseRepositoryUrl',
        'validateRepositoryConfig',
        'removeExtension',
        'formatFileSize',
        'parseFrontMatter',
        'buildTreeStructure'
      ];

      for (const service of expectedServices) {
        expect(servicesIndex[service]).toBeDefined();
      }

      for (const util of expectedUtils) {
        expect(utilsIndex[util]).toBeDefined();
      }
    });
  });
});
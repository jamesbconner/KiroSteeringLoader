/**
 * Errors Module Tests
 * 
 * Comprehensive tests for error handling including:
 * - ErrorCode enum values and completeness
 * - GitHubSteeringError class functionality
 * - Error message mapping and user-friendly messages
 * - Error serialization and stack trace handling
 * - Edge cases and error propagation
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  GitHubSteeringError,
  getUserMessage
} from '../../src/errors';

describe('errors', () => {
  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      const expectedCodes = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'REPOSITORY_NOT_FOUND',
        'UNAUTHORIZED',
        'RATE_LIMIT_EXCEEDED',
        'FORBIDDEN',
        'PERMISSION_DENIED',
        'DISK_FULL',
        'FILE_EXISTS',
        'INVALID_CONFIG',
        'MISSING_CONFIG',
        'CACHE_CORRUPTED',
        'CACHE_QUOTA_EXCEEDED'
      ];

      for (const code of expectedCodes) {
        expect(ErrorCode).toHaveProperty(code);
        expect(typeof ErrorCode[code as keyof typeof ErrorCode]).toBe('string');
      }
    });

    it('should have string values matching the keys', () => {
      expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCode.REPOSITORY_NOT_FOUND).toBe('REPOSITORY_NOT_FOUND');
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(ErrorCode.DISK_FULL).toBe('DISK_FULL');
      expect(ErrorCode.FILE_EXISTS).toBe('FILE_EXISTS');
      expect(ErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIG');
      expect(ErrorCode.MISSING_CONFIG).toBe('MISSING_CONFIG');
      expect(ErrorCode.CACHE_CORRUPTED).toBe('CACHE_CORRUPTED');
      expect(ErrorCode.CACHE_QUOTA_EXCEEDED).toBe('CACHE_QUOTA_EXCEEDED');
    });

    it('should be organized by category', () => {
      // Network errors
      expect(ErrorCode.NETWORK_ERROR).toBeDefined();
      expect(ErrorCode.TIMEOUT).toBeDefined();

      // GitHub API errors
      expect(ErrorCode.REPOSITORY_NOT_FOUND).toBeDefined();
      expect(ErrorCode.UNAUTHORIZED).toBeDefined();
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBeDefined();
      expect(ErrorCode.FORBIDDEN).toBeDefined();

      // File System errors
      expect(ErrorCode.PERMISSION_DENIED).toBeDefined();
      expect(ErrorCode.DISK_FULL).toBeDefined();
      expect(ErrorCode.FILE_EXISTS).toBeDefined();

      // Configuration errors
      expect(ErrorCode.INVALID_CONFIG).toBeDefined();
      expect(ErrorCode.MISSING_CONFIG).toBeDefined();

      // Cache errors
      expect(ErrorCode.CACHE_CORRUPTED).toBeDefined();
      expect(ErrorCode.CACHE_QUOTA_EXCEEDED).toBeDefined();
    });
  });

  describe('GitHubSteeringError', () => {
    it('should create error with message and code', () => {
      const error = new GitHubSteeringError(
        'Test error message',
        ErrorCode.NETWORK_ERROR
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.name).toBe('GitHubSteeringError');
      expect(error.details).toBeUndefined();
      expect(error.userMessage).toBeUndefined();
    });

    it('should create error with all parameters', () => {
      const details = { statusCode: 404, url: 'https://api.github.com/repos/test/test' };
      const userMessage = 'Custom user message';

      const error = new GitHubSteeringError(
        'API request failed',
        ErrorCode.REPOSITORY_NOT_FOUND,
        details,
        userMessage
      );

      expect(error.message).toBe('API request failed');
      expect(error.code).toBe(ErrorCode.REPOSITORY_NOT_FOUND);
      expect(error.details).toEqual(details);
      expect(error.userMessage).toBe(userMessage);
      expect(error.name).toBe('GitHubSteeringError');
    });

    it('should be instanceof Error and GitHubSteeringError', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.INVALID_CONFIG
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubSteeringError);
    });

    it('should have proper stack trace', () => {
      const error = new GitHubSteeringError(
        'Test error',
        ErrorCode.NETWORK_ERROR
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('GitHubSteeringError');
      expect(error.stack).toContain('Test error');
    });

    it('should handle different detail types', () => {
      const stringDetails = 'Simple string details';
      const error1 = new GitHubSteeringError(
        'Error with string details',
        ErrorCode.TIMEOUT,
        stringDetails
      );
      expect(error1.details).toBe(stringDetails);

      const objectDetails = { 
        timeout: 5000, 
        retries: 3, 
        lastAttempt: new Date().toISOString() 
      };
      const error2 = new GitHubSteeringError(
        'Error with object details',
        ErrorCode.TIMEOUT,
        objectDetails
      );
      expect(error2.details).toEqual(objectDetails);

      const numberDetails = 404;
      const error3 = new GitHubSteeringError(
        'Error with number details',
        ErrorCode.REPOSITORY_NOT_FOUND,
        numberDetails
      );
      expect(error3.details).toBe(numberDetails);
    });

    it('should handle null and undefined details', () => {
      const error1 = new GitHubSteeringError(
        'Error with null details',
        ErrorCode.NETWORK_ERROR,
        null
      );
      expect(error1.details).toBeNull();

      const error2 = new GitHubSteeringError(
        'Error with undefined details',
        ErrorCode.NETWORK_ERROR,
        undefined
      );
      expect(error2.details).toBeUndefined();
    });

    it('should have accessible properties for serialization', () => {
      const error = new GitHubSteeringError(
        'Serializable error',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { limit: 5000, remaining: 0 },
        'Rate limit exceeded'
      );

      // Properties are accessible directly even if not enumerable
      expect(error.message).toBe('Serializable error');
      expect(error.name).toBe('GitHubSteeringError');
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.details).toEqual({ limit: 5000, remaining: 0 });
      expect(error.userMessage).toBe('Rate limit exceeded');

      // Custom serialization would need to be implemented if needed
      const customSerialized = {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        userMessage: error.userMessage
      };

      expect(customSerialized.message).toBe('Serializable error');
      expect(customSerialized.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('getUserMessage', () => {
    describe('Network errors', () => {
      it('should return appropriate message for network error', () => {
        const message = getUserMessage(ErrorCode.NETWORK_ERROR);
        expect(message).toBe('Unable to connect to GitHub. Please check your internet connection.');
      });

      it('should return appropriate message for timeout', () => {
        const message = getUserMessage(ErrorCode.TIMEOUT);
        expect(message).toBe('Request to GitHub timed out. Please try again.');
      });
    });

    describe('GitHub API errors', () => {
      it('should return appropriate message for repository not found', () => {
        const message = getUserMessage(ErrorCode.REPOSITORY_NOT_FOUND);
        expect(message).toBe('Repository not found. Please check the repository URL and ensure it exists.');
      });

      it('should return appropriate message for unauthorized', () => {
        const message = getUserMessage(ErrorCode.UNAUTHORIZED);
        expect(message).toBe('Authentication failed. Please check your GitHub token.');
      });

      it('should return appropriate message for rate limit exceeded', () => {
        const message = getUserMessage(ErrorCode.RATE_LIMIT_EXCEEDED);
        expect(message).toBe('GitHub API rate limit exceeded. Please wait or configure an authentication token.');
      });

      it('should return appropriate message for forbidden', () => {
        const message = getUserMessage(ErrorCode.FORBIDDEN);
        expect(message).toBe('Access forbidden. You may not have permission to access this repository.');
      });
    });

    describe('File system errors', () => {
      it('should return appropriate message for permission denied', () => {
        const message = getUserMessage(ErrorCode.PERMISSION_DENIED);
        expect(message).toBe('Permission denied. Unable to write to the file system.');
      });

      it('should return appropriate message for disk full', () => {
        const message = getUserMessage(ErrorCode.DISK_FULL);
        expect(message).toBe('Disk is full. Please free up space and try again.');
      });

      it('should return appropriate message for file exists', () => {
        const message = getUserMessage(ErrorCode.FILE_EXISTS);
        expect(message).toBe('File already exists. Please choose whether to overwrite.');
      });
    });

    describe('Configuration errors', () => {
      it('should return appropriate message for invalid config', () => {
        const message = getUserMessage(ErrorCode.INVALID_CONFIG);
        expect(message).toBe('Invalid configuration. Please check your repository settings.');
      });

      it('should return appropriate message for missing config', () => {
        const message = getUserMessage(ErrorCode.MISSING_CONFIG);
        expect(message).toBe('No configuration found. Please configure a GitHub repository or local path.');
      });
    });

    describe('Cache errors', () => {
      it('should return appropriate message for cache corrupted', () => {
        const message = getUserMessage(ErrorCode.CACHE_CORRUPTED);
        expect(message).toBe('Cache data is corrupted. Clearing cache and fetching fresh data.');
      });

      it('should return appropriate message for cache quota exceeded', () => {
        const message = getUserMessage(ErrorCode.CACHE_QUOTA_EXCEEDED);
        expect(message).toBe('Cache storage quota exceeded. Clearing old cache entries.');
      });
    });

    describe('Unknown error codes', () => {
      it('should return default message for unknown error code', () => {
        // @ts-expect-error Testing invalid error code
        const message = getUserMessage('UNKNOWN_ERROR_CODE');
        expect(message).toBe('An unexpected error occurred.');
      });

      it('should handle null and undefined error codes', () => {
        // @ts-expect-error Testing invalid error code
        const message1 = getUserMessage(null);
        expect(message1).toBe('An unexpected error occurred.');

        // @ts-expect-error Testing invalid error code
        const message2 = getUserMessage(undefined);
        expect(message2).toBe('An unexpected error occurred.');
      });
    });

    describe('Details parameter', () => {
      it('should ignore details parameter for all error codes', () => {
        const details = { extra: 'information', code: 500 };
        
        const message1 = getUserMessage(ErrorCode.NETWORK_ERROR, details);
        expect(message1).toBe('Unable to connect to GitHub. Please check your internet connection.');

        const message2 = getUserMessage(ErrorCode.REPOSITORY_NOT_FOUND, details);
        expect(message2).toBe('Repository not found. Please check the repository URL and ensure it exists.');

        const message3 = getUserMessage(ErrorCode.INVALID_CONFIG, details);
        expect(message3).toBe('Invalid configuration. Please check your repository settings.');
      });

      it('should handle various detail types', () => {
        const stringDetails = 'string details';
        const numberDetails = 404;
        const objectDetails = { status: 'error' };
        const arrayDetails = ['error1', 'error2'];

        // All should return the same message regardless of details
        const baseMessage = 'Authentication failed. Please check your GitHub token.';
        
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, stringDetails)).toBe(baseMessage);
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, numberDetails)).toBe(baseMessage);
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, objectDetails)).toBe(baseMessage);
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, arrayDetails)).toBe(baseMessage);
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, null)).toBe(baseMessage);
        expect(getUserMessage(ErrorCode.UNAUTHORIZED, undefined)).toBe(baseMessage);
      });
    });
  });

  describe('Error integration scenarios', () => {
    it('should work together for complete error handling', () => {
      const details = { 
        statusCode: 401, 
        headers: { 'x-ratelimit-remaining': '0' } 
      };

      const error = new GitHubSteeringError(
        'GitHub API returned 401 Unauthorized',
        ErrorCode.UNAUTHORIZED,
        details
      );

      const userMessage = getUserMessage(error.code, error.details);

      expect(error.message).toBe('GitHub API returned 401 Unauthorized');
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.details).toEqual(details);
      expect(userMessage).toBe('Authentication failed. Please check your GitHub token.');
    });

    it('should handle error chaining scenarios', () => {
      const originalError = new Error('Original network error');
      
      const wrappedError = new GitHubSteeringError(
        'Failed to fetch repository data',
        ErrorCode.NETWORK_ERROR,
        { originalError: originalError.message, cause: originalError },
        getUserMessage(ErrorCode.NETWORK_ERROR)
      );

      expect(wrappedError.message).toBe('Failed to fetch repository data');
      expect(wrappedError.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(wrappedError.userMessage).toBe('Unable to connect to GitHub. Please check your internet connection.');
      expect(wrappedError.details).toHaveProperty('originalError', 'Original network error');
      expect(wrappedError.details).toHaveProperty('cause', originalError);
    });

    it('should support error categorization', () => {
      const networkErrors = [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT];
      const apiErrors = [
        ErrorCode.REPOSITORY_NOT_FOUND,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        ErrorCode.FORBIDDEN
      ];
      const fsErrors = [
        ErrorCode.PERMISSION_DENIED,
        ErrorCode.DISK_FULL,
        ErrorCode.FILE_EXISTS
      ];
      const configErrors = [ErrorCode.INVALID_CONFIG, ErrorCode.MISSING_CONFIG];
      const cacheErrors = [ErrorCode.CACHE_CORRUPTED, ErrorCode.CACHE_QUOTA_EXCEEDED];

      // Verify all error codes are categorized
      const allErrors = [...networkErrors, ...apiErrors, ...fsErrors, ...configErrors, ...cacheErrors];
      const enumValues = Object.values(ErrorCode);
      
      expect(allErrors.sort()).toEqual(enumValues.sort());
    });
  });
});
/**
 * Basic configuration test to verify testing infrastructure is working
 */

import { describe, it, expect } from 'vitest';

describe('Testing Infrastructure', () => {
  it('should have proper test environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should support TypeScript compilation', () => {
    const testObject: { name: string; value: number } = {
      name: 'test',
      value: 42
    };
    
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });

  it('should support async/await', async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async-result'), 10);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe('async-result');
  });
});
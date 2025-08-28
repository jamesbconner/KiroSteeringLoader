/**
 * Debug test for loadTemplate method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../mocks/setup'; // Import mock setup first
import { SteeringTemplateProvider } from '../../src/steeringTemplateProvider';

describe('Debug loadTemplate', () => {
  let provider: SteeringTemplateProvider;
  let mockContext: any;
  let mockVSCode: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockVSCode = await vi.importMock('vscode');
    
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      workspaceState: { get: vi.fn(), update: vi.fn() },
      globalState: { get: vi.fn(), update: vi.fn() }
    };
    
    provider = new SteeringTemplateProvider(mockContext);
  });

  it('should call showErrorMessage for empty string', async () => {
    // Act
    await provider.loadTemplate('');

    // Assert
    expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
  });

  it('should call showErrorMessage for undefined', async () => {
    // Act
    await provider.loadTemplate(undefined as any);

    // Assert
    expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('No template path provided');
  });
});
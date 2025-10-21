/**
 * Unit tests for YAML Commands
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { registerYamlCommands } from '../../../../commands/yaml-commands';
import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { BoardSyncService } from '../../../../services/board-sync-service';
import { MockArduinoContext } from '../../../mocks/arduino-api-mock';
import { COMMAND_CREATE_SKETCH_YAML, COMMAND_APPLY_SKETCH_YAML } from '../../../../utils/constants';
import type { ApplyResult } from '../../../../types';

describe('YAML Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockArduinoContext: MockArduinoContext;
  let registerCommandSpy: jest.SpyInstance;
  let showErrorMessageSpy: jest.SpyInstance;
  let showInformationMessageSpy: jest.SpyInstance;
  let showWarningMessageSpy: jest.SpyInstance;
  let withProgressSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // Sinon stubs for SketchYamlService
  let hasSketchYamlStub: sinon.SinonStub;
  let readSketchYamlStub: sinon.SinonStub;
  let createSketchYamlStub: sinon.SinonStub;

  // Sinon stub for BoardSyncService
  let applyFqbnStub: sinon.SinonStub;

  beforeEach(() => {
    // Create mock extension context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    // Create mock Arduino context
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');

    // Spy on vscode methods
    registerCommandSpy = jest.spyOn(vscode.commands, 'registerCommand');
    showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
    showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
    showWarningMessageSpy = jest.spyOn(vscode.window, 'showWarningMessage');

    // Mock withProgress to immediately execute the task
    withProgressSpy = jest.spyOn(vscode.window, 'withProgress').mockImplementation(
      async (options, task) => {
        const mockCancellationToken = { isCancellationRequested: false, onCancellationRequested: jest.fn() };
        return task({ report: jest.fn() }, mockCancellationToken as any);
      }
    );

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Create Sinon stubs for SketchYamlService
    hasSketchYamlStub = sinon.stub(SketchYamlService, 'hasSketchYaml');
    readSketchYamlStub = sinon.stub(SketchYamlService, 'readSketchYaml');
    createSketchYamlStub = sinon.stub(SketchYamlService, 'createSketchYaml');

    // Create Sinon stub for BoardSyncService
    applyFqbnStub = sinon.stub(BoardSyncService.prototype, 'applyFqbn');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    sinon.restore();
  });

  describe('registerYamlCommands', () => {
    it('should register createSketchYaml command', () => {
      registerYamlCommands(mockContext, mockArduinoContext);

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_CREATE_SKETCH_YAML,
        expect.any(Function)
      );
    });

    it('should register applySketchYaml command', () => {
      registerYamlCommands(mockContext, mockArduinoContext);

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_APPLY_SKETCH_YAML,
        expect.any(Function)
      );
    });

    it('should add both commands to context.subscriptions', () => {
      registerYamlCommands(mockContext, mockArduinoContext);

      expect(mockContext.subscriptions).toHaveLength(2);
    });
  });

  describe('createSketchYaml command', () => {
    it('should call SketchYamlService.createSketchYaml', async () => {
      createSketchYamlStub.resolves();

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const createYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_SKETCH_YAML
      );
      const createYamlCallback = createYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await createYamlCallback();

      expect(createSketchYamlStub.calledWith(mockArduinoContext)).toBe(true);
    });

    it('should show error message when Arduino API not available', async () => {
      registerYamlCommands(mockContext, undefined);

      // Get the registered callback
      const createYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_SKETCH_YAML
      );
      const createYamlCallback = createYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await createYamlCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Arduino API not available');
      expect(createSketchYamlStub.called).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to create sketch.yaml');
      createSketchYamlStub.rejects(error);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const createYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_SKETCH_YAML
      );
      const createYamlCallback = createYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await createYamlCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating sketch.yaml:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create sketch.yaml')
      );
    });
  });

  describe('applySketchYaml command', () => {
    it('should show error when sketch.yaml does not exist', async () => {
      hasSketchYamlStub.returns(false);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sketch.yaml found')
      );
    });

    it('should show error when Arduino API not available', async () => {
      registerYamlCommands(mockContext, undefined);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Arduino API not available');
    });

    it('should successfully apply configuration from sketch.yaml', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [{ option: 'UploadSpeed', value: '921600' }],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(applyFqbnStub.calledWith('esp32:esp32:esp32s3:UploadSpeed=921600')).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Board configuration applied successfully')
      );
    });

    it('should handle partial success (board selected but some options failed)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const partialResult: ApplyResult = {
        success: false,
        boardSelected: true,
        optionsApplied: [{ option: 'UploadSpeed', value: '921600' }],
        optionsFailed: [{ option: 'USBMode', value: 'hwcdc', reason: 'Command not found' }],
        errors: []
      };
      applyFqbnStub.resolves(partialResult);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(showWarningMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Board configuration partially applied')
      );
    });

    it('should handle missing FQBN in profile', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            // No FQBN
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "default" not found or has no FQBN')
      );
    });

    it('should handle non-existent profile', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'production' // Profile doesn't exist
      });

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "production" not found or has no FQBN')
      );
    });

    it('should handle sketch.yaml read errors', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read YAML');
      readSketchYamlStub.rejects(error);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read sketch.yaml')
      );
    });

    it('should handle command execution errors', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      // Simulate error during command execution
      const error = new Error('Command execution failed');
      jest.spyOn(vscode.window, 'withProgress').mockRejectedValue(error);

      registerYamlCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const applyYamlCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_APPLY_SKETCH_YAML
      );
      const applyYamlCallback = applyYamlCall![1] as () => Promise<void>;

      // Execute the callback
      await applyYamlCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error applying sketch.yaml configuration:',
        error
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply sketch.yaml configuration')
      );
    });
  });
});

/**
 * Unit tests for Experimental Commands
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { registerExperimentalCommands } from '../../../../commands/experimental-commands';
import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { MockArduinoContext } from '../../../mocks/arduino-api-mock';
import { COMMAND_TOGGLE_UPLOAD_SPEED } from '../../../../utils/constants';
import * as fqbnUtils from '../../../../utils/fqbn-utils';

describe('Experimental Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockArduinoContext: MockArduinoContext;
  let registerCommandSpy: jest.SpyInstance;
  let showErrorMessageSpy: jest.SpyInstance;
  let showInformationMessageSpy: jest.SpyInstance;
  let getCommandsSpy: jest.SpyInstance;
  let executeCommandSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  // Sinon stubs
  let hasSketchYamlStub: sinon.SinonStub;
  let readSketchYamlStub: sinon.SinonStub;
  let parseFqbnStub: sinon.SinonStub;

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
    getCommandsSpy = jest.spyOn(vscode.commands, 'getCommands');
    executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand');

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Create Sinon stubs
    hasSketchYamlStub = sinon.stub(SketchYamlService, 'hasSketchYaml');
    readSketchYamlStub = sinon.stub(SketchYamlService, 'readSketchYaml');
    parseFqbnStub = sinon.stub(fqbnUtils, 'parseFqbn');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    sinon.restore();
  });

  describe('registerExperimentalCommands', () => {
    it('should register toggleUploadSpeed command', () => {
      registerExperimentalCommands(mockContext, mockArduinoContext);

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_TOGGLE_UPLOAD_SPEED,
        expect.any(Function)
      );
    });

    it('should add command to context.subscriptions', () => {
      registerExperimentalCommands(mockContext, mockArduinoContext);

      expect(mockContext.subscriptions).toHaveLength(1);
    });
  });

  describe('toggleUploadSpeed command', () => {
    it('should show error when Arduino API not available', async () => {
      registerExperimentalCommands(mockContext, undefined);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Arduino API not available');
    });

    it('should show error when no sketch.yaml found', async () => {
      hasSketchYamlStub.returns(false);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sketch.yaml found')
      );
    });

    it('should show error when sketch.yaml read fails', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read YAML');
      readSketchYamlStub.rejects(error);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read sketch.yaml')
      );
    });

    it('should show error when profile not found in sketch.yaml', async () => {
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

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "default" not found or has no FQBN')
      );
    });

    it('should show error when FQBN is invalid', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'invalid-fqbn',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });
      parseFqbnStub.returns(null); // Invalid FQBN

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Invalid FQBN format in sketch.yaml');
    });

    it('should toggle upload speed from 921600 to 115200', async () => {
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
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: { UploadSpeed: '921600' }
      });

      // Mock command availability
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--115200',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
      ]);
      executeCommandSpy.mockResolvedValue(undefined);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-UploadSpeed--115200');
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload Speed changed: 921600 → 115200')
      );
    });

    it('should toggle upload speed from 115200 to 921600', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=115200',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: { UploadSpeed: '115200' }
      });

      // Mock command availability
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--115200',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
      ]);
      executeCommandSpy.mockResolvedValue(undefined);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-UploadSpeed--921600');
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload Speed changed: 115200 → 921600')
      );
    });

    it('should default to 921600 if upload speed not set', async () => {
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
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: {} // No UploadSpeed set
      });

      // Mock command availability
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
      ]);
      executeCommandSpy.mockResolvedValue(undefined);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-UploadSpeed--921600');
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload Speed changed: not set → 921600')
      );
    });

    it('should show error when base board command not found', async () => {
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
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: { UploadSpeed: '921600' }
      });

      // Mock command availability - base command NOT found
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--arduino:avr:uno' // Different board
      ]);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Base board command not found')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Base command not found'),
        expect.anything()
      );
    });

    it('should show error when upload speed command not found', async () => {
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
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: { UploadSpeed: '921600' }
      });

      // Mock command availability - base command exists, but upload speed command NOT found
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3'
        // No upload speed command
      ]);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upload Speed command not found')
      );
    });

    it('should handle command execution errors', async () => {
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
      parseFqbnStub.returns({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: { UploadSpeed: '921600' }
      });

      // Mock command availability
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--115200'
      ]);

      const error = new Error('Command execution failed');
      executeCommandSpy.mockRejectedValue(error);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[POC] Command execution failed:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute command')
      );
    });

    it('should handle top-level errors gracefully', async () => {
      const error = new Error('Unexpected error');
      hasSketchYamlStub.throws(error);

      registerExperimentalCommands(mockContext, mockArduinoContext);

      // Get the registered callback
      const toggleSpeedCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_TOGGLE_UPLOAD_SPEED
      );
      const toggleSpeedCallback = toggleSpeedCall![1] as () => Promise<void>;

      // Execute the callback
      await toggleSpeedCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error toggling upload speed:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle upload speed')
      );
    });
  });
});

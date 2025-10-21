/**
 * Unit tests for Profile Commands
 */

import * as vscode from 'vscode';
import { registerProfileCommands } from '../../../../commands/profile-commands';
import { ProfileService } from '../../../../services/profile-service';
import { StatusBarService } from '../../../../services/status-bar-service';
import { MockArduinoContext } from '../../../mocks/arduino-api-mock';
import { COMMAND_SHOW_CONFIGURATIONS, COMMAND_CREATE_CONFIGURATION } from '../../../../utils/constants';

describe('Profile Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockArduinoContext: MockArduinoContext;
  let mockProfileService: jest.Mocked<ProfileService>;
  let mockStatusBarService: jest.Mocked<StatusBarService>;
  let registerCommandSpy: jest.SpyInstance;
  let showErrorMessageSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock extension context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    // Create mock Arduino context
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');

    // Create mock services
    mockProfileService = {
      showProfilePicker: jest.fn().mockResolvedValue(undefined),
      createConfiguration: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<ProfileService>;

    mockStatusBarService = {
      updateStatusBar: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<StatusBarService>;

    // Spy on vscode.commands.registerCommand
    registerCommandSpy = jest.spyOn(vscode.commands, 'registerCommand');

    // Spy on vscode.window.showErrorMessage
    showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('registerProfileCommands', () => {
    it('should register showConfigurations command', () => {
      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_SHOW_CONFIGURATIONS,
        expect.any(Function)
      );
    });

    it('should register createConfiguration command', () => {
      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_CREATE_CONFIGURATION,
        expect.any(Function)
      );
    });

    it('should add both commands to context.subscriptions', () => {
      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      expect(mockContext.subscriptions).toHaveLength(2);
    });
  });

  describe('showConfigurations command', () => {
    it('should call profileService.showProfilePicker and update status bar', async () => {
      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const showConfigsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_CONFIGURATIONS
      );
      const showConfigsCallback = showConfigsCall![1] as () => Promise<void>;

      // Execute the callback
      await showConfigsCallback();

      expect(mockProfileService.showProfilePicker).toHaveBeenCalledWith(mockArduinoContext);
      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should show error message when Arduino API not available', async () => {
      registerProfileCommands(
        mockContext,
        undefined, // No Arduino API
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const showConfigsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_CONFIGURATIONS
      );
      const showConfigsCallback = showConfigsCall![1] as () => Promise<void>;

      // Execute the callback
      await showConfigsCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Arduino API not available');
      expect(mockProfileService.showProfilePicker).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to show configurations');
      mockProfileService.showProfilePicker.mockRejectedValue(error);

      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const showConfigsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_CONFIGURATIONS
      );
      const showConfigsCallback = showConfigsCall![1] as () => Promise<void>;

      // Execute the callback
      await showConfigsCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error showing configurations:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show configurations')
      );
    });

    it('should not update status bar if showProfilePicker fails', async () => {
      mockProfileService.showProfilePicker.mockRejectedValue(new Error('Failed'));

      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const showConfigsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_CONFIGURATIONS
      );
      const showConfigsCallback = showConfigsCall![1] as () => Promise<void>;

      // Execute the callback
      await showConfigsCallback();

      expect(mockStatusBarService.updateStatusBar).not.toHaveBeenCalled();
    });
  });

  describe('createConfiguration command', () => {
    it('should call profileService.createConfiguration and update status bar', async () => {
      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const createConfigCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_CONFIGURATION
      );
      const createConfigCallback = createConfigCall![1] as () => Promise<void>;

      // Execute the callback
      await createConfigCallback();

      expect(mockProfileService.createConfiguration).toHaveBeenCalledWith(mockArduinoContext);
      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should show error message when Arduino API not available', async () => {
      registerProfileCommands(
        mockContext,
        undefined, // No Arduino API
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const createConfigCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_CONFIGURATION
      );
      const createConfigCallback = createConfigCall![1] as () => Promise<void>;

      // Execute the callback
      await createConfigCallback();

      expect(showErrorMessageSpy).toHaveBeenCalledWith('Arduino API not available');
      expect(mockProfileService.createConfiguration).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to create configuration');
      mockProfileService.createConfiguration.mockRejectedValue(error);

      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const createConfigCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_CONFIGURATION
      );
      const createConfigCallback = createConfigCall![1] as () => Promise<void>;

      // Execute the callback
      await createConfigCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating configuration:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create configuration')
      );
    });

    it('should not update status bar if createConfiguration fails', async () => {
      mockProfileService.createConfiguration.mockRejectedValue(new Error('Failed'));

      registerProfileCommands(
        mockContext,
        mockArduinoContext,
        mockProfileService,
        mockStatusBarService
      );

      // Get the registered callback
      const createConfigCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CREATE_CONFIGURATION
      );
      const createConfigCallback = createConfigCall![1] as () => Promise<void>;

      // Execute the callback
      await createConfigCallback();

      expect(mockStatusBarService.updateStatusBar).not.toHaveBeenCalled();
    });
  });
});

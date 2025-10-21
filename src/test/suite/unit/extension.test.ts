/**
 * Unit tests for Extension activation and deactivation
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { activate, deactivate } from '../../../extension';
import { LogService } from '../../../services/log-service';
import { ConfigStateTracker } from '../../../services/config-state-tracker';
import { ProfileService } from '../../../services/profile-service';
import { StatusBarService } from '../../../services/status-bar-service';
import { SketchYamlService } from '../../../services/sketch-yaml-service';
import { registerAllCommands } from '../../../commands';
import { registerArduinoEventHandlers, logInitialState } from '../../../handlers/arduino-event-handlers';
import { checkAndPromptForSketchYaml } from '../../../utils/board-utils';
import { MockArduinoContext, createESP32S3BoardDetails } from '../../mocks/arduino-api-mock';
import { ARDUINO_API_EXTENSION_ID } from '../../../utils/constants';

// Mock all modules
jest.mock('../../../services/log-service');
jest.mock('../../../services/config-state-tracker');
jest.mock('../../../services/profile-service');
jest.mock('../../../services/status-bar-service');
jest.mock('../../../commands');
jest.mock('../../../handlers/arduino-event-handlers');
jest.mock('../../../utils/board-utils');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockArduinoContext: MockArduinoContext;
  let mockLogService: jest.Mocked<LogService>;
  let mockStateTracker: jest.Mocked<ConfigStateTracker>;
  let mockProfileService: jest.Mocked<ProfileService>;
  let mockStatusBarService: jest.Mocked<StatusBarService>;
  let getExtensionSpy: jest.SpyInstance;
  let showErrorMessageSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let hasSketchYamlStub: sinon.SinonStub;
  let registerAllCommandsMock: jest.MockedFunction<typeof registerAllCommands>;
  let registerArduinoEventHandlersMock: jest.MockedFunction<typeof registerArduinoEventHandlers>;
  let logInitialStateMock: jest.MockedFunction<typeof logInitialState>;
  let checkAndPromptForSketchYamlMock: jest.MockedFunction<typeof checkAndPromptForSketchYaml>;

  beforeEach(() => {
    // Create mock extension context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    // Create mock Arduino context
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
    mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

    // Create mock service instances
    mockLogService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn()
    } as unknown as jest.Mocked<LogService>;

    mockStateTracker = {} as jest.Mocked<ConfigStateTracker>;

    mockProfileService = {
      applyDefaultProfile: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<ProfileService>;

    mockStatusBarService = {
      show: jest.fn(),
      updateStatusBar: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn()
    } as unknown as jest.Mocked<StatusBarService>;

    // Mock service constructors
    (LogService as jest.MockedClass<typeof LogService>).mockImplementation(() => mockLogService);
    (ConfigStateTracker as jest.MockedClass<typeof ConfigStateTracker>).mockImplementation(() => mockStateTracker);
    (ProfileService as jest.MockedClass<typeof ProfileService>).mockImplementation(() => mockProfileService);
    (StatusBarService as jest.MockedClass<typeof StatusBarService>).mockImplementation(() => mockStatusBarService);

    // Mock command and handler registration functions
    registerAllCommandsMock = registerAllCommands as jest.MockedFunction<typeof registerAllCommands>;
    registerAllCommandsMock.mockImplementation(() => {});

    registerArduinoEventHandlersMock = registerArduinoEventHandlers as jest.MockedFunction<typeof registerArduinoEventHandlers>;
    registerArduinoEventHandlersMock.mockImplementation(() => {});

    logInitialStateMock = logInitialState as jest.MockedFunction<typeof logInitialState>;
    logInitialStateMock.mockImplementation(() => {});

    checkAndPromptForSketchYamlMock = checkAndPromptForSketchYaml as jest.MockedFunction<typeof checkAndPromptForSketchYaml>;
    checkAndPromptForSketchYamlMock.mockResolvedValue(undefined);

    // Spy on vscode methods
    getExtensionSpy = jest.spyOn(vscode.extensions, 'getExtension').mockReturnValue({
      exports: mockArduinoContext
    } as any);

    showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Stub SketchYamlService
    hasSketchYamlStub = sinon.stub(SketchYamlService, 'hasSketchYaml');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    sinon.restore();
    jest.useRealTimers();
  });

  describe('activate', () => {
    it('should activate successfully with Arduino API available', async () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith('Arduino Sketch Vault extension is now active');
      expect(LogService).toHaveBeenCalledWith(mockContext);
      expect(ConfigStateTracker).toHaveBeenCalled();
      expect(ProfileService).toHaveBeenCalled();
    });

    it('should get Arduino context from extension API', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(getExtensionSpy).toHaveBeenCalledWith(ARDUINO_API_EXTENSION_ID);
      expect(consoleLogSpy).toHaveBeenCalledWith('Arduino API loaded successfully');
    });

    it('should show error when Arduino API is not available', () => {
      getExtensionSpy.mockReturnValue(undefined);

      activate(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Arduino API')
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Arduino API')
      );
      expect(StatusBarService).not.toHaveBeenCalled();
    });

    it('should create and show status bar service', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(StatusBarService).toHaveBeenCalledWith(
        mockProfileService,
        mockArduinoContext,
        expect.any(String) // COMMAND_SHOW_CONFIGURATIONS
      );
      expect(mockStatusBarService.show).toHaveBeenCalled();
    });

    it('should register all commands', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(registerAllCommandsMock).toHaveBeenCalledWith(
        mockContext,
        {
          logService: mockLogService,
          stateTracker: mockStateTracker,
          profileService: mockProfileService,
          statusBarService: mockStatusBarService
        },
        mockArduinoContext
      );
    });

    it('should add services to subscriptions', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(mockContext.subscriptions).toHaveLength(2);
      expect(mockContext.subscriptions[0]).toBe(mockStatusBarService);
      expect(mockContext.subscriptions[1]).toHaveProperty('dispose');
    });

    it('should call dispose on log service when subscription disposed', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      const disposeSubscription = mockContext.subscriptions[1] as { dispose: () => void };
      disposeSubscription.dispose();

      expect(mockLogService.dispose).toHaveBeenCalled();
    });

    it('should initialize log service', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(mockLogService.initialize).toHaveBeenCalled();
    });

    it('should log initial state when fqbn and boardDetails available', async () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      // Wait for async initialize to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logInitialStateMock).toHaveBeenCalledWith(
        mockArduinoContext,
        mockLogService,
        mockStateTracker
      );
    });

    it('should not log initial state when fqbn is undefined', async () => {
      hasSketchYamlStub.returns(false);
      mockArduinoContext._setFqbn(undefined);

      activate(mockContext);

      // Wait for async initialize to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logInitialStateMock).not.toHaveBeenCalled();
    });

    it('should not log initial state when boardDetails is undefined', async () => {
      hasSketchYamlStub.returns(false);
      mockArduinoContext._setBoardDetails(undefined);

      activate(mockContext);

      // Wait for async initialize to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logInitialStateMock).not.toHaveBeenCalled();
    });

    it('should update status bar after initialization', async () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      // Wait for async initialize to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should apply default profile when sketch.yaml exists', async () => {
      jest.useFakeTimers();
      hasSketchYamlStub.returns(true);

      activate(mockContext);

      // Wait for logService.initialize() to resolve and .then() to execute
      await Promise.resolve();
      await Promise.resolve();

      // Fast-forward past STARTUP_DELAY_MS (1000ms)
      jest.advanceTimersByTime(1000);

      // Wait for setTimeout callback to execute and all async operations
      await Promise.resolve();
      await Promise.resolve();

      expect(mockProfileService.applyDefaultProfile).toHaveBeenCalledWith(true, true);
      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should prompt for sketch.yaml when it does not exist', async () => {
      jest.useFakeTimers();
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      // Wait for logService.initialize() to resolve and .then() to execute
      await Promise.resolve();
      await Promise.resolve();

      // Fast-forward past STARTUP_DELAY_MS (1000ms)
      jest.advanceTimersByTime(1000);

      // Wait for setTimeout callback to execute and all async operations
      await Promise.resolve();
      await Promise.resolve();

      expect(checkAndPromptForSketchYamlMock).toHaveBeenCalledWith(mockArduinoContext);
      expect(mockProfileService.applyDefaultProfile).not.toHaveBeenCalled();
    });

    it('should handle log service initialization errors', async () => {
      hasSketchYamlStub.returns(false);
      const error = new Error('Init failed');
      mockLogService.initialize.mockRejectedValue(error);

      activate(mockContext);

      // Wait for async initialize to fail
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error initializing log service:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize log service')
      );
    });

    it('should register Arduino event handlers', () => {
      hasSketchYamlStub.returns(false);

      activate(mockContext);

      expect(registerArduinoEventHandlersMock).toHaveBeenCalledWith(
        mockContext,
        mockArduinoContext,
        {
          logService: mockLogService,
          stateTracker: mockStateTracker,
          statusBarService: mockStatusBarService
        }
      );
    });

    it('should handle event handler registration errors', () => {
      hasSketchYamlStub.returns(false);
      const error = new Error('Registration failed');
      registerArduinoEventHandlersMock.mockImplementation(() => {
        throw error;
      });

      activate(mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error registering Arduino API event listeners:',
        error
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register event listeners')
      );
    });

    it('should handle missing Arduino API extension gracefully', () => {
      getExtensionSpy.mockReturnValue(null as any);

      activate(mockContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Arduino API')
      );
      // Should not attempt to create status bar or register handlers
      expect(StatusBarService).not.toHaveBeenCalled();
      expect(registerArduinoEventHandlersMock).not.toHaveBeenCalled();
    });

    it('should handle Arduino API extension with no exports', () => {
      getExtensionSpy.mockReturnValue({
        exports: undefined
      } as any);

      activate(mockContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load Arduino API')
      );
    });
  });

  describe('deactivate', () => {
    it('should log deactivation message', () => {
      deactivate();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Arduino Sketch Vault extension is now deactivated'
      );
    });

    it('should not throw errors', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});

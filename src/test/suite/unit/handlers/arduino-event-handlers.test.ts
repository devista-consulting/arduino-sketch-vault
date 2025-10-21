/**
 * Unit tests for Arduino Event Handlers
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import {
  registerArduinoEventHandlers,
  logInitialState
} from '../../../../handlers/arduino-event-handlers';
import { LogService } from '../../../../services/log-service';
import { ConfigStateTracker } from '../../../../services/config-state-tracker';
import { StatusBarService } from '../../../../services/status-bar-service';
import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { MockArduinoContext, createESP32S3BoardDetails } from '../../../mocks/arduino-api-mock';

describe('Arduino Event Handlers', () => {
  let mockContext: vscode.ExtensionContext;
  let mockArduinoContext: MockArduinoContext;
  let mockLogService: jest.Mocked<LogService>;
  let mockStateTracker: jest.Mocked<ConfigStateTracker>;
  let mockStatusBarService: jest.Mocked<StatusBarService>;
  let showErrorMessageSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let isAutoUpdateEnabledStub: sinon.SinonStub;
  let updateSketchYamlFqbnStub: sinon.SinonStub;

  beforeEach(() => {
    // Create mock extension context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    // Create mock Arduino context
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');
    mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

    // Create mock services
    mockLogService = {
      logConfigChange: jest.fn()
    } as unknown as jest.Mocked<LogService>;

    mockStateTracker = {
      detectChanges: jest.fn().mockReturnValue({ isInitial: false, changes: [] })
    } as unknown as jest.Mocked<ConfigStateTracker>;

    mockStatusBarService = {
      updateStatusBar: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<StatusBarService>;

    // Spy on vscode methods
    showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Stub SketchYamlService methods
    isAutoUpdateEnabledStub = sinon.stub(SketchYamlService, 'isAutoUpdateEnabled');
    updateSketchYamlFqbnStub = sinon.stub(SketchYamlService, 'updateSketchYamlFqbn');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    sinon.restore();
  });

  describe('registerArduinoEventHandlers', () => {
    it('should register FQBN change listener', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      expect(mockContext.subscriptions).toHaveLength(3);
    });

    it('should register board details change listener', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      expect(mockContext.subscriptions).toHaveLength(3);
    });

    it('should register port change listener', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      expect(mockContext.subscriptions).toHaveLength(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Arduino Sketch Vault: Event listeners registered successfully'
      );
    });

    it('should handle FQBN change event', () => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: [{ option: 'UploadSpeed', label: 'Upload Speed', previousValue: '460800', previousLabel: '460800', newValue: '921600', newLabel: '921600' }]
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=460800');

      expect(mockLogService.logConfigChange).toHaveBeenCalled();
      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should not handle FQBN change when fqbn is undefined', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change with undefined
      mockArduinoContext._setFqbn(undefined);

      // Should not log or update status bar
      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
      expect(mockStatusBarService.updateStatusBar).not.toHaveBeenCalled();
    });

    it('should handle errors in FQBN change listener', () => {
      mockLogService.logConfigChange.mockImplementation(() => {
        throw new Error('Log error');
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=115200');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling FQBN change:',
        expect.any(Error)
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging FQBN change')
      );
    });

    it('should handle board details change event', () => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: [{ option: 'USBMode', label: 'USB Mode', previousValue: 'default', previousLabel: 'USB-OTG', newValue: 'hwcdc', newLabel: 'Hardware CDC' }]
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      expect(mockLogService.logConfigChange).toHaveBeenCalled();
      expect(mockStatusBarService.updateStatusBar).toHaveBeenCalled();
    });

    it('should not handle board details change when fqbn is undefined', () => {
      mockArduinoContext._setFqbn(undefined);

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      // Should not log or update status bar
      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
    });

    it('should not handle board details change when boardDetails is undefined', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change with undefined
      mockArduinoContext._setBoardDetails(undefined);

      // Should not log or update status bar
      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
    });

    it('should handle errors in board details change listener', () => {
      mockLogService.logConfigChange.mockImplementation(() => {
        throw new Error('Log error');
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: [{ option: 'test', label: 'Test', previousValue: 'old', previousLabel: 'Old', newValue: 'new', newLabel: 'New' }]
      });
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling board details change:',
        expect.any(Error)
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging board details change')
      );
    });

    it('should handle port change event', () => {
      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger port change
      mockArduinoContext._setPort({
        address: '/dev/ttyUSB0',
        protocol: 'serial',
        protocolLabel: 'Serial Port (USB)',
        label: '/dev/ttyUSB0',
        properties: {},
        hardwareId: 'USB_VID:PID=1A86:7523'
      });

      expect(mockLogService.logConfigChange).toHaveBeenCalled();
    });

    it('should not handle port change when fqbn is undefined', () => {
      mockArduinoContext._setFqbn(undefined);

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger port change
      mockArduinoContext._setPort({
        address: '/dev/ttyUSB0',
        protocol: 'serial',
        protocolLabel: 'Serial Port (USB)',
        label: '/dev/ttyUSB0',
        properties: {},
        hardwareId: 'USB_VID:PID=1A86:7523'
      });

      // Should not log
      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
    });

    it('should handle errors in port change listener', () => {
      mockLogService.logConfigChange.mockImplementation(() => {
        throw new Error('Log error');
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger port change
      mockArduinoContext._setPort({
        address: '/dev/ttyUSB0',
        protocol: 'serial',
        protocolLabel: 'Serial Port (USB)',
        label: '/dev/ttyUSB0',
        properties: {},
        hardwareId: 'USB_VID:PID=1A86:7523'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling port change:',
        expect.any(Error)
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging port change')
      );
    });
  });

  describe('logInitialState', () => {
    it('should log initial state with all details', () => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: true,
        changes: []
      });

      logInitialState(mockArduinoContext, mockLogService, mockStateTracker);

      expect(mockLogService.logConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
          changeType: 'initial',
          changes: []
        })
      );
    });

    it('should not log when fqbn is undefined', () => {
      mockArduinoContext._setFqbn(undefined);

      logInitialState(mockArduinoContext, mockLogService, mockStateTracker);

      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
    });

    it('should not log when boardDetails is undefined', () => {
      mockArduinoContext._setBoardDetails(undefined);

      logInitialState(mockArduinoContext, mockLogService, mockStateTracker);

      expect(mockLogService.logConfigChange).not.toHaveBeenCalled();
    });

    it('should include port information when available', () => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: true,
        changes: []
      });

      mockArduinoContext._setPort({
        address: '/dev/ttyUSB0',
        protocol: 'serial',
        protocolLabel: 'Serial Port (USB)',
        label: '/dev/ttyUSB0',
        properties: {},
        hardwareId: 'USB_VID:PID=1A86:7523'
      });

      logInitialState(mockArduinoContext, mockLogService, mockStateTracker);

      expect(mockLogService.logConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          port: {
            address: '/dev/ttyUSB0',
            protocol: 'serial'
          }
        })
      );
    });

    it('should not include port when undefined', () => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: true,
        changes: []
      });

      mockArduinoContext._setPort(undefined);

      logInitialState(mockArduinoContext, mockLogService, mockStateTracker);

      expect(mockLogService.logConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          port: undefined
        })
      );
    });
  });

  describe('Auto-update sketch.yaml', () => {
    beforeEach(() => {
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: [{ option: 'UploadSpeed', label: 'Upload Speed', previousValue: '460800', previousLabel: '460800', newValue: '921600', newLabel: '921600' }]
      });
    });

    it('should auto-update sketch.yaml on FQBN change when enabled', () => {
      isAutoUpdateEnabledStub.returns(true);
      updateSketchYamlFqbnStub.resolves();

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=460800');

      expect(updateSketchYamlFqbnStub.calledWith(
        'esp32:esp32:esp32s3:UploadSpeed=460800',
        sinon.match.any,
        true
      )).toBe(true);
    });

    it('should not auto-update sketch.yaml when disabled', () => {
      isAutoUpdateEnabledStub.returns(false);

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=460800');

      expect(updateSketchYamlFqbnStub.called).toBe(false);
    });

    it('should not auto-update sketch.yaml on initial change', () => {
      isAutoUpdateEnabledStub.returns(true);
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: true,
        changes: []
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=460800');

      expect(updateSketchYamlFqbnStub.called).toBe(false);
    });

    it('should not auto-update sketch.yaml when no changes detected', () => {
      isAutoUpdateEnabledStub.returns(true);
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: []
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');

      expect(updateSketchYamlFqbnStub.called).toBe(false);
    });

    it('should handle auto-update errors gracefully', async () => {
      isAutoUpdateEnabledStub.returns(true);
      updateSketchYamlFqbnStub.rejects(new Error('Update failed'));

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger FQBN change
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=460800');

      // Wait a bit for the promise rejection to be handled
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error auto-updating sketch.yaml:',
        expect.any(Error)
      );
    });

    it('should auto-update sketch.yaml on board details change when enabled', () => {
      isAutoUpdateEnabledStub.returns(true);
      updateSketchYamlFqbnStub.resolves();

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      expect(updateSketchYamlFqbnStub.called).toBe(true);
    });

    it('should not auto-update on board details change when it is initial state', () => {
      isAutoUpdateEnabledStub.returns(true);
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: true,
        changes: []
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      expect(updateSketchYamlFqbnStub.called).toBe(false);
    });

    it('should not auto-update on board details change when no changes', () => {
      isAutoUpdateEnabledStub.returns(true);
      mockStateTracker.detectChanges.mockReturnValue({
        isInitial: false,
        changes: []
      });

      registerArduinoEventHandlers(mockContext, mockArduinoContext, {
        logService: mockLogService,
        stateTracker: mockStateTracker,
        statusBarService: mockStatusBarService
      });

      // Trigger board details change
      const newBoardDetails = createESP32S3BoardDetails();
      mockArduinoContext._setBoardDetails(newBoardDetails);

      // Log should still be called, but auto-update should not
      expect(mockLogService.logConfigChange).not.toHaveBeenCalled(); // Not called because no changes
      expect(updateSketchYamlFqbnStub.called).toBe(false);
    });
  });
});

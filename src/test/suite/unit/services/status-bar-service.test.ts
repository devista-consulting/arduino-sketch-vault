/**
 * Unit tests for StatusBarService
 */

import * as vscode from 'vscode';
import { StatusBarService } from '../../../../services/status-bar-service';
import { ProfileService } from '../../../../services/profile-service';
import { MockArduinoContext } from '../../../mocks/arduino-api-mock';
import {
  CIRCUIT_BOARD_ICON,
  STATUS_BAR_DEFAULT_TEXT,
  STATUS_BAR_TOOLTIP_BASE,
  COMMAND_SHOW_CONFIGURATIONS
} from '../../../../utils/constants';

describe('StatusBarService', () => {
  let statusBarService: StatusBarService;
  let mockProfileService: jest.Mocked<ProfileService>;
  let mockArduinoContext: MockArduinoContext;
  let mockStatusBarItem: any;
  let createStatusBarItemSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };

    // Spy on vscode.window.createStatusBarItem
    createStatusBarItemSpy = jest.spyOn(vscode.window, 'createStatusBarItem')
      .mockReturnValue(mockStatusBarItem);

    // Create mock Arduino context
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');

    // Create mock ProfileService
    mockProfileService = {
      getActiveProfile: jest.fn()
    } as unknown as jest.Mocked<ProfileService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create status bar item with correct alignment and priority', () => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );

      expect(createStatusBarItemSpy).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        100 // STATUS_BAR_PRIORITY
      );
    });

    it('should set command on status bar item', () => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );

      expect(mockStatusBarItem.command).toBe(COMMAND_SHOW_CONFIGURATIONS);
    });

    it('should set default text and tooltip', () => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIP_BASE);
    });
  });

  describe('updateStatusBar', () => {
    beforeEach(() => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );
    });

    it('should show default text when Arduino context not available', async () => {
      // Create service without Arduino context
      statusBarService = new StatusBarService(
        mockProfileService,
        undefined,
        COMMAND_SHOW_CONFIGURATIONS
      );

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`);
      expect(mockStatusBarItem.tooltip).toContain(STATUS_BAR_TOOLTIP_BASE);
      expect(mockStatusBarItem.tooltip).toContain('Click to select');
    });

    it('should show active profile name in uppercase', async () => {
      mockProfileService.getActiveProfile.mockResolvedValue({
        name: 'production',
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600'
      });

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) PRODUCTION`);
      expect(mockStatusBarItem.tooltip).toContain('Active: production');
      expect(mockStatusBarItem.tooltip).toContain('Board: esp32:esp32:esp32s3:UploadSpeed=921600');
      expect(mockStatusBarItem.tooltip).toContain('Click to switch');
    });

    it('should show default text when no active profile', async () => {
      mockProfileService.getActiveProfile.mockResolvedValue(undefined);

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`);
      expect(mockStatusBarItem.tooltip).toContain(STATUS_BAR_TOOLTIP_BASE);
      expect(mockStatusBarItem.tooltip).toContain('Click to select');
    });

    it('should update tooltip with board FQBN', async () => {
      mockProfileService.getActiveProfile.mockResolvedValue({
        name: 'default',
        fqbn: 'arduino:avr:uno'
      });

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.tooltip).toContain('Board: arduino:avr:uno');
    });

    it('should handle profile names with mixed case', async () => {
      mockProfileService.getActiveProfile.mockResolvedValue({
        name: 'MyCustomProfile',
        fqbn: 'esp32:esp32:esp32s3'
      });

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) MYCUSTOMPROFILE`);
      expect(mockStatusBarItem.tooltip).toContain('Active: MyCustomProfile');
    });

    it('should handle profile names with hyphens and underscores', async () => {
      mockProfileService.getActiveProfile.mockResolvedValue({
        name: 'my-test_profile',
        fqbn: 'esp32:esp32:esp32s3'
      });

      await statusBarService.updateStatusBar();

      expect(mockStatusBarItem.text).toBe(`$(${CIRCUIT_BOARD_ICON}) MY-TEST_PROFILE`);
    });
  });

  describe('show', () => {
    it('should call show on status bar item', () => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );

      statusBarService.show();

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should call dispose on status bar item', () => {
      statusBarService = new StatusBarService(
        mockProfileService,
        mockArduinoContext,
        COMMAND_SHOW_CONFIGURATIONS
      );

      statusBarService.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});

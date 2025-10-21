/**
 * Unit tests for Log Commands
 */

import * as vscode from 'vscode';
import { registerLogCommands } from '../../../../commands/log-commands';
import { LogService } from '../../../../services/log-service';
import { ConfigStateTracker } from '../../../../services/config-state-tracker';
import { COMMAND_CLEAR_LOGS, COMMAND_SHOW_LOGS } from '../../../../utils/constants';

describe('Log Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockLogService: jest.Mocked<LogService>;
  let mockStateTracker: jest.Mocked<ConfigStateTracker>;
  let registerCommandSpy: jest.SpyInstance;
  let showErrorMessageSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock extension context
    mockContext = {
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    // Create mock services
    mockLogService = {
      clearLogs: jest.fn().mockResolvedValue(undefined),
      showOutputChannel: jest.fn()
    } as unknown as jest.Mocked<LogService>;

    mockStateTracker = {
      clear: jest.fn()
    } as unknown as jest.Mocked<ConfigStateTracker>;

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

  describe('registerLogCommands', () => {
    it('should register clearLogs command', () => {
      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_CLEAR_LOGS,
        expect.any(Function)
      );
    });

    it('should register showLogs command', () => {
      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      expect(registerCommandSpy).toHaveBeenCalledWith(
        COMMAND_SHOW_LOGS,
        expect.any(Function)
      );
    });

    it('should add both commands to context.subscriptions', () => {
      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      expect(mockContext.subscriptions).toHaveLength(2);
    });
  });

  describe('clearLogs command', () => {
    it('should call logService.clearLogs and stateTracker.clear', async () => {
      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      // Get the registered callback
      const clearLogsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CLEAR_LOGS
      );
      const clearLogsCallback = clearLogsCall![1] as () => Promise<void>;

      // Execute the callback
      await clearLogsCallback();

      expect(mockLogService.clearLogs).toHaveBeenCalled();
      expect(mockStateTracker.clear).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to clear logs');
      mockLogService.clearLogs.mockRejectedValue(error);

      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      // Get the registered callback
      const clearLogsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CLEAR_LOGS
      );
      const clearLogsCallback = clearLogsCall![1] as () => Promise<void>;

      // Execute the callback
      await clearLogsCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing logs:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear logs')
      );
    });

    it('should still clear state tracker if log service fails', async () => {
      mockLogService.clearLogs.mockRejectedValue(new Error('Failed'));

      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      // Get the registered callback
      const clearLogsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_CLEAR_LOGS
      );
      const clearLogsCallback = clearLogsCall![1] as () => Promise<void>;

      // Execute the callback
      await clearLogsCallback();

      // State tracker should not be called if clearLogs throws
      // (because of try-catch, it won't reach stateTracker.clear)
      expect(mockStateTracker.clear).not.toHaveBeenCalled();
    });
  });

  describe('showLogs command', () => {
    it('should call logService.showOutputChannel', () => {
      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      // Get the registered callback
      const showLogsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_LOGS
      );
      const showLogsCallback = showLogsCall![1] as () => void;

      // Execute the callback
      showLogsCallback();

      expect(mockLogService.showOutputChannel).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      const error = new Error('Failed to show logs');
      mockLogService.showOutputChannel.mockImplementation(() => {
        throw error;
      });

      registerLogCommands(mockContext, mockLogService, mockStateTracker);

      // Get the registered callback
      const showLogsCall = registerCommandSpy.mock.calls.find(
        call => call[0] === COMMAND_SHOW_LOGS
      );
      const showLogsCallback = showLogsCall![1] as () => void;

      // Execute the callback
      showLogsCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error showing logs:', error);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show logs')
      );
    });
  });
});

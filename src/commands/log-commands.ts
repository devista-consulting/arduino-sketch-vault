/**
 * Log Commands
 * Commands for managing Arduino Sketch Vault logs
 */

import * as vscode from 'vscode';
import { LogService } from '../services/log-service';
import { ConfigStateTracker } from '../services/config-state-tracker';
import { COMMAND_CLEAR_LOGS, COMMAND_SHOW_LOGS } from '../utils/constants';

/**
 * Register log-related commands
 */
export function registerLogCommands(
  context: vscode.ExtensionContext,
  logService: LogService,
  stateTracker: ConfigStateTracker
): void {
  const clearLogsCommand = vscode.commands.registerCommand(
    COMMAND_CLEAR_LOGS,
    async () => {
      try {
        await logService.clearLogs();
        stateTracker.clear();
      } catch (error) {
        console.error('Error clearing logs:', error);
        vscode.window.showErrorMessage(`Failed to clear logs: ${error}`);
      }
    }
  );

  const showLogsCommand = vscode.commands.registerCommand(
    COMMAND_SHOW_LOGS,
    () => {
      try {
        logService.showOutputChannel();
      } catch (error) {
        console.error('Error showing logs:', error);
        vscode.window.showErrorMessage(`Failed to show logs: ${error}`);
      }
    }
  );

  context.subscriptions.push(clearLogsCommand, showLogsCommand);
}

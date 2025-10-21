/**
 * Profile Commands
 * Commands for managing board configuration profiles
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { ProfileService } from '../services/profile-service';
import { StatusBarService } from '../services/status-bar-service';
import { COMMAND_SHOW_CONFIGURATIONS, COMMAND_CREATE_CONFIGURATION } from '../utils/constants';

/**
 * Register profile-related commands
 */
export function registerProfileCommands(
  context: vscode.ExtensionContext,
  arduinoContext: ArduinoContext | undefined,
  profileService: ProfileService,
  statusBarService: StatusBarService
): void {
  const showConfigurationsCommand = vscode.commands.registerCommand(
    COMMAND_SHOW_CONFIGURATIONS,
    async () => {
      try {
        if (!arduinoContext) {
          vscode.window.showErrorMessage('Arduino API not available');
          return;
        }
        await profileService.showProfilePicker(arduinoContext);
        // Update status bar immediately after profile switch
        await statusBarService.updateStatusBar();
      } catch (error) {
        console.error('Error showing configurations:', error);
        vscode.window.showErrorMessage(`Failed to show configurations: ${error}`);
      }
    }
  );

  const createConfigurationCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_CONFIGURATION,
    async () => {
      try {
        if (!arduinoContext) {
          vscode.window.showErrorMessage('Arduino API not available');
          return;
        }
        await profileService.createConfiguration(arduinoContext);
        // Update status bar after creating configuration
        await statusBarService.updateStatusBar();
      } catch (error) {
        console.error('Error creating configuration:', error);
        vscode.window.showErrorMessage(`Failed to create configuration: ${error}`);
      }
    }
  );

  context.subscriptions.push(showConfigurationsCommand, createConfigurationCommand);
}

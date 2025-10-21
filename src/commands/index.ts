/**
 * Commands Index
 * Central registration for all extension commands
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { LogService } from '../services/log-service';
import { ConfigStateTracker } from '../services/config-state-tracker';
import { ProfileService } from '../services/profile-service';
import { StatusBarService } from '../services/status-bar-service';
import { registerLogCommands } from './log-commands';
import { registerYamlCommands } from './yaml-commands';
import { registerProfileCommands } from './profile-commands';
import { registerExperimentalCommands } from './experimental-commands';

/**
 * Register all extension commands
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  services: {
    logService: LogService;
    stateTracker: ConfigStateTracker;
    profileService: ProfileService;
    statusBarService: StatusBarService;
  },
  arduinoContext: ArduinoContext | undefined
): void {
  const { logService, stateTracker, profileService, statusBarService } = services;

  // Register all command groups
  registerLogCommands(context, logService, stateTracker);
  registerYamlCommands(context, arduinoContext);
  registerProfileCommands(context, arduinoContext, profileService, statusBarService);
  registerExperimentalCommands(context, arduinoContext);

  console.log('Arduino Sketch Vault: All commands registered successfully');
}

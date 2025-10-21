/**
 * Arduino Sketch Vault Extension
 * Main entry point - orchestration only
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from './types';
import { LogService } from './services/log-service';
import { ConfigStateTracker } from './services/config-state-tracker';
import { SketchYamlService } from './services/sketch-yaml-service';
import { ProfileService } from './services/profile-service';
import { StatusBarService } from './services/status-bar-service';
import { registerAllCommands } from './commands';
import { registerArduinoEventHandlers, logInitialState } from './handlers/arduino-event-handlers';
import { checkAndPromptForSketchYaml } from './utils/board-utils';
import { ARDUINO_API_EXTENSION_ID, COMMAND_SHOW_CONFIGURATIONS, STARTUP_DELAY_MS } from './utils/constants';

export function activate(context: vscode.ExtensionContext) {
  console.log('Arduino Sketch Vault extension is now active');

  // Initialize services
  const logService = new LogService(context);
  const stateTracker = new ConfigStateTracker();
  const profileService = new ProfileService();

  // Get Arduino Context from vscode-arduino-api extension
  const arduinoContext: ArduinoContext | undefined = vscode.extensions.getExtension(
    ARDUINO_API_EXTENSION_ID
  )?.exports;

  if (!arduinoContext) {
    const errorMsg =
      'Arduino Sketch Vault: Failed to load Arduino API. Please ensure you are running in Arduino IDE and the vscode-arduino-api extension is installed.';
    console.error(errorMsg);
    vscode.window.showErrorMessage(errorMsg);
    return;
  }

  console.log('Arduino API loaded successfully');

  // Create status bar service
  const statusBarService = new StatusBarService(
    profileService,
    arduinoContext,
    COMMAND_SHOW_CONFIGURATIONS
  );
  statusBarService.show();

  // Register all commands
  registerAllCommands(
    context,
    {
      logService,
      stateTracker,
      profileService,
      statusBarService
    },
    arduinoContext
  );

  // Add status bar and log service to subscriptions
  context.subscriptions.push(
    statusBarService,
    {
      dispose: () => logService.dispose(),
    }
  );

  // Initialize log service
  logService
    .initialize()
    .then(async () => {
      console.log('Log service initialized');

      // Log initial state if available
      if (arduinoContext.fqbn && arduinoContext.boardDetails) {
        logInitialState(arduinoContext, logService, stateTracker);
      }

      // Initial status bar update
      await statusBarService.updateStatusBar();

      // Apply default profile from sketch.yaml if it exists
      setTimeout(async () => {
        if (SketchYamlService.hasSketchYaml()) {
          // Prompt user to apply default profile on startup
          await profileService.applyDefaultProfile(true, true);
          // Update status bar after applying default profile
          await statusBarService.updateStatusBar();
        } else {
          // Check for sketch.yaml and prompt if missing
          await checkAndPromptForSketchYaml(arduinoContext);
        }
      }, STARTUP_DELAY_MS);
    })
    .catch((error) => {
      console.error('Error initializing log service:', error);
      vscode.window.showErrorMessage(`Failed to initialize log service: ${error}`);
    });

  // Register Arduino event handlers
  try {
    registerArduinoEventHandlers(context, arduinoContext, {
      logService,
      stateTracker,
      statusBarService
    });
  } catch (error) {
    console.error('Error registering Arduino API event listeners:', error);
    vscode.window.showErrorMessage(`Failed to register event listeners: ${error}`);
  }
}

export function deactivate() {
  console.log('Arduino Sketch Vault extension is now deactivated');
}

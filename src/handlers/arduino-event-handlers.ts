/**
 * Arduino Event Handlers
 * Handles Arduino IDE events (FQBN changes, board details changes, port changes)
 */

import * as vscode from 'vscode';
import type { ArduinoContext, LogEntry } from '../types';
import { LogService } from '../services/log-service';
import { ConfigStateTracker } from '../services/config-state-tracker';
import { StatusBarService } from '../services/status-bar-service';
import { SketchYamlService } from '../services/sketch-yaml-service';
import { extractBoardName } from '../utils/board-utils';

/**
 * Register all Arduino event handlers
 */
export function registerArduinoEventHandlers(
  context: vscode.ExtensionContext,
  arduinoContext: ArduinoContext,
  services: {
    logService: LogService;
    stateTracker: ConfigStateTracker;
    statusBarService: StatusBarService;
  }
): void {
  const { logService, stateTracker, statusBarService } = services;

  // Listen to FQBN changes (includes all board config options)
  const fqbnDisposable = arduinoContext.onDidChange('fqbn')((fqbn) => {
    try {
      console.log('FQBN changed:', fqbn);
      if (fqbn) {
        handleFqbnChange(arduinoContext, logService, stateTracker);
        // Update status bar when FQBN changes
        statusBarService.updateStatusBar();
      }
    } catch (error) {
      console.error('Error handling FQBN change:', error);
      vscode.window.showErrorMessage(`Error logging FQBN change: ${error}`);
    }
  });

  // Listen to board details changes (more detailed config info)
  const boardDetailsDisposable = arduinoContext.onDidChange('boardDetails')((boardDetails) => {
    try {
      console.log('Board details changed:', boardDetails?.fqbn);
      if (boardDetails && arduinoContext.fqbn) {
        handleBoardDetailsChange(arduinoContext, logService, stateTracker);
        // Update status bar when board details change
        statusBarService.updateStatusBar();
      }
    } catch (error) {
      console.error('Error handling board details change:', error);
      vscode.window.showErrorMessage(`Error logging board details change: ${error}`);
    }
  });

  // Listen to port changes
  const portDisposable = arduinoContext.onDidChange('port')((port) => {
    try {
      console.log('Port changed:', port?.address);
      if (arduinoContext.fqbn) {
        handlePortChange(arduinoContext, logService);
      }
    } catch (error) {
      console.error('Error handling port change:', error);
      vscode.window.showErrorMessage(`Error logging port change: ${error}`);
    }
  });

  // Add event listeners to subscriptions
  context.subscriptions.push(fqbnDisposable, boardDetailsDisposable, portDisposable);

  console.log('Arduino Sketch Vault: Event listeners registered successfully');
}

/**
 * Log initial state when extension activates
 */
export function logInitialState(
  arduinoContext: ArduinoContext,
  logService: LogService,
  stateTracker: ConfigStateTracker
): void {
  const { fqbn, boardDetails, port, sketchPath } = arduinoContext;

  if (!fqbn || !boardDetails) {
    return;
  }

  const { isInitial, changes } = stateTracker.detectChanges(fqbn, boardDetails);

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    sketchPath,
    fqbn,
    board: {
      name: extractBoardName(fqbn),
      fqbn,
    },
    port: port
      ? {
          address: port.address,
          protocol: port.protocol,
        }
      : undefined,
    changes,
    changeType: 'initial',
  };

  logService.logConfigChange(logEntry);
}

/**
 * Handle FQBN change events
 */
function handleFqbnChange(
  arduinoContext: ArduinoContext,
  logService: LogService,
  stateTracker: ConfigStateTracker
): void {
  const { fqbn, boardDetails, port, sketchPath } = arduinoContext;

  if (!fqbn || !boardDetails) {
    return;
  }

  // Don't call detectChanges here - let handleBoardDetailsChange handle it
  // FQBN change fires first with base FQBN, then boardDetails fires with complete info
  // If we call detectChanges here, it updates the state and boardDetails sees no change!

  // Just log the raw FQBN change for tracking purposes
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    sketchPath,
    fqbn,
    board: {
      name: extractBoardName(fqbn),
      fqbn,
    },
    port: port
      ? {
          address: port.address,
          protocol: port.protocol,
        }
      : undefined,
    changes: [], // No change detection here
    changeType: 'fqbn',
  };

  logService.logConfigChange(logEntry);

  // Don't auto-update here - wait for boardDetails change which has complete info
  // FQBN change event fires with base FQBN only (no config options)
  // boardDetails change event fires afterward with complete FQBN + all options
}

/**
 * Handle board details change events
 */
function handleBoardDetailsChange(
  arduinoContext: ArduinoContext,
  logService: LogService,
  stateTracker: ConfigStateTracker
): void {
  const { fqbn, boardDetails, port, sketchPath } = arduinoContext;

  if (!fqbn || !boardDetails) {
    return;
  }

  const { isInitial, changes } = stateTracker.detectChanges(fqbn, boardDetails);

  // Log if there are actual changes (not initial)
  if (!isInitial && changes.length > 0) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      sketchPath,
      fqbn,
      board: {
        name: extractBoardName(fqbn),
        fqbn,
      },
      port: port
        ? {
            address: port.address,
            protocol: port.protocol,
          }
        : undefined,
      changes,
      changeType: 'board',
    };

    logService.logConfigChange(logEntry);
  }

  // Auto-update sketch.yaml if enabled and there are changes (including board switches)
  // This event has complete FQBN with all config options from boardDetails
  if (!isInitial && changes.length > 0 && SketchYamlService.isAutoUpdateEnabled()) {
    console.log(`[handleBoardDetailsChange] Auto-updating sketch.yaml with FQBN: ${fqbn}`);
    SketchYamlService.updateSketchYamlFqbn(fqbn, boardDetails, true).catch((error) => {
      console.error('Error auto-updating sketch.yaml:', error);
    });
  }
}

/**
 * Handle port change events
 */
function handlePortChange(
  arduinoContext: ArduinoContext,
  logService: LogService
): void {
  const { fqbn, boardDetails, port, sketchPath } = arduinoContext;

  if (!fqbn || !boardDetails) {
    return;
  }

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    sketchPath,
    fqbn,
    board: {
      name: extractBoardName(fqbn),
      fqbn,
    },
    port: port
      ? {
          address: port.address,
          protocol: port.protocol,
        }
      : undefined,
    changes: [],
    changeType: 'port',
  };

  logService.logConfigChange(logEntry);
}

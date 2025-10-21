/**
 * YAML Commands
 * Commands for creating and applying sketch.yaml configuration
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { SketchYamlService } from '../services/sketch-yaml-service';
import { BoardSyncService } from '../services/board-sync-service';
import { COMMAND_CREATE_SKETCH_YAML, COMMAND_APPLY_SKETCH_YAML } from '../utils/constants';

/**
 * Register YAML-related commands
 */
export function registerYamlCommands(
  context: vscode.ExtensionContext,
  arduinoContext: ArduinoContext | undefined
): void {
  const createSketchYamlCommand = vscode.commands.registerCommand(
    COMMAND_CREATE_SKETCH_YAML,
    async () => {
      try {
        if (!arduinoContext) {
          vscode.window.showErrorMessage('Arduino API not available');
          return;
        }
        await SketchYamlService.createSketchYaml(arduinoContext);
      } catch (error) {
        console.error('Error creating sketch.yaml:', error);
        vscode.window.showErrorMessage(`Failed to create sketch.yaml: ${error}`);
      }
    }
  );

  const applySketchYamlCommand = vscode.commands.registerCommand(
    COMMAND_APPLY_SKETCH_YAML,
    async () => {
      try {
        if (!arduinoContext) {
          vscode.window.showErrorMessage('Arduino API not available');
          return;
        }
        await applySketchYamlConfiguration(arduinoContext);
      } catch (error) {
        console.error('Error applying sketch.yaml configuration:', error);
        vscode.window.showErrorMessage(`Failed to apply sketch.yaml configuration: ${error}`);
      }
    }
  );

  context.subscriptions.push(createSketchYamlCommand, applySketchYamlCommand);
}

/**
 * Apply sketch.yaml board configuration to Arduino IDE
 * Reads FQBN from sketch.yaml and applies all config options
 */
async function applySketchYamlConfiguration(arduinoContext: ArduinoContext): Promise<void> {
  // Check if sketch.yaml exists
  if (!SketchYamlService.hasSketchYaml()) {
    vscode.window.showErrorMessage(
      'No sketch.yaml found in workspace. Create one first using "Create sketch.yaml" command.'
    );
    return;
  }

  // Read FQBN from sketch.yaml
  let sketchYamlFqbn: string | undefined;
  let activeProfile: string = 'default';
  try {
    const yamlContent = await SketchYamlService.readSketchYaml();
    if (yamlContent?.profiles) {
      // Use the default_profile setting, or fall back to 'default'
      activeProfile = yamlContent.default_profile || 'default';
      const profile = yamlContent.profiles[activeProfile];

      if (profile?.fqbn) {
        sketchYamlFqbn = profile.fqbn;
      } else {
        vscode.window.showErrorMessage(`Profile "${activeProfile}" not found or has no FQBN in sketch.yaml`);
        return;
      }
    }
  } catch (error) {
    console.error('[ApplySketchYaml] Error reading sketch.yaml:', error);
    vscode.window.showErrorMessage(`Failed to read sketch.yaml: ${error}`);
    return;
  }

  if (!sketchYamlFqbn) {
    vscode.window.showErrorMessage(`No FQBN found in sketch.yaml profile "${activeProfile}"`);
    return;
  }

  console.log('[ApplySketchYaml] ============================================');
  console.log('[ApplySketchYaml] Applying board configuration from sketch.yaml');
  console.log('[ApplySketchYaml] Active profile:', activeProfile);
  console.log('[ApplySketchYaml] FQBN from sketch.yaml:', sketchYamlFqbn);
  console.log('[ApplySketchYaml] Current IDE FQBN:', arduinoContext.fqbn);
  console.log('[ApplySketchYaml] ============================================');

  // Show progress notification
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Applying sketch.yaml Configuration',
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: 'Reading configuration...' });

      // Apply configuration using BoardSyncService
      const syncService = new BoardSyncService();
      const result = await syncService.applyFqbn(sketchYamlFqbn!);

      console.log('[ApplySketchYaml] Result:', result);

      // Report results to user
      if (result.success) {
        const appliedOptions = result.optionsApplied
          .map(o => `${o.option}=${o.value}`)
          .join(', ');

        vscode.window.showInformationMessage(
          `✅ Board configuration applied successfully!\n\n` +
          `Profile: ${activeProfile}\n` +
          `Board: ${sketchYamlFqbn}\n` +
          `Options applied: ${result.optionsApplied.length}\n` +
          `${appliedOptions ? `(${appliedOptions})` : ''}`
        );

        console.log('[ApplySketchYaml] ✅ Configuration applied successfully');
        console.log('[ApplySketchYaml] Options applied:', result.optionsApplied.length);
        console.log('[ApplySketchYaml] Options failed:', result.optionsFailed.length);
      } else {
        const errorMessage = result.errors.join(', ');
        const failedOptions = result.optionsFailed
          .map(o => `${o.option}=${o.value} (${o.reason})`)
          .join('\n');

        vscode.window.showWarningMessage(
          `⚠️ Board configuration partially applied\n\n` +
          `Profile: ${activeProfile}\n` +
          `Board selected: ${result.boardSelected ? 'Yes' : 'No'}\n` +
          `Options applied: ${result.optionsApplied.length}\n` +
          `Options failed: ${result.optionsFailed.length}\n\n` +
          `${failedOptions ? `Failed:\n${failedOptions}` : ''}\n\n` +
          `${errorMessage ? `Errors: ${errorMessage}` : ''}`
        );

        console.warn('[ApplySketchYaml] ⚠️ Partial success or failure');
        console.warn('[ApplySketchYaml] Errors:', result.errors);
        console.warn('[ApplySketchYaml] Failed options:', result.optionsFailed);
      }

      console.log('[ApplySketchYaml] ============================================');
    }
  );
}

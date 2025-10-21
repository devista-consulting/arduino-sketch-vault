/**
 * Experimental Commands
 * POC (Proof of Concept) commands for testing and development
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { SketchYamlService } from '../services/sketch-yaml-service';
import { parseFqbn, extractBaseFqbn } from '../utils/fqbn-utils';
import { COMMAND_TOGGLE_UPLOAD_SPEED, DEFAULT_PROFILE_NAME } from '../utils/constants';

/**
 * Register experimental/POC commands
 */
export function registerExperimentalCommands(
  context: vscode.ExtensionContext,
  arduinoContext: ArduinoContext | undefined
): void {
  const toggleUploadSpeedCommand = vscode.commands.registerCommand(
    COMMAND_TOGGLE_UPLOAD_SPEED,
    async () => {
      try {
        if (!arduinoContext) {
          vscode.window.showErrorMessage('Arduino API not available');
          return;
        }
        await toggleUploadSpeed(arduinoContext);
      } catch (error) {
        console.error('Error toggling upload speed:', error);
        vscode.window.showErrorMessage(`Failed to toggle upload speed: ${error}`);
      }
    }
  );

  context.subscriptions.push(toggleUploadSpeedCommand);
}

/**
 * POC: Toggle Upload Speed between 921600 and 115200
 * Reads FQBN from sketch.yaml to get configuration options
 */
async function toggleUploadSpeed(arduinoContext: ArduinoContext): Promise<void> {
  // Check if sketch.yaml exists
  if (!SketchYamlService.hasSketchYaml()) {
    vscode.window.showErrorMessage(
      'No sketch.yaml found. Please create one first using "Create sketch.yaml" command.'
    );
    return;
  }

  // Read FQBN from sketch.yaml
  let sketchYamlFqbn: string | undefined;
  try {
    const yamlContent = await SketchYamlService.readSketchYaml();
    if (yamlContent?.profiles) {
      // Use the default_profile setting, or fall back to 'default'
      const activeProfile = yamlContent.default_profile || DEFAULT_PROFILE_NAME;
      const profile = yamlContent.profiles[activeProfile];

      if (profile?.fqbn) {
        sketchYamlFqbn = profile.fqbn;
        console.log(`[POC] Using profile: ${activeProfile}`);
      } else {
        vscode.window.showErrorMessage(`Profile "${activeProfile}" not found or has no FQBN in sketch.yaml`);
        return;
      }
    }
  } catch (error) {
    console.error('[POC] Error reading sketch.yaml:', error);
    vscode.window.showErrorMessage(`Failed to read sketch.yaml: ${error}`);
    return;
  }

  if (!sketchYamlFqbn) {
    vscode.window.showErrorMessage('No FQBN found in sketch.yaml');
    return;
  }

  console.log('[POC] FQBN from sketch.yaml:', sketchYamlFqbn);
  console.log('[POC] FQBN from Arduino IDE:', arduinoContext.fqbn);

  // Parse FQBN using utility function
  const parsed = parseFqbn(sketchYamlFqbn);
  if (!parsed) {
    vscode.window.showErrorMessage('Invalid FQBN format in sketch.yaml');
    return;
  }

  const { baseFqbn, options } = parsed;
  console.log('[POC] Current options from sketch.yaml:', options);

  // Toggle Upload Speed
  const currentSpeed = options['UploadSpeed'];
  let newSpeed: string;

  if (currentSpeed === '921600') {
    newSpeed = '115200';
  } else if (currentSpeed === '115200') {
    newSpeed = '921600';
  } else {
    // Default to 921600 if not set or different value
    newSpeed = '921600';
  }

  options['UploadSpeed'] = newSpeed;
  console.log('[POC] Toggling Upload Speed: %s → %s', currentSpeed || 'not set', newSpeed);

  // Reconstruct FQBN with new upload speed
  const optionPairs = Object.entries(options).map(([key, value]) => `${key}=${value}`);
  const newOptionsString = optionPairs.join(',');
  const newFqbnWithOptions = newOptionsString
    ? `${baseFqbn}:${newOptionsString}`
    : baseFqbn;

  console.log('[POC] New FQBN (with options):', newFqbnWithOptions);

  // Try the base board command (without options)
  const baseCommandId = `arduino-select-board--${baseFqbn}`;
  console.log('[POC] Trying base board command:', baseCommandId);

  // Check if base command exists
  const allCommands = await vscode.commands.getCommands();

  // ALWAYS search for config-option related commands (moved outside conditional)
  console.log('[POC] ============================================');
  console.log('[POC] Searching for config/option commands...');
  console.log('[POC] ============================================');

  const configCommands = allCommands.filter(cmd =>
    cmd.toLowerCase().includes('config') ||
    cmd.toLowerCase().includes('option') ||
    cmd.toLowerCase().includes('uploadspeed') ||
    cmd.toLowerCase().includes('speed') ||
    cmd.toLowerCase().includes('cpu') ||
    cmd.toLowerCase().includes('flash')
  );
  console.log('[POC] Config/option-related commands count:', configCommands.length);
  if (configCommands.length > 0) {
    console.log('[POC] Config/option-related commands:', JSON.stringify(configCommands, null, 2));
  } else {
    console.log('[POC] NO config/option commands found!');
  }

  // Also search for ALL arduino commands (not just board selection)
  const arduinoCommands = allCommands.filter(cmd => cmd.startsWith('arduino'));
  console.log('[POC] All arduino-* commands count:', arduinoCommands.length);
  console.log('[POC] Sample arduino commands (first 30):', JSON.stringify(arduinoCommands.slice(0, 30), null, 2));

  const baseCommandExists = allCommands.includes(baseCommandId);

  if (!baseCommandExists) {
    vscode.window.showErrorMessage(
      `Base board command not found: ${baseCommandId}\n\n` +
      `The board "${baseFqbn}" is not installed.\n\n` +
      `Check console for available commands.`
    );
    console.error('[POC] Base command not found. Available commands count:', allCommands.length);
    return;
  }

  // NEW: Use the discovered command pattern for config options!
  // Pattern: {vendor}:{arch}:{board}-{OptionName}--{value}
  const uploadSpeedCommandId = `${baseFqbn}-UploadSpeed--${newSpeed}`;

  console.log('[POC] ============================================');
  console.log('[POC] DISCOVERED: Config option command pattern!');
  console.log('[POC] Pattern: {vendor}:{arch}:{board}-{OptionName}--{value}');
  console.log('[POC] ============================================');
  console.log('[POC] Upload Speed command:', uploadSpeedCommandId);

  // Check if this specific command exists
  const uploadSpeedCommandExists = allCommands.includes(uploadSpeedCommandId);
  console.log('[POC] Upload Speed command exists:', uploadSpeedCommandExists);

  if (!uploadSpeedCommandExists) {
    vscode.window.showErrorMessage(
      `Upload Speed command not found: ${uploadSpeedCommandId}\n\n` +
      `The upload speed ${newSpeed} might not be available for this board.`
    );
    return;
  }

  // Execute the config option command
  try {
    console.log('[POC] Executing Upload Speed command:', uploadSpeedCommandId);
    console.log('[POC] Current speed:', currentSpeed || 'not set');
    console.log('[POC] New speed:', newSpeed);

    await vscode.commands.executeCommand(uploadSpeedCommandId);

    console.log('[POC] ✅ Upload Speed command executed successfully!');
    console.log('[POC] ============================================');
    console.log('[POC] Waiting for change event to fire...');
    console.log('[POC] Check Arduino IDE Tools menu - Upload Speed should now be', newSpeed);
    console.log('[POC] ============================================');

    vscode.window.showInformationMessage(
      `✅ Upload Speed changed: ${currentSpeed || 'not set'} → ${newSpeed}\n\n` +
      `Check Arduino IDE Tools menu to verify!`
    );
  } catch (error) {
    console.error('[POC] Command execution failed:', error);
    vscode.window.showErrorMessage(
      `Failed to execute command: ${error}`
    );
  }
}

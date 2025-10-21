/**
 * Board utility functions
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { SketchYamlService } from '../services/sketch-yaml-service';
import { SKETCH_YAML_PROMPT_DELAY_MS } from './constants';

/**
 * Extracts a human-readable board name from the FQBN
 * Currently returns the FQBN itself, but could be enhanced
 * to parse and return just the board part or maintain a mapping
 * to friendly names
 *
 * FQBN format: vendor:arch:board[:options]
 * Example: arduino:avr:uno -> "arduino:avr:uno"
 *
 * @param fqbn Fully Qualified Board Name
 * @returns Human-readable board name
 */
export function extractBoardName(fqbn: string): string {
  // For now, just return the FQBN itself
  // In the future, we could parse it to extract just the board part
  // or maintain a mapping of FQBNs to friendly names
  return fqbn;
}

/**
 * Checks if sketch.yaml exists and prompts user to create it if missing
 * Used during extension activation to guide users
 *
 * @param arduinoContext Arduino API context
 */
export async function checkAndPromptForSketchYaml(
  arduinoContext: ArduinoContext
): Promise<void> {
  // Only prompt if we have a board selected
  if (!arduinoContext.fqbn) {
    return;
  }

  // Check if sketch.yaml already exists
  if (SketchYamlService.hasSketchYaml()) {
    console.log('sketch.yaml found in workspace');
    return;
  }

  // Prompt user to create it
  console.log('No sketch.yaml found, prompting user...');

  // Delay the prompt slightly to avoid overwhelming the user on startup
  await new Promise(resolve => setTimeout(resolve, SKETCH_YAML_PROMPT_DELAY_MS));

  await SketchYamlService.promptToCreateSketchYaml(arduinoContext);
}

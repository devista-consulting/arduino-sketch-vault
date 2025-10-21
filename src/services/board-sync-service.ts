import * as vscode from 'vscode';
import type { ApplyResult } from '../types';
import { parseFqbn } from '../utils/fqbn-utils';
import { COMMAND_WAIT_TIMEOUT_MS, COMMAND_POLL_INTERVAL_MS } from '../utils/constants';

/**
 * Service for synchronizing board configuration from sketch.yaml to Arduino IDE
 * Uses discovered command patterns to set board and config options
 */
export class BoardSyncService {
  /**
   * Apply complete FQBN from sketch.yaml to Arduino IDE
   *
   * @param fqbn Full FQBN including config options (e.g., "esp32:esp32:esp32s3:UploadSpeed=921600,CPUFreq=240")
   * @returns Promise<ApplyResult> with success status and details
   */
  async applyFqbn(fqbn: string): Promise<ApplyResult> {
    const result: ApplyResult = {
      success: false,
      boardSelected: false,
      optionsApplied: [],
      optionsFailed: [],
      errors: []
    };

    try {
      // Parse FQBN into base board and options
      const parsed = parseFqbn(fqbn);
      if (!parsed) {
        result.errors.push('Invalid FQBN format');
        return result;
      }

      const { baseFqbn, options } = parsed;
      console.log('[BoardSync] Applying FQBN:', fqbn);
      console.log('[BoardSync] Base board:', baseFqbn);
      console.log('[BoardSync] Options:', options);

      // Step 1: Select base board (if needed)
      const boardResult = await this.selectBoard(baseFqbn);
      result.boardSelected = boardResult.success;
      if (!boardResult.success) {
        result.errors.push(boardResult.error || 'Failed to select board');
        return result;
      }

      // Step 2: Apply each config option
      for (const [optionName, value] of Object.entries(options)) {
        const optionResult = await this.setConfigOption(baseFqbn, optionName, value);

        if (optionResult.success) {
          result.optionsApplied.push({ option: optionName, value });
          console.log(`[BoardSync] ✓ Set ${optionName} = ${value}`);
        } else {
          result.optionsFailed.push({ option: optionName, value, reason: optionResult.error });
          console.warn(`[BoardSync] ✗ Failed to set ${optionName}: ${optionResult.error}`);
        }
      }

      result.success = result.boardSelected && result.optionsFailed.length === 0;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Select base board (without config options)
   *
   * @param baseFqbn Base FQBN (vendor:arch:board)
   * @returns Operation result
   */
  private async selectBoard(baseFqbn: string): Promise<OperationResult> {
    const commandId = `arduino-select-board--${baseFqbn}`;

    // Wait for command to be available (boards might still be loading)
    const commandReady = await this.waitForCommand(commandId, COMMAND_WAIT_TIMEOUT_MS);

    if (!commandReady) {
      return {
        success: false,
        error: `Board "${baseFqbn}" not found. Please install the required board package.`
      };
    }

    try {
      await vscode.commands.executeCommand(commandId);
      console.log(`[BoardSync] Selected board: ${baseFqbn}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to select board: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Set individual config option
   * Pattern: {baseFqbn}-{OptionName}--{value}
   *
   * @param baseFqbn Base FQBN (vendor:arch:board)
   * @param optionName Option name (e.g., "UploadSpeed", "CPUFreq")
   * @param value Option value (e.g., "921600", "240")
   * @returns Operation result
   */
  private async setConfigOption(
    baseFqbn: string,
    optionName: string,
    value: string
  ): Promise<OperationResult> {
    const commandId = `${baseFqbn}-${optionName}--${value}`;

    // Check if command exists
    const allCommands = await vscode.commands.getCommands();
    if (!allCommands.includes(commandId)) {
      return {
        success: false,
        error: `Command not found (option may not be available for this board)`
      };
    }

    try {
      await vscode.commands.executeCommand(commandId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Wait for a command to become available
   * Commands are registered dynamically, so we need to wait
   *
   * @param commandId Command ID to wait for
   * @param timeoutMs Timeout in milliseconds
   * @returns true if command is available, false if timeout
   */
  private async waitForCommand(commandId: string, timeoutMs: number = COMMAND_WAIT_TIMEOUT_MS): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const commands = await vscode.commands.getCommands();
      if (commands.includes(commandId)) {
        return true;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, COMMAND_POLL_INTERVAL_MS));
    }

    return false; // Timeout
  }
}

// Internal type definitions

interface OperationResult {
  success: boolean;
  error?: string;
}

/**
 * FQBN (Fully Qualified Board Name) utilities
 * Centralizes all FQBN parsing, building, and formatting logic
 *
 * FQBN format: vendor:arch:board[:option1=value1,option2=value2,...]
 * Example: esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc
 */

import type { BoardDetails, ParsedFqbn } from '../types';
import { DEFAULT_MAX_OPTIONS_DISPLAY, FQBN_OPTIONS_TRUNCATION_SUFFIX } from './constants';

/**
 * Parses FQBN string into base board and config options
 * @param fqbn Full FQBN string
 * @returns Parsed FQBN with baseFqbn and options map, or null if invalid
 */
export function parseFqbn(fqbn: string): ParsedFqbn | null {
  const parts = fqbn.split(':');

  if (parts.length < 3) {
    return null;
  }

  const vendor = parts[0];
  const arch = parts[1];
  const board = parts[2];
  const baseFqbn = `${vendor}:${arch}:${board}`;

  // Parse options if present
  const options: { [key: string]: string } = {};
  if (parts.length > 3) {
    const optionsString = parts.slice(3).join(':');
    const optionPairs = optionsString.split(',');

    for (const pair of optionPairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        options[key] = value;
      }
    }
  }

  return { baseFqbn, options };
}

/**
 * Builds complete FQBN from BoardDetails (includes all config options)
 * @param boardDetails Board details from Arduino API
 * @returns Complete FQBN string or undefined if invalid
 */
export function buildCompleteFqbn(boardDetails: BoardDetails | undefined): string | undefined {
  if (!boardDetails) {
    return undefined;
  }

  // Start with base FQBN
  const baseFqbn = boardDetails.fqbn;

  // Extract selected config options
  const configOptions = boardDetails.configOptions;
  if (!configOptions || configOptions.length === 0) {
    return baseFqbn;
  }

  // Build config string from selected values
  const configPairs: string[] = [];
  for (const option of configOptions) {
    const selectedValue = option.values.find(v => v.selected);
    if (selectedValue) {
      configPairs.push(`${option.option}=${selectedValue.value}`);
    }
  }

  // Combine base FQBN with config options
  if (configPairs.length > 0) {
    return `${baseFqbn}:${configPairs.join(',')}`;
  }

  return baseFqbn;
}

/**
 * Extracts base FQBN (vendor:arch:board) without config options
 * @param fqbn Full FQBN string
 * @returns Base FQBN (vendor:arch:board)
 */
export function extractBaseFqbn(fqbn: string): string {
  const parts = fqbn.split(':');
  if (parts.length < 3) {
    return fqbn;
  }
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}

/**
 * Extracts platform ID (vendor:arch) from FQBN
 * @param fqbn Full FQBN string
 * @returns Platform ID (vendor:arch)
 */
export function extractPlatformId(fqbn: string): string {
  const parts = fqbn.split(':');
  if (parts.length < 2) {
    return fqbn;
  }
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Formats platform string with version
 *
 * Version should be extracted from runtime.platform.path using getPlatformVersion()
 * which contains the actual installed version (e.g., "2.0.18-arduino.5") rather than
 * the unreliable version property from platform.txt which may contain invalid formats
 * like "v2.0.17-arduino.5" or outdated versions.
 *
 * @param platformId Platform ID (vendor:arch)
 * @param version Optional platform version (should come from runtime.platform.path)
 * @returns Formatted platform string
 * @see getPlatformVersion in version-utils.ts
 * @see https://github.com/devista-consulting/arduino-sketch-vault/issues/1
 */
export function formatPlatformString(platformId: string, version?: string): string {
  return version ? `${platformId} (${version})` : platformId;
}

/**
 * Formats FQBN as a concise summary for display
 * Shows base board + first N config options + "..." if more exist
 * @param fqbn Full FQBN string
 * @param maxOptions Maximum number of options to display (default: 2)
 * @returns Concise FQBN summary
 * @example "esp32:esp32:esp32s3:UploadSpeed=460800,USBMode=hwcdc..."
 */
export function formatFqbnSummary(fqbn: string, maxOptions: number = DEFAULT_MAX_OPTIONS_DISPLAY): string {
  const parts = fqbn.split(':');

  // Extract base board (vendor:arch:board)
  const baseBoard = parts.slice(0, 3).join(':');

  // Extract config options (everything after the 3rd colon)
  if (parts.length <= 3) {
    return baseBoard;
  }

  const optionsString = parts.slice(3).join(':');
  const options = optionsString.split(',');

  if (options.length === 0) {
    return baseBoard;
  }

  // Show first N options
  const displayOptions = options.slice(0, maxOptions);
  const hasMore = options.length > maxOptions;

  const optionsSummary = displayOptions.join(',') + (hasMore ? FQBN_OPTIONS_TRUNCATION_SUFFIX : '');
  return `${baseBoard}:${optionsSummary}`;
}

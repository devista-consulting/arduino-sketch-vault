/**
 * FQBN (Fully Qualified Board Name) utilities
 * Centralizes all FQBN parsing, building, and formatting logic
 *
 * FQBN format: vendor:arch:board[:option1=value1,option2=value2,...]
 * Example: esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc
 */

import { FQBN, valid as isValidFqbn } from 'fqbn';
import type { BoardDetails, ParsedFqbn } from '../types';
import { DEFAULT_MAX_OPTIONS_DISPLAY } from './constants';

/**
 * Parses FQBN string into base board and config options
 * @param fqbn Full FQBN string
 * @returns Parsed FQBN with baseFqbn and options map, or null if invalid
 */
export function parseFqbn(fqbn: string): ParsedFqbn | null {
  if (!isValidFqbn(fqbn)) {
    return null;
  }
  const parsed = new FQBN(fqbn);
  return { baseFqbn: parsed.toString(true), options: parsed.options ?? {} };
}

/**
 * Builds complete FQBN from BoardDetails (includes all config options)
 * @param boardDetails Board details from Arduino API
 * @returns Complete FQBN string or undefined if invalid
 */
export function buildCompleteFqbn(boardDetails: BoardDetails | undefined): string | undefined {
  if (!boardDetails?.fqbn) {
    return undefined;
  }

  const parsed = new FQBN(boardDetails.fqbn);
  try {
    return parsed
      .withConfigOptions(...boardDetails.configOptions)
      .toString();
  } catch (e) {
    if (e instanceof Error && e.name === 'ConfigOptionError') {
      return parsed.toString();
    }
    throw e
  }
}

/**
 * Extracts base FQBN (vendor:arch:board) without config options
 * @param fqbn Full FQBN string
 * @returns Base FQBN (vendor:arch:board)
 */
export function extractBaseFqbn(fqbn: string): string {
  if (!isValidFqbn(fqbn)) {
    return fqbn;
  }
  return new FQBN(fqbn).toString(true);
}

/**
 * Extracts platform ID (vendor:arch) from FQBN
 * @param fqbn Full FQBN string
 * @returns Platform ID (vendor:arch)
 */
export function extractPlatformId(fqbn: string): string {
  if (!isValidFqbn(fqbn)) {
    return fqbn;
  }
  const { vendor, arch } = new FQBN(fqbn);
  return `${vendor}:${arch}`;
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
  const parsed = new FQBN(fqbn);
  const limited = parsed.limitConfigOptions(maxOptions);
  const appendEllipses =
    Object.entries(parsed.options ?? {}).length > maxOptions;
  const appendColon =
    appendEllipses && Object.entries(limited.options ?? {}).length === 0;
  return `${limited.toString()}${appendColon ? ':' : ''}${
    appendEllipses ? '...' : ''
  }`;
}

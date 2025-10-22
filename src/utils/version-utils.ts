/**
 * Utility functions for extracting platform version information
 */

/**
 * Extracts the platform version from runtime.platform.path
 *
 * The runtime.platform.path contains the full installation path like:
 * /Users/tibor/Library/Arduino15/packages/arduino/hardware/esp32/2.0.18-arduino.5
 *
 * This function extracts the version (last part of the path) which represents
 * the actual installed version, unlike platform.txt which may contain outdated
 * or invalid version strings.
 *
 * @param buildProperties - Board build properties object
 * @param platformId - Platform identifier (e.g., "esp32:esp32", "arduino:avr")
 * @returns Platform version string or undefined if not found
 *
 * @example
 * const version = extractPlatformVersionFromPath(buildProperties, "arduino:esp32");
 * // Returns: "2.0.18-arduino.5"
 */
export function extractPlatformVersionFromPath(
  buildProperties: Record<string, string> | undefined,
  platformId: string
): string | undefined {
  if (!buildProperties) {
    return undefined;
  }

  const runtimePlatformPath = buildProperties['runtime.platform.path'];
  if (!runtimePlatformPath) {
    return undefined;
  }

  // Extract vendor:arch from platformId (e.g., "esp32:esp32" or "arduino:avr")
  const [vendor, arch] = platformId.split(':');
  if (!vendor || !arch) {
    return undefined;
  }

  // The path structure is: /path/to/packages/{vendor}/hardware/{arch}/{version}/
  // Example: /Users/tibor/Library/Arduino15/packages/arduino/hardware/esp32/2.0.18-arduino.5

  // Build the pattern to match: /{vendor}/hardware/{arch}/
  const pattern = `/${vendor}/hardware/${arch}/`;
  const patternIndex = runtimePlatformPath.indexOf(pattern);

  if (patternIndex === -1) {
    return undefined;
  }

  // Extract everything after the pattern
  const afterPattern = runtimePlatformPath.substring(patternIndex + pattern.length);

  // The version is the first directory after the pattern (before next /)
  const versionMatch = afterPattern.match(/^([^/]+)/);

  if (!versionMatch) {
    return undefined;
  }

  return versionMatch[1];
}

/**
 * Gets platform version from buildProperties, trying runtime.platform.path first,
 * falling back to the version property if needed.
 *
 * @param buildProperties - Board build properties object
 * @param platformId - Platform identifier (e.g., "esp32:esp32", "arduino:avr")
 * @returns Platform version string or undefined if not found
 */
export function getPlatformVersion(
  buildProperties: Record<string, string> | undefined,
  platformId: string
): string | undefined {
  // Try to extract from runtime.platform.path (most reliable)
  const pathVersion = extractPlatformVersionFromPath(buildProperties, platformId);

  if (pathVersion) {
    return pathVersion;
  }

  // Fallback to version property (may be outdated/invalid)
  return buildProperties?.['version'];
}

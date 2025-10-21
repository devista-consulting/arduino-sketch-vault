/**
 * Central constants file for Arduino Sketch Vault
 * All magic strings, timeout values, and configuration keys
 */

// File names
export const SKETCH_YAML_FILENAME = 'sketch.yaml';
export const LOG_FILENAME = '.arduino-sketch-vault.json';

// Icons
export const CIRCUIT_BOARD_ICON = 'circuit-board';
export const CHECK_ICON = 'check';

// Timeouts and delays
export const COMMAND_WAIT_TIMEOUT_MS = 10000; // 10 seconds
export const COMMAND_POLL_INTERVAL_MS = 500; // 500ms
export const STARTUP_DELAY_MS = 1000; // 1 second
export const SKETCH_YAML_PROMPT_DELAY_MS = 2000; // 2 seconds

// Command IDs
export const COMMAND_CLEAR_LOGS = 'arduino-sketch-vault.clearLogs';
export const COMMAND_SHOW_LOGS = 'arduino-sketch-vault.showLogs';
export const COMMAND_CREATE_SKETCH_YAML = 'arduino-sketch-vault.createSketchYaml';
export const COMMAND_TOGGLE_UPLOAD_SPEED = 'arduino-sketch-vault.toggleUploadSpeed';
export const COMMAND_APPLY_SKETCH_YAML = 'arduino-sketch-vault.applySketchYaml';
export const COMMAND_SHOW_CONFIGURATIONS = 'arduino-sketch-vault.showConfigurations';
export const COMMAND_CREATE_CONFIGURATION = 'arduino-sketch-vault.createConfiguration';

// Arduino Command Patterns
export const ARDUINO_SELECT_BOARD_PREFIX = 'arduino-select-board--';
export const ARDUINO_API_EXTENSION_ID = 'dankeboy36.vscode-arduino-api';

// Configuration Keys
export const CONFIG_AUTO_UPDATE_SKETCH_YAML = 'arduino-sketch-vault.autoUpdateSketchYaml';

// Defaults
export const DEFAULT_PROFILE_NAME = 'default';

// Output Channel Name
export const OUTPUT_CHANNEL_NAME = 'Arduino Sketch Vault';

// Status Bar
export const STATUS_BAR_PRIORITY = 100;
export const STATUS_BAR_DEFAULT_TEXT = 'Vault';
export const STATUS_BAR_TOOLTIP_BASE = 'Board Configurations (Arduino Sketch Vault)';

// Profile Validation
export const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const PROFILE_NAME_ERROR = 'Profile name can only contain letters, numbers, hyphens, and underscores';

// FQBN Formatting
export const DEFAULT_MAX_OPTIONS_DISPLAY = 2;
export const FQBN_OPTIONS_TRUNCATION_SUFFIX = '...';

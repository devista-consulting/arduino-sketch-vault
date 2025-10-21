// Re-export types from vscode-arduino-api for convenience
export type {
  ArduinoContext,
  ArduinoState,
  BoardDetails,
  ConfigOption,
  ConfigValue,
  Port,
  Programmer,
  CompileSummary,
} from 'vscode-arduino-api';

// Log entry types
export interface LogEntry {
  readonly timestamp: string;
  readonly sketchPath: string | undefined;
  readonly fqbn: string;
  readonly board: {
    readonly name: string;
    readonly fqbn: string;
  };
  readonly port?: {
    readonly address: string;
    readonly protocol: string;
  };
  readonly changes: ConfigChange[];
  readonly programmer?: {
    readonly id: string;
    readonly name: string;
  };
  readonly changeType: 'initial' | 'fqbn' | 'board' | 'port';
}

export interface ConfigChange {
  readonly option: string;
  readonly label: string;
  readonly previousValue: string | undefined;
  readonly newValue: string;
  readonly previousLabel: string | undefined;
  readonly newLabel: string;
}

// Profile types (from profile-service.ts)
export interface Profile {
  name: string;
  fqbn: string;
  libraries?: string[];
}

// Sketch YAML types (from sketch-yaml-service.ts)
export interface SketchYamlProfile {
  fqbn: string;
  platforms: Array<{ platform: string }>;
  libraries?: string[];
}

export interface SketchYamlStructure {
  profiles: {
    [key: string]: SketchYamlProfile;
  };
  default_profile: string;
}

// Board sync types (from board-sync-service.ts)
export interface ParsedFqbn {
  baseFqbn: string;
  options: { [key: string]: string };
}

export interface ApplyResult {
  success: boolean;
  boardSelected: boolean;
  optionsApplied: Array<{ option: string; value: string }>;
  optionsFailed: Array<{ option: string; value: string; reason?: string }>;
  errors: string[];
}

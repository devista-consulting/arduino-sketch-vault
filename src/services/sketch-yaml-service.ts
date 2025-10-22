import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { ArduinoContext, BoardDetails, SketchYamlProfile, SketchYamlStructure } from '../types';
import { buildCompleteFqbn, extractPlatformId, formatPlatformString } from '../utils/fqbn-utils';
import { getPlatformVersion } from '../utils/version-utils';
import { SKETCH_YAML_FILENAME, DEFAULT_PROFILE_NAME, CONFIG_AUTO_UPDATE_SKETCH_YAML } from '../utils/constants';

export class SketchYamlService {

  /**
   * Checks if sketch.yaml exists in the workspace
   */
  static hasSketchYaml(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    const sketchYamlPath = path.join(
      workspaceFolders[0].uri.fsPath,
      SKETCH_YAML_FILENAME
    );
    return fs.existsSync(sketchYamlPath);
  }

  /**
   * Reads and parses sketch.yaml from the workspace
   */
  static async readSketchYaml(): Promise<SketchYamlStructure | undefined> {
    const sketchYamlPath = this.getSketchYamlPath();
    if (!sketchYamlPath || !fs.existsSync(sketchYamlPath)) {
      return undefined;
    }

    try {
      const content = fs.readFileSync(sketchYamlPath, 'utf-8');
      const parsed = yaml.load(content) as SketchYamlStructure;
      return parsed;
    } catch (error) {
      console.error('[SketchYamlService] Failed to read sketch.yaml:', error);
      throw new Error(`Failed to parse sketch.yaml: ${error}`);
    }
  }

  /**
   * Gets the path to sketch.yaml in the workspace
   */
  static getSketchYamlPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    return path.join(workspaceFolders[0].uri.fsPath, SKETCH_YAML_FILENAME);
  }

  /**
   * Creates a sketch.yaml file with the current Arduino configuration
   */
  static async createSketchYaml(
    arduinoContext: ArduinoContext
  ): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }

    const { fqbn, boardDetails } = arduinoContext;
    if (!fqbn) {
      throw new Error('No board selected. Please select a board first.');
    }

    // Build complete FQBN from boardDetails
    const completeFqbn = buildCompleteFqbn(boardDetails);
    if (!completeFqbn) {
      throw new Error('Failed to build complete FQBN from board details');
    }

    const sketchYamlPath = path.join(
      workspaceFolders[0].uri.fsPath,
      SKETCH_YAML_FILENAME
    );

    // Check if file already exists
    if (fs.existsSync(sketchYamlPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        'sketch.yaml already exists. Do you want to overwrite it?',
        'Yes',
        'No'
      );
      if (overwrite !== 'Yes') {
        return;
      }
    }

    // Use complete FQBN built from configOptions
    const content = this.generateSketchYamlContent(completeFqbn, boardDetails);

    fs.writeFileSync(sketchYamlPath, content, 'utf-8');

    // Open the file for user to review
    const doc = await vscode.workspace.openTextDocument(sketchYamlPath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      'sketch.yaml created successfully! You can now edit it to add libraries.'
    );
  }

  /**
   * Generates the content for sketch.yaml based on current board configuration
   */
  private static generateSketchYamlContent(
    fqbn: string,
    boardDetails: BoardDetails | undefined
  ): string {
    // Extract platform from FQBN
    const platformId = extractPlatformId(fqbn);

    // Get platform version from runtime.platform.path (most reliable source)
    const platformVersion = getPlatformVersion(boardDetails?.buildProperties, platformId);

    // Build platform string with version if available
    const platformString = formatPlatformString(platformId, platformVersion);

    const sketchYaml: SketchYamlStructure = {
      profiles: {
        [DEFAULT_PROFILE_NAME]: {
          fqbn: fqbn,
          platforms: [{ platform: platformString }],
          libraries: []
        }
      },
      default_profile: DEFAULT_PROFILE_NAME
    };

    // Convert to YAML with custom options
    let yamlContent = yaml.dump(sketchYaml, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    // Add helpful comments for libraries section
    yamlContent += '\n# Add your libraries here in the format:\n';
    yamlContent += '# libraries:\n';
    yamlContent += '#   - LibraryName (version)\n';
    yamlContent += '# Example:\n';
    yamlContent += '#   - ArduinoJson (7.2.1)\n';
    yamlContent += '#   - NimBLE-Arduino (2.3.4)\n';

    return yamlContent;
  }

  /**
   * Prompts user to create sketch.yaml if it doesn't exist
   */
  static async promptToCreateSketchYaml(
    arduinoContext: ArduinoContext
  ): Promise<void> {
    const create = await vscode.window.showInformationMessage(
      'No sketch.yaml found. Would you like to create one to track your board configuration and libraries?',
      'Create sketch.yaml',
      'Not now'
    );

    if (create === 'Create sketch.yaml') {
      try {
        await this.createSketchYaml(arduinoContext);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create sketch.yaml: ${error}`
        );
      }
    }
  }

  /**
   * Updates the FQBN in an existing sketch.yaml file
   */
  static async updateSketchYamlFqbn(
    fqbn: string,
    boardDetails: BoardDetails | undefined,
    silent: boolean = false
  ): Promise<void> {
    const sketchYamlPath = this.getSketchYamlPath();
    if (!sketchYamlPath || !fs.existsSync(sketchYamlPath)) {
      if (!silent) {
        console.log('[SketchYamlService] No sketch.yaml found to update');
      }
      return;
    }

    // Build complete FQBN from boardDetails
    const completeFqbn = buildCompleteFqbn(boardDetails);
    if (!completeFqbn) {
      console.error('[SketchYamlService] Failed to build complete FQBN');
      return;
    }

    try {
      // Read the existing file
      const content = fs.readFileSync(sketchYamlPath, 'utf-8');

      // Update the FQBN line with complete FQBN
      const updatedContent = this.updateFqbnInYaml(content, completeFqbn, boardDetails);

      // Write back to file
      fs.writeFileSync(sketchYamlPath, updatedContent, 'utf-8');

      if (!silent) {
        console.log(`Updated sketch.yaml with new FQBN: ${completeFqbn}`);
        vscode.window.showInformationMessage(
          'sketch.yaml updated with new board configuration'
        );
      }
    } catch (error) {
      console.error('[SketchYamlService] Failed to update sketch.yaml:', error);
      if (!silent) {
        vscode.window.showErrorMessage(
          `Failed to update sketch.yaml: ${error}`
        );
      }
    }
  }

  /**
   * Updates the FQBN line in YAML content while preserving everything else
   */
  private static updateFqbnInYaml(
    content: string,
    newFqbn: string,
    boardDetails: BoardDetails | undefined
  ): string {
    try {
      // Parse existing YAML
      const sketchYaml = yaml.load(content) as SketchYamlStructure;

      if (!sketchYaml || !sketchYaml.profiles) {
        console.warn('Invalid sketch.yaml structure');
        return content;
      }

      // Update FQBN in default profile
      const defaultProfile = sketchYaml.default_profile || DEFAULT_PROFILE_NAME;
      if (!sketchYaml.profiles[defaultProfile]) {
        console.warn(`Profile "${defaultProfile}" not found in sketch.yaml`);
        return content;
      }

      // Update FQBN
      sketchYaml.profiles[defaultProfile].fqbn = newFqbn;

      // Update platform to match new FQBN
      const platformId = extractPlatformId(newFqbn);
      const platformVersion = getPlatformVersion(boardDetails?.buildProperties, platformId);
      const platformString = formatPlatformString(platformId, platformVersion);

      // Update or create platforms array
      if (!sketchYaml.profiles[defaultProfile].platforms) {
        sketchYaml.profiles[defaultProfile].platforms = [];
      }

      if (sketchYaml.profiles[defaultProfile].platforms.length > 0) {
        sketchYaml.profiles[defaultProfile].platforms[0] = { platform: platformString };
      } else {
        sketchYaml.profiles[defaultProfile].platforms.push({ platform: platformString });
      }

      // Convert back to YAML
      const updatedYaml = yaml.dump(sketchYaml, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      return updatedYaml;
    } catch (error) {
      console.error('Error parsing or updating sketch.yaml:', error);
      return content;
    }
  }

  /**
   * Checks if auto-update is enabled in configuration
   */
  static isAutoUpdateEnabled(): boolean {
    const config = vscode.workspace.getConfiguration();
    return config.get<boolean>(CONFIG_AUTO_UPDATE_SKETCH_YAML, true);
  }

  /**
   * Writes sketch.yaml structure to file
   */
  static async writeSketchYaml(yamlContent: SketchYamlStructure): Promise<void> {
    const sketchYamlPath = this.getSketchYamlPath();
    if (!sketchYamlPath) {
      throw new Error('No workspace folder open');
    }

    try {
      const yamlString = yaml.dump(yamlContent, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      fs.writeFileSync(sketchYamlPath, yamlString, 'utf-8');
      console.log('[SketchYamlService] sketch.yaml written successfully');
    } catch (error) {
      console.error('[SketchYamlService] Failed to write sketch.yaml:', error);
      throw error;
    }
  }

  /**
   * Updates the default_profile field in sketch.yaml
   */
  static async updateDefaultProfile(profileName: string): Promise<void> {
    const sketchYamlPath = this.getSketchYamlPath();
    if (!sketchYamlPath || !fs.existsSync(sketchYamlPath)) {
      console.log('[SketchYamlService] No sketch.yaml found to update default profile');
      return;
    }

    try {
      // Read the existing file
      const content = fs.readFileSync(sketchYamlPath, 'utf-8');
      const sketchYaml = yaml.load(content) as SketchYamlStructure;

      if (!sketchYaml || !sketchYaml.profiles) {
        console.warn('Invalid sketch.yaml structure');
        return;
      }

      // Check if the profile exists
      if (!sketchYaml.profiles[profileName]) {
        console.warn(`Profile "${profileName}" not found in sketch.yaml`);
        return;
      }

      // Update default_profile
      sketchYaml.default_profile = profileName;

      // Convert back to YAML
      const updatedYaml = yaml.dump(sketchYaml, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      // Write back to file
      fs.writeFileSync(sketchYamlPath, updatedYaml, 'utf-8');

      console.log(`[SketchYamlService] Updated default_profile to: ${profileName}`);
    } catch (error) {
      console.error('[SketchYamlService] Failed to update default_profile:', error);
    }
  }
}

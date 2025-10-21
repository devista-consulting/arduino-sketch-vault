import * as vscode from 'vscode';
import type { ArduinoContext, BoardDetails, Profile, SketchYamlStructure } from '../types';
import { SketchYamlService } from './sketch-yaml-service';
import { BoardSyncService } from './board-sync-service';
import { buildCompleteFqbn, formatFqbnSummary, extractPlatformId, formatPlatformString } from '../utils/fqbn-utils';
import { DEFAULT_PROFILE_NAME, PROFILE_NAME_PATTERN, PROFILE_NAME_ERROR } from '../utils/constants';

export class ProfileService {
  /**
   * Get all profiles from sketch.yaml
   */
  async getProfiles(): Promise<Profile[]> {
    if (!SketchYamlService.hasSketchYaml()) {
      return [];
    }

    try {
      const yamlContent = await SketchYamlService.readSketchYaml();
      if (!yamlContent?.profiles) {
        return [];
      }

      const profiles: Profile[] = [];
      for (const [name, profile] of Object.entries(yamlContent.profiles)) {
        if (profile.fqbn) {
          profiles.push({
            name,
            fqbn: profile.fqbn,
            libraries: profile.libraries,
          });
        }
      }

      return profiles;
    } catch (error) {
      console.error('[ProfileService] Error reading profiles:', error);
      return [];
    }
  }

  /**
   * Get the active profile based on default_profile in sketch.yaml
   */
  async getActiveProfile(arduinoContext: ArduinoContext): Promise<Profile | undefined> {
    const profiles = await this.getProfiles();
    if (profiles.length === 0) {
      return undefined;
    }

    // Read the default_profile from sketch.yaml
    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      return undefined;
    }

    // Find and return the default profile
    const defaultProfile = profiles.find(p => p.name === defaultProfileName);
    return defaultProfile;
  }

  /**
   * Get the default profile name from sketch.yaml
   */
  async getDefaultProfileName(): Promise<string | undefined> {
    if (!SketchYamlService.hasSketchYaml()) {
      return undefined;
    }

    try {
      const yamlContent = await SketchYamlService.readSketchYaml();
      return yamlContent?.default_profile || DEFAULT_PROFILE_NAME;
    } catch (error) {
      console.error('[ProfileService] Error reading default profile:', error);
      return undefined;
    }
  }

  /**
   * Apply a profile (switch to it)
   */
  async applyProfile(profileName: string): Promise<boolean> {
    if (!SketchYamlService.hasSketchYaml()) {
      vscode.window.showErrorMessage('No sketch.yaml found in workspace.');
      return false;
    }

    try {
      const yamlContent = await SketchYamlService.readSketchYaml();
      if (!yamlContent?.profiles) {
        vscode.window.showErrorMessage('No profiles found in sketch.yaml.');
        return false;
      }

      const profile = yamlContent.profiles[profileName];
      if (!profile?.fqbn) {
        vscode.window.showErrorMessage(`Profile "${profileName}" not found or has no FQBN.`);
        return false;
      }

      console.log('[ProfileService] Applying profile:', profileName);
      console.log('[ProfileService] FQBN:', profile.fqbn);

      // IMPORTANT: Update default_profile BEFORE applying FQBN to Arduino IDE
      // This prevents auto-update from updating the wrong profile when change events fire
      await SketchYamlService.updateDefaultProfile(profileName);

      // Apply configuration using BoardSyncService
      const syncService = new BoardSyncService();
      const result = await syncService.applyFqbn(profile.fqbn);

      if (result.success) {

        const appliedOptions = result.optionsApplied
          .map(o => `${o.option}=${o.value}`)
          .join(', ');

        vscode.window.showInformationMessage(
          `✅ Profile "${profileName}" applied successfully!\n\n` +
          `Board: ${profile.fqbn}\n` +
          `Options applied: ${result.optionsApplied.length}` +
          `${appliedOptions ? `\n(${appliedOptions})` : ''}`
        );

        console.log('[ProfileService] ✅ Profile applied successfully');
        return true;
      } else {
        // Note: default_profile was already updated before applying FQBN
        const errorMessage = result.errors.join(', ');
        vscode.window.showWarningMessage(
          `⚠️ Profile "${profileName}" partially applied\n\n` +
          `Board selected: ${result.boardSelected ? 'Yes' : 'No'}\n` +
          `Options applied: ${result.optionsApplied.length}\n` +
          `Options failed: ${result.optionsFailed.length}\n\n` +
          `${errorMessage ? `Errors: ${errorMessage}` : ''}`
        );

        console.warn('[ProfileService] ⚠️ Partial success or failure');
        console.warn('[ProfileService] Errors:', result.errors);
        return false;
      }
    } catch (error) {
      console.error('[ProfileService] Error applying profile:', error);
      vscode.window.showErrorMessage(`Failed to apply profile: ${error}`);
      return false;
    }
  }

  /**
   * Apply the default profile from sketch.yaml on startup
   */
  async applyDefaultProfile(silent: boolean = false, promptUser: boolean = false): Promise<boolean> {
    if (!SketchYamlService.hasSketchYaml()) {
      if (!silent) {
        console.log('[ProfileService] No sketch.yaml found to apply default profile');
      }
      return false;
    }

    try {
      const defaultProfileName = await this.getDefaultProfileName();
      if (!defaultProfileName) {
        if (!silent) {
          console.log('[ProfileService] No default_profile found in sketch.yaml');
        }
        return false;
      }

      const yamlContent = await SketchYamlService.readSketchYaml();
      if (!yamlContent?.profiles) {
        if (!silent) {
          console.log('[ProfileService] No profiles found in sketch.yaml');
        }
        return false;
      }

      const profile = yamlContent.profiles[defaultProfileName];
      if (!profile?.fqbn) {
        console.warn(`[ProfileService] Profile "${defaultProfileName}" not found or has no FQBN`);
        return false;
      }

      // Prompt user if requested
      if (promptUser) {
        const boardName = profile.fqbn.split(':').slice(0, 3).join(':');
        const apply = await vscode.window.showInformationMessage(
          `Apply board configuration from sketch.yaml?\n\nProfile: ${defaultProfileName}\nBoard: ${boardName}`,
          'Yes',
          'No'
        );

        if (apply !== 'Yes') {
          console.log(`[ProfileService] User declined to apply default profile "${defaultProfileName}"`);
          return false;
        }
      }

      console.log(`[ProfileService] Applying default profile "${defaultProfileName}" on startup`);
      console.log(`[ProfileService] FQBN: ${profile.fqbn}`);

      // Apply configuration using BoardSyncService
      const syncService = new BoardSyncService();
      const result = await syncService.applyFqbn(profile.fqbn);

      if (result.success) {
        console.log(`[ProfileService] ✅ Default profile "${defaultProfileName}" applied successfully`);

        if (!silent) {
          const appliedOptions = result.optionsApplied
            .map(o => `${o.option}=${o.value}`)
            .join(', ');

          vscode.window.showInformationMessage(
            `✅ Applied profile "${defaultProfileName}" from sketch.yaml\n` +
            `${appliedOptions ? `Options: ${appliedOptions}` : ''}`
          );
        }

        return true;
      } else {
        console.warn(`[ProfileService] ⚠️ Failed to apply default profile "${defaultProfileName}"`);
        console.warn('[ProfileService] Errors:', result.errors);

        if (!silent) {
          vscode.window.showWarningMessage(
            `⚠️ Failed to apply profile "${defaultProfileName}" from sketch.yaml\n\n` +
            `Board selected: ${result.boardSelected ? 'Yes' : 'No'}\n` +
            `Options applied: ${result.optionsApplied.length}\n` +
            `Options failed: ${result.optionsFailed.length}`
          );
        }

        return false;
      }
    } catch (error) {
      console.error('[ProfileService] Error applying default profile:', error);
      if (!silent) {
        vscode.window.showErrorMessage(`Failed to apply default profile: ${error}`);
      }
      return false;
    }
  }

  /**
   * Show profile picker and apply selected profile
   */
  async showProfilePicker(arduinoContext: ArduinoContext): Promise<void> {
    const profiles = await this.getProfiles();

    if (profiles.length === 0) {
      vscode.window.showInformationMessage(
        'No profiles found. Create a sketch.yaml file with profiles first.'
      );
      return;
    }

    const defaultProfileName = await this.getDefaultProfileName();

    // Create quick pick items with custom type
    interface ProfileQuickPickItem extends vscode.QuickPickItem {
      profile: Profile;
    }

    const items: ProfileQuickPickItem[] = profiles.map(profile => ({
      label: profile.name,
      description: formatFqbnSummary(profile.fqbn),
      detail: defaultProfileName === profile.name ? '$(check) Active' : undefined,
      profile,
    }));

    // Create quick pick with manual control to set active item
    const quickPick = vscode.window.createQuickPick<ProfileQuickPickItem>();
    quickPick.title = 'Arduino Sketch Vault - Board Configurations';
    quickPick.placeholder = 'Select a board configuration profile';
    quickPick.items = items;

    // Pre-select the active profile
    const activeItem = items.find(item => item.profile.name === defaultProfileName);
    if (activeItem) {
      quickPick.activeItems = [activeItem];
    }

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      if (selected) {
        this.applyProfile(selected.profile.name);
      }
      quickPick.hide();
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
  }

  /**
   * Create a new profile with current Arduino IDE configuration
   */
  async createConfiguration(arduinoContext: ArduinoContext): Promise<void> {
    // Check if sketch.yaml exists
    if (!SketchYamlService.hasSketchYaml()) {
      const createFile = await vscode.window.showInformationMessage(
        'No sketch.yaml found. Would you like to create one?',
        'Yes',
        'No'
      );

      if (createFile !== 'Yes') {
        return;
      }

      // Create sketch.yaml with default profile
      try {
        await SketchYamlService.createSketchYaml(arduinoContext);
        vscode.window.showInformationMessage(
          'sketch.yaml created with "default" profile. You can now create additional profiles.'
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create sketch.yaml: ${error}`);
        return;
      }
    }

    // Prompt for profile name
    const profileName = await vscode.window.showInputBox({
      prompt: 'Enter a name for the new configuration profile',
      placeHolder: 'e.g., production, development, test',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Profile name cannot be empty';
        }
        if (!PROFILE_NAME_PATTERN.test(value)) {
          return PROFILE_NAME_ERROR;
        }
        return null;
      }
    });

    if (!profileName) {
      return; // User cancelled
    }

    // Check if profile already exists
    const profiles = await this.getProfiles();
    if (profiles.some(p => p.name === profileName)) {
      vscode.window.showErrorMessage(`Profile "${profileName}" already exists.`);
      return;
    }

    // Get current Arduino IDE configuration
    const { fqbn, boardDetails } = arduinoContext;
    if (!fqbn || !boardDetails) {
      vscode.window.showErrorMessage('No board configuration found. Please select a board first.');
      return;
    }

    // Build complete FQBN from boardDetails
    const completeFqbn = buildCompleteFqbn(boardDetails);
    if (!completeFqbn) {
      vscode.window.showErrorMessage('Failed to build FQBN from board details.');
      return;
    }

    try {
      // Add new profile to sketch.yaml
      await this.addProfileToSketchYaml(profileName, completeFqbn, boardDetails);

      // Ask if user wants to switch to this profile
      const switchToProfile = await vscode.window.showInformationMessage(
        `Profile "${profileName}" created successfully! Switch to it now?`,
        'Yes',
        'No'
      );

      if (switchToProfile === 'Yes') {
        await SketchYamlService.updateDefaultProfile(profileName);
        vscode.window.showInformationMessage(`Switched to profile "${profileName}"`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create profile: ${error}`);
    }
  }

  /**
   * Add a new profile to sketch.yaml
   */
  private async addProfileToSketchYaml(
    profileName: string,
    fqbn: string,
    boardDetails: BoardDetails
  ): Promise<void> {
    const yamlContent = await SketchYamlService.readSketchYaml();
    if (!yamlContent) {
      throw new Error('Failed to read sketch.yaml');
    }

    // Extract platform from FQBN
    const platformId = extractPlatformId(fqbn);

    // Try to get platform version from buildProperties
    const platformVersion = boardDetails?.buildProperties?.['version'];

    // Build platform string with version if available
    const platformString = formatPlatformString(platformId, platformVersion);

    // Add new profile
    yamlContent.profiles[profileName] = {
      fqbn: fqbn,
      platforms: [{ platform: platformString }],
      libraries: []
    };

    // Write back to sketch.yaml
    await SketchYamlService.writeSketchYaml(yamlContent);

    console.log(`[ProfileService] Created profile "${profileName}" with FQBN: ${fqbn}`);
  }

}

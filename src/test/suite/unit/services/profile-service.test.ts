/**
 * Unit tests for ProfileService
 */

import { ProfileService } from '../../../../services/profile-service';
import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { BoardSyncService } from '../../../../services/board-sync-service';
import { MockArduinoContext, createESP32S3BoardDetails } from '../../../mocks/arduino-api-mock';
import type { SketchYamlStructure, ApplyResult } from '../../../../types';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockArduinoContext: MockArduinoContext;
  let hasSketchYamlStub: sinon.SinonStub;
  let readSketchYamlStub: sinon.SinonStub;
  let updateDefaultProfileStub: sinon.SinonStub;
  let applyFqbnStub: sinon.SinonStub;
  let showErrorMessageSpy: jest.SpyInstance;
  let showInformationMessageSpy: jest.SpyInstance;
  let showWarningMessageSpy: jest.SpyInstance;
  let showInputBoxSpy: jest.SpyInstance;
  let createQuickPickSpy: jest.SpyInstance;
  let writeSketchYamlStub: sinon.SinonStub;

  const mockSingleProfileYaml: SketchYamlStructure = {
    profiles: {
      default: {
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
        platforms: [{ platform: 'esp32:esp32 (3.0.7)' }],
        libraries: []
      }
    },
    default_profile: 'default'
  };

  const mockMultiProfileYaml: SketchYamlStructure = {
    profiles: {
      default: {
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
        platforms: [{ platform: 'esp32:esp32 (3.0.7)' }],
        libraries: []
      },
      production: {
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=460800',
        platforms: [{ platform: 'esp32:esp32 (3.0.7)' }],
        libraries: ['WiFi', 'HTTPClient']
      },
      debug: {
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=115200',
        platforms: [{ platform: 'esp32:esp32 (3.0.7)' }],
        libraries: []
      }
    },
    default_profile: 'default'
  };

  beforeEach(() => {
    profileService = new ProfileService();
    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
    mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

    // Create stubs
    hasSketchYamlStub = sinon.stub(SketchYamlService, 'hasSketchYaml');
    readSketchYamlStub = sinon.stub(SketchYamlService, 'readSketchYaml');
    updateDefaultProfileStub = sinon.stub(SketchYamlService, 'updateDefaultProfile');
    writeSketchYamlStub = sinon.stub(SketchYamlService, 'writeSketchYaml');
    applyFqbnStub = sinon.stub(BoardSyncService.prototype, 'applyFqbn');

    // Create spies
    showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
    showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
    showWarningMessageSpy = jest.spyOn(vscode.window, 'showWarningMessage');
    showInputBoxSpy = jest.spyOn(vscode.window, 'showInputBox');
    createQuickPickSpy = jest.spyOn(vscode.window, 'createQuickPick');
  });

  afterEach(() => {
    sinon.restore();
    jest.restoreAllMocks();
  });

  describe('getProfiles', () => {
    it('should return empty array when no sketch.yaml exists', async () => {
      hasSketchYamlStub.returns(false);

      const profiles = await profileService.getProfiles();

      expect(profiles).toEqual([]);
    });

    it('should return single profile from sketch.yaml', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const profiles = await profileService.getProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual({
        name: 'default',
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
        libraries: []
      });
    });

    it('should return multiple profiles from sketch.yaml', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);

      const profiles = await profileService.getProfiles();

      expect(profiles).toHaveLength(3);
      expect(profiles.map(p => p.name)).toEqual(['default', 'production', 'debug']);

      const prodProfile = profiles.find(p => p.name === 'production');
      expect(prodProfile?.libraries).toEqual(['WiFi', 'HTTPClient']);
    });

    it('should handle sketch.yaml read errors gracefully', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.rejects(new Error('Read failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const profiles = await profileService.getProfiles();

      expect(profiles).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array when yamlContent is undefined', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(undefined);

      const profiles = await profileService.getProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe('getActiveProfile', () => {
    it('should return undefined when no profiles exist', async () => {
      hasSketchYamlStub.returns(false);

      const activeProfile = await profileService.getActiveProfile(mockArduinoContext);

      expect(activeProfile).toBeUndefined();
    });

    it('should return the default profile', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const activeProfile = await profileService.getActiveProfile(mockArduinoContext);

      expect(activeProfile).toBeDefined();
      expect(activeProfile?.name).toBe('default');
    });

    it('should return the active profile from multi-profile setup', async () => {
      const yamlWithDifferentDefault = {
        ...mockMultiProfileYaml,
        default_profile: 'production'
      };

      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(yamlWithDifferentDefault);

      const activeProfile = await profileService.getActiveProfile(mockArduinoContext);

      expect(activeProfile?.name).toBe('production');
      expect(activeProfile?.libraries).toEqual(['WiFi', 'HTTPClient']);
    });
  });

  describe('getDefaultProfileName', () => {
    it('should return undefined when no sketch.yaml exists', async () => {
      hasSketchYamlStub.returns(false);

      const name = await profileService.getDefaultProfileName();

      expect(name).toBeUndefined();
    });

    it('should return default_profile from sketch.yaml', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const name = await profileService.getDefaultProfileName();

      expect(name).toBe('default');
    });

    it('should return "default" when default_profile field is missing', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: { default: { fqbn: 'test', platforms: [], libraries: [] } }
      } as any);

      const name = await profileService.getDefaultProfileName();

      expect(name).toBe('default');
    });
  });

  describe('applyProfile', () => {

    it('should return false when no sketch.yaml exists', async () => {
      hasSketchYamlStub.returns(false);

      const result = await profileService.applyProfile('production');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith('No sketch.yaml found in workspace.');
    });

    it('should successfully apply profile', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);
      updateDefaultProfileStub.resolves();

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [
          { option: 'UploadSpeed', value: '460800' }
        ],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyProfile('production');

      expect(result).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalled();
    });

    it('should update default_profile BEFORE applying FQBN (race condition prevention)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);
      updateDefaultProfileStub.resolves();

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      await profileService.applyProfile('production');

      // CRITICAL TEST: Verify updateDefaultProfile was called BEFORE applyFqbn
      expect(updateDefaultProfileStub.calledBefore(applyFqbnStub)).toBe(true);
      expect(updateDefaultProfileStub.calledWith('production')).toBe(true);
    });

    it('should handle partial success (board selected but some options failed)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);
      updateDefaultProfileStub.resolves();

      const partialResult: ApplyResult = {
        success: false,
        boardSelected: true,
        optionsApplied: [{ option: 'UploadSpeed', value: '460800' }],
        optionsFailed: [{ option: 'USBMode', value: 'hwcdc', reason: 'Not available' }],
        errors: ['Some options failed']
      };
      applyFqbnStub.resolves(partialResult);

      const result = await profileService.applyProfile('production');

      expect(result).toBe(false);
      expect(showWarningMessageSpy).toHaveBeenCalled();
    });

    it('should handle non-existent profile', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const result = await profileService.applyProfile('nonexistent');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "nonexistent" not found')
      );
    });

    it('should handle errors gracefully', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.rejects(new Error('Read failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await profileService.applyProfile('production');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle success with no options applied (base board only)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'arduino:avr:uno', // No options
            platforms: [{ platform: 'arduino:avr' }]
          }
        },
        default_profile: 'default'
      });

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [], // Empty - no options to apply
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyProfile('default');

      expect(result).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('applied successfully')
      );
    });

    it('should handle failure with boardSelected=false', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const failResult: ApplyResult = {
        success: false,
        boardSelected: false, // Board selection failed
        optionsApplied: [],
        optionsFailed: [],
        errors: ['Board not found']
      };
      applyFqbnStub.resolves(failResult);

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showWarningMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Board selected: No')
      );
    });

    it('should handle failure with empty errors array', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const failResult: ApplyResult = {
        success: false,
        boardSelected: true,
        optionsApplied: [],
        optionsFailed: [{ option: 'UploadSpeed', value: '921600', reason: 'Failed' }],
        errors: [] // Empty errors array
      };
      applyFqbnStub.resolves(failResult);

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showWarningMessageSpy).toHaveBeenCalled();
    });
  });

  describe('applyDefaultProfile', () => {

    it('should return false when no sketch.yaml exists', async () => {
      hasSketchYamlStub.returns(false);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
    });

    it('should apply default profile successfully in silent mode', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyDefaultProfile(true, false);

      expect(result).toBe(true);
      expect(showInformationMessageSpy).not.toHaveBeenCalled(); // Silent mode
    });

    it('should show notification when not in silent mode', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [{ option: 'UploadSpeed', value: '921600' }],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalled();
    });

    it('should prompt user when promptUser is true and user agrees', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInformationMessageSpy.mockResolvedValue('Yes');

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [],
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyDefaultProfile(false, true);

      expect(result).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Apply board configuration'),
        'Yes',
        'No'
      );
    });

    it('should not apply when user declines prompt', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInformationMessageSpy.mockResolvedValue('No');

      const result = await profileService.applyDefaultProfile(false, true);

      expect(result).toBe(false);
      expect(applyFqbnStub.called).toBe(false);
    });

    it('should handle apply failure with warning', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const failResult: ApplyResult = {
        success: false,
        boardSelected: false,
        optionsApplied: [],
        optionsFailed: [],
        errors: ['Failed to select board']
      };
      applyFqbnStub.resolves(failResult);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
      expect(showWarningMessageSpy).toHaveBeenCalled();
    });

    it('should handle success with no options (non-silent)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: 'arduino:avr:uno', // No options
            platforms: [{ platform: 'arduino:avr' }]
          }
        },
        default_profile: 'default'
      });

      const successResult: ApplyResult = {
        success: true,
        boardSelected: true,
        optionsApplied: [], // Empty - no options
        optionsFailed: [],
        errors: []
      };
      applyFqbnStub.resolves(successResult);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied profile "default"')
      );
    });

    it('should handle failure with boardSelected=true in non-silent mode', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);

      const failResult: ApplyResult = {
        success: false,
        boardSelected: true, // Board selected but options failed
        optionsApplied: [],
        optionsFailed: [{ option: 'UploadSpeed', value: '921600', reason: 'Failed' }],
        errors: ['Options failed']
      };
      applyFqbnStub.resolves(failResult);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
      expect(showWarningMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Board selected: Yes')
      );
    });
  });

  describe('showProfilePicker', () => {
    it('should show message when no profiles exist', async () => {
      hasSketchYamlStub.returns(false);

      const showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');

      await profileService.showProfilePicker(mockArduinoContext);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No profiles found')
      );
    });

    it('should create and show quick pick with profiles', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);

      const mockQuickPick: any = {
        title: '',
        placeholder: '',
        items: [],
        activeItems: [],
        onDidAccept: jest.fn(),
        onDidHide: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
      };

      const createQuickPickSpy = jest.spyOn(vscode.window, 'createQuickPick').mockReturnValue(mockQuickPick);

      await profileService.showProfilePicker(mockArduinoContext);

      expect(createQuickPickSpy).toHaveBeenCalled();
      expect(mockQuickPick.items).toHaveLength(3);
      expect(mockQuickPick.show).toHaveBeenCalled();
    });
  });

  describe('createConfiguration', () => {

    it('should prompt to create sketch.yaml if it does not exist', async () => {
      hasSketchYamlStub.returns(false);
      showInformationMessageSpy.mockResolvedValueOnce('No'); // User declines

      await profileService.createConfiguration(mockArduinoContext);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sketch.yaml found'),
        'Yes',
        'No'
      );
    });

    it('should create new profile successfully', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInputBoxSpy.mockResolvedValue('production');
      showInformationMessageSpy.mockResolvedValue('No'); // Don't switch
      writeSketchYamlStub.resolves();

      await profileService.createConfiguration(mockArduinoContext);

      expect(writeSketchYamlStub.called).toBe(true);
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "production" created successfully'),
        'Yes',
        'No'
      );
    });

    it('should validate profile name format', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInputBoxSpy.mockResolvedValue(undefined); // User cancels

      await profileService.createConfiguration(mockArduinoContext);

      // Verify showInputBox was called with validateInput function
      expect(showInputBoxSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          validateInput: expect.any(Function)
        })
      );
    });

    it('should reject duplicate profile names', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockMultiProfileYaml);
      showInputBoxSpy.mockResolvedValue('default'); // Already exists

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        'Profile "default" already exists.'
      );
      expect(writeSketchYamlStub.called).toBe(false);
    });

    it('should switch to new profile when user agrees', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInputBoxSpy.mockResolvedValue('test-profile');
      showInformationMessageSpy.mockResolvedValue('Yes'); // Switch to profile
      writeSketchYamlStub.resolves();
      updateDefaultProfileStub.resolves();

      await profileService.createConfiguration(mockArduinoContext);

      expect(updateDefaultProfileStub.calledWith('test-profile')).toBe(true);
    });

    it('should handle missing board configuration', async () => {
      hasSketchYamlStub.returns(true);
      mockArduinoContext._setFqbn(undefined);
      showInputBoxSpy.mockResolvedValue('production');

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No board configuration found')
      );
    });
  });

  describe('Edge Cases and Error Paths', () => {
    it('getDefaultProfileName should handle read errors gracefully', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read YAML');
      readSketchYamlStub.rejects(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await profileService.getDefaultProfileName();

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ProfileService] Error reading default profile:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('getActiveProfile should return undefined when default profile name is undefined', async () => {
      hasSketchYamlStub.returns(false); // This will make getDefaultProfileName return undefined

      const result = await profileService.getActiveProfile(mockArduinoContext);

      expect(result).toBeUndefined();
    });

    it('getActiveProfile should return undefined when getDefaultProfileName fails', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub
        .onFirstCall().resolves({
          profiles: {
            test: { fqbn: 'test:board:id', platforms: [], libraries: [] }
          },
          default_profile: 'test'
        })
        .onSecondCall().rejects(new Error('Read failed')); // getDefaultProfileName call fails

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await profileService.getActiveProfile(mockArduinoContext);

      expect(result).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('applyProfile should show error when no profiles in sketch.yaml', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        // No profiles field
        default_profile: 'default'
      });

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith('No profiles found in sketch.yaml.');
    });

    it('applyProfile should show error when yamlContent is undefined', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(undefined); // yaml Content is undefined

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith('No profiles found in sketch.yaml.');
    });

    it('applyProfile should show error when profile has no FQBN', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            // No FQBN
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        'Profile "default" not found or has no FQBN.'
      );
    });

    it('applyProfile should show error when profile exists but fqbn is null', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            fqbn: null, // Explicitly null
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        'Profile "default" not found or has no FQBN.'
      );
    });

    it('applyProfile should handle sketch.yaml read errors', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read YAML');
      readSketchYamlStub.rejects(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await profileService.applyProfile('default');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply profile')
      );

      consoleErrorSpy.mockRestore();
    });

    it('applyDefaultProfile should handle errors when no default profile name', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {}
        // No default_profile field and no 'default' profile
      });

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
    });

    it('showProfilePicker should handle when getting profiles fails', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read profiles');
      readSketchYamlStub.rejects(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await profileService.showProfilePicker(mockArduinoContext);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('createConfiguration should handle errors when reading existing profiles', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Failed to read profiles');
      readSketchYamlStub.rejects(error);
      showInputBoxSpy.mockResolvedValue('new-profile');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await profileService.createConfiguration(mockArduinoContext);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('applyDefaultProfile should log when no default profile (non-silent)', async () => {
      hasSketchYamlStub.returns(true);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Spy on getDefaultProfileName to return undefined
      const getDefaultProfileNameSpy = jest.spyOn(profileService, 'getDefaultProfileName')
        .mockResolvedValue(undefined);

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ProfileService] No default_profile found in sketch.yaml'
      );

      consoleLogSpy.mockRestore();
      getDefaultProfileNameSpy.mockRestore();
    });

    it('applyDefaultProfile should log when no profiles in yaml (non-silent)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        default_profile: 'default'
        // No profiles field
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ProfileService] No profiles found in sketch.yaml'
      );

      consoleLogSpy.mockRestore();
    });

    it('applyDefaultProfile should show error message on exception (non-silent)', async () => {
      hasSketchYamlStub.returns(true);
      const error = new Error('Unexpected error');

      // First call succeeds (for getDefaultProfileName), second call fails (for applyDefaultProfile)
      readSketchYamlStub
        .onFirstCall().resolves({ default_profile: 'default', profiles: {} })
        .onSecondCall().rejects(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await profileService.applyDefaultProfile(false, false);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ProfileService] Error applying default profile:',
        error
      );
      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply default profile')
      );

      consoleErrorSpy.mockRestore();
    });

    it('showProfilePicker should apply profile when user selects one', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          production: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          }
        },
        default_profile: 'production'
      });

      const mockQuickPick = {
        title: '',
        placeholder: '',
        items: [] as any[],
        activeItems: [] as any[],
        selectedItems: [] as any[],
        onDidAccept: jest.fn(),
        onDidHide: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
      };

      const createQuickPickSpy = jest.spyOn(vscode.window, 'createQuickPick')
        .mockReturnValue(mockQuickPick as any);

      const applyProfileSpy = jest.spyOn(profileService, 'applyProfile').mockResolvedValue(true);

      await profileService.showProfilePicker(mockArduinoContext);

      // Simulate user selecting a profile
      mockQuickPick.selectedItems = [mockQuickPick.items[0]];
      const acceptCallback = mockQuickPick.onDidAccept.mock.calls[0][0];
      acceptCallback();

      expect(applyProfileSpy).toHaveBeenCalledWith('production');
      expect(mockQuickPick.hide).toHaveBeenCalled();

      createQuickPickSpy.mockRestore();
      applyProfileSpy.mockRestore();
    });

    it('createConfiguration should handle SketchYamlService.createSketchYaml failure', async () => {
      hasSketchYamlStub.returns(false);
      showInformationMessageSpy.mockResolvedValue('Yes');

      const createSketchYamlStub = sinon.stub(SketchYamlService, 'createSketchYaml');
      const error = new Error('Failed to create file');
      createSketchYamlStub.rejects(error);

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create sketch.yaml')
      );

      createSketchYamlStub.restore();
    });

    it('createConfiguration should validate profile name with invalid characters', async () => {
      hasSketchYamlStub.returns(true);

      let validationResult: string | null = null;
      showInputBoxSpy.mockImplementation((options: any) => {
        // Test validation with invalid name
        validationResult = options.validateInput('invalid name!@#');
        return Promise.resolve(undefined); // User cancels
      });

      await profileService.createConfiguration(mockArduinoContext);

      expect(validationResult).toBe(
        'Profile name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('createConfiguration should handle when buildCompleteFqbn returns undefined', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {},
        default_profile: 'default'
      });

      showInputBoxSpy.mockResolvedValue('new-profile');

      mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
      mockArduinoContext._setBoardDetails({
        fqbn: 'esp32:esp32:esp32s3',
        configOptions: [], // Empty options will cause buildCompleteFqbn to fail
        programmers: [],
        toolsDependencies: [],
        buildProperties: {}
      } as any);

      // Mock buildCompleteFqbn to return undefined
      const fqbnUtils = require('../../../../utils/fqbn-utils');
      const buildCompleteFqbnSpy = jest.spyOn(fqbnUtils, 'buildCompleteFqbn')
        .mockReturnValue(undefined);

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        'Failed to build FQBN from board details.'
      );

      buildCompleteFqbnSpy.mockRestore();
    });

    it('createConfiguration should handle addProfileToSketchYaml failure', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub
        .onFirstCall().resolves({
          profiles: {},
          default_profile: 'default'
        })
        .onSecondCall().resolves(undefined); // Fails when addProfileToSketchYaml tries to read

      showInputBoxSpy.mockResolvedValue('new-profile');

      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');
      mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create profile')
      );
    });

    it('createConfiguration should successfully create sketch.yaml when it does not exist', async () => {
      hasSketchYamlStub.returns(false);
      showInformationMessageSpy
        .mockResolvedValueOnce('Yes') // User agrees to create sketch.yaml
        .mockResolvedValueOnce('No'); // User declines to switch to new profile

      const createSketchYamlStub = sinon.stub(SketchYamlService, 'createSketchYaml');
      createSketchYamlStub.resolves();

      showInputBoxSpy.mockResolvedValue('new-profile');

      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');
      mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

      readSketchYamlStub.resolves({
        profiles: {},
        default_profile: 'default'
      });

      await profileService.createConfiguration(mockArduinoContext);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'sketch.yaml created with "default" profile. You can now create additional profiles.'
      );

      createSketchYamlStub.restore();
    });

    it('createConfiguration should validate empty profile name', async () => {
      hasSketchYamlStub.returns(true);

      let validationResult: string | null | undefined = undefined;
      showInputBoxSpy.mockImplementation((options: any) => {
        // Test validation with empty name
        validationResult = options.validateInput('');
        return Promise.resolve(undefined); // User cancels
      });

      await profileService.createConfiguration(mockArduinoContext);

      expect(validationResult).toBe('Profile name cannot be empty');
    });

    it('createConfiguration should validate whitespace-only profile name', async () => {
      hasSketchYamlStub.returns(true);

      let validationResult: string | null | undefined = undefined;
      showInputBoxSpy.mockImplementation((options: any) => {
        // Test validation with whitespace-only name
        validationResult = options.validateInput('   ');
        return Promise.resolve(undefined); // User cancels
      });

      await profileService.createConfiguration(mockArduinoContext);

      expect(validationResult).toBe('Profile name cannot be empty');
    });

    it('createConfiguration should allow valid profile name', async () => {
      hasSketchYamlStub.returns(true);

      let validationResult: string | null | undefined = undefined;
      showInputBoxSpy.mockImplementation((options: any) => {
        // Test validation with valid name
        validationResult = options.validateInput('valid-profile_name123');
        return Promise.resolve('valid-profile_name123');
      });

      readSketchYamlStub.resolves({
        profiles: {},
        default_profile: 'default'
      });

      showInformationMessageSpy.mockResolvedValue('No'); // Don't switch

      mockArduinoContext._setFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');
      mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());

      await profileService.createConfiguration(mockArduinoContext);

      expect(validationResult).toBeNull(); // Valid name returns null
    });

    it('getProfiles should handle profiles without fqbn', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          valid: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          },
          invalid: {
            // No FQBN
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          }
        },
        default_profile: 'valid'
      });

      const profiles = await profileService.getProfiles();

      expect(profiles).toHaveLength(1); // Only valid profile returned
      expect(profiles[0].name).toBe('valid');
    });

    it('getActiveProfile should return undefined when profile exists but no match found', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          production: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          }
        },
        default_profile: 'nonexistent' // Profile name that doesn't exist
      });

      const result = await profileService.getActiveProfile(mockArduinoContext);

      expect(result).toBeUndefined();
    });

    it('applyDefaultProfile should handle profile without fqbn', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          default: {
            // No FQBN field
            platforms: [{ platform: 'esp32:esp32' }]
          }
        },
        default_profile: 'default'
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await profileService.applyDefaultProfile(true, false);

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile "default" not found or has no FQBN')
      );

      consoleWarnSpy.mockRestore();
    });

    it('showProfilePicker should handle when no active item matches', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          production: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          }
        },
        default_profile: 'nonexistent' // No match
      });

      const mockQuickPick = {
        title: '',
        placeholder: '',
        items: [] as any[],
        activeItems: [] as any[],
        selectedItems: [],
        onDidAccept: jest.fn(),
        onDidHide: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
      };

      const createQuickPickSpy = jest.spyOn(vscode.window, 'createQuickPick')
        .mockReturnValue(mockQuickPick as any);

      await profileService.showProfilePicker(mockArduinoContext);

      // activeItems should not be set since no match
      expect(mockQuickPick.activeItems).toHaveLength(0);

      createQuickPickSpy.mockRestore();
    });

    it('showProfilePicker should handle when no selection made (undefined)', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves({
        profiles: {
          production: {
            fqbn: 'esp32:esp32:esp32s3',
            platforms: [{ platform: 'esp32:esp32' }],
            libraries: []
          }
        },
        default_profile: 'production'
      });

      const mockQuickPick = {
        title: '',
        placeholder: '',
        items: [] as any[],
        activeItems: [] as any[],
        selectedItems: [], // Empty selection
        onDidAccept: jest.fn(),
        onDidHide: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
      };

      const createQuickPickSpy = jest.spyOn(vscode.window, 'createQuickPick')
        .mockReturnValue(mockQuickPick as any);

      const applyProfileSpy = jest.spyOn(profileService, 'applyProfile');

      await profileService.showProfilePicker(mockArduinoContext);

      // Simulate user accepting without selection
      const acceptCallback = mockQuickPick.onDidAccept.mock.calls[0][0];
      acceptCallback();

      // applyProfile should not be called
      expect(applyProfileSpy).not.toHaveBeenCalled();
      expect(mockQuickPick.hide).toHaveBeenCalled();

      createQuickPickSpy.mockRestore();
      applyProfileSpy.mockRestore();
    });

    it('createConfiguration should handle when user cancels input', async () => {
      hasSketchYamlStub.returns(true);
      showInputBoxSpy.mockResolvedValue(undefined); // User cancelled

      await profileService.createConfiguration(mockArduinoContext);

      expect(writeSketchYamlStub.called).toBe(false);
    });

    it('createConfiguration should handle when buildCompleteFqbn returns undefined', async () => {
      hasSketchYamlStub.returns(true);
      readSketchYamlStub.resolves(mockSingleProfileYaml);
      showInputBoxSpy.mockResolvedValue('new-profile');
      mockArduinoContext._setBoardDetails(undefined as any); // No board details

      await profileService.createConfiguration(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No board configuration found')
      );
    });
  });
});

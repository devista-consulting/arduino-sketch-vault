/**
 * Unit tests for SketchYamlService
 */

import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { MockArduinoContext, createESP32S3BoardDetails } from '../../../mocks/arduino-api-mock';
import type { SketchYamlStructure } from '../../../../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('SketchYamlService', () => {
  let mockArduinoContext: MockArduinoContext;

  beforeEach(() => {
    // Setup workspace folders
    (vscode.workspace.workspaceFolders as any) = [
      {
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0
      }
    ];

    mockArduinoContext = new MockArduinoContext();
    mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
    mockArduinoContext._setBoardDetails(createESP32S3BoardDetails());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('hasSketchYaml', () => {
    it('should return true when sketch.yaml exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(SketchYamlService.hasSketchYaml()).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(path.join('/test/workspace', 'sketch.yaml'));
    });

    it('should return false when sketch.yaml does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(SketchYamlService.hasSketchYaml()).toBe(false);
    });

    it('should return false when no workspace folder is open', () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      expect(SketchYamlService.hasSketchYaml()).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });
  });

  describe('getSketchYamlPath', () => {
    it('should return correct path when workspace folder exists', () => {
      const result = SketchYamlService.getSketchYamlPath();
      expect(result).toBe(path.join('/test/workspace', 'sketch.yaml'));
    });

    it('should return undefined when no workspace folder is open', () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      const path = SketchYamlService.getSketchYamlPath();
      expect(path).toBeUndefined();
    });
  });

  describe('readSketchYaml', () => {
    it('should read and parse valid sketch.yaml', async () => {
      const mockYaml: SketchYamlStructure = {
        profiles: {
          default: {
            fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
            platforms: [{ platform: 'esp32:esp32 (3.0.7)' }],
            libraries: []
          }
        },
        default_profile: 'default'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(yaml.dump(mockYaml));

      const result = await SketchYamlService.readSketchYaml();

      expect(result).toEqual(mockYaml);
      expect(fs.readFileSync).toHaveBeenCalledWith(path.join('/test/workspace', 'sketch.yaml'), 'utf-8');
    });

    it('should return undefined when sketch.yaml does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await SketchYamlService.readSketchYaml();

      expect(result).toBeUndefined();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should throw error for invalid YAML', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid: yaml: content:');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(SketchYamlService.readSketchYaml()).rejects.toThrow('Failed to parse sketch.yaml');

      consoleErrorSpy.mockRestore();
    });

    it('should return undefined when no workspace folder', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      const result = await SketchYamlService.readSketchYaml();

      expect(result).toBeUndefined();
    });
  });

  describe('createSketchYaml', () => {
    let showWarningMessageSpy: jest.SpyInstance;
    let showInformationMessageSpy: jest.SpyInstance;
    let showTextDocumentSpy: jest.SpyInstance;
    let openTextDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      showWarningMessageSpy = jest.spyOn(vscode.window, 'showWarningMessage');
      showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
      showTextDocumentSpy = jest.spyOn(vscode.window, 'showTextDocument').mockResolvedValue({} as any);
      openTextDocumentSpy = jest.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue({} as any);
      (fs.writeFileSync as jest.Mock).mockImplementation();
    });

    it('should create sketch.yaml with current board configuration', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await SketchYamlService.createSketchYaml(mockArduinoContext);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];

      // Verify content contains expected values
      expect(writtenContent).toContain('profiles:');
      expect(writtenContent).toContain('default:');
      expect(writtenContent).toContain('fqbn: esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc');
      expect(writtenContent).toContain('esp32:esp32');
      expect(writtenContent).toContain('default_profile: default');

      expect(openTextDocumentSpy).toHaveBeenCalled();
      expect(showTextDocumentSpy).toHaveBeenCalled();
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'sketch.yaml created successfully! You can now edit it to add libraries.'
      );
    });

    it('should prompt before overwriting existing sketch.yaml', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      showWarningMessageSpy.mockResolvedValue('No');

      await SketchYamlService.createSketchYaml(mockArduinoContext);

      expect(showWarningMessageSpy).toHaveBeenCalledWith(
        'sketch.yaml already exists. Do you want to overwrite it?',
        'Yes',
        'No'
      );
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should overwrite when user confirms', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      showWarningMessageSpy.mockResolvedValue('Yes');

      await SketchYamlService.createSketchYaml(mockArduinoContext);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw error when no workspace folder', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      await expect(SketchYamlService.createSketchYaml(mockArduinoContext))
        .rejects.toThrow('No workspace folder open');
    });

    it('should throw error when no board selected', async () => {
      mockArduinoContext._setFqbn(undefined);

      await expect(SketchYamlService.createSketchYaml(mockArduinoContext))
        .rejects.toThrow('No board selected');
    });

    it('should include platform version in generated content', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await SketchYamlService.createSketchYaml(mockArduinoContext);

      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('esp32:esp32 (3.0.7)');
    });
  });

  describe('writeSketchYaml', () => {
    it('should write sketch.yaml structure to file', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation();

      const yamlContent: SketchYamlStructure = {
        profiles: {
          default: {
            fqbn: 'arduino:avr:uno',
            platforms: [{ platform: 'arduino:avr (1.8.6)' }],
            libraries: ['Servo']
          }
        },
        default_profile: 'default'
      };

      await SketchYamlService.writeSketchYaml(yamlContent);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/test/workspace', 'sketch.yaml'),
        expect.any(String),
        'utf-8'
      );

      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('arduino:avr:uno');
      expect(writtenContent).toContain('Servo');
    });

    it('should throw error when no workspace folder', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      const yamlContent: SketchYamlStructure = {
        profiles: { default: { fqbn: 'test', platforms: [], libraries: [] } },
        default_profile: 'default'
      };

      await expect(SketchYamlService.writeSketchYaml(yamlContent))
        .rejects.toThrow('No workspace folder open');
    });

    it('should handle write errors', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const yamlContent: SketchYamlStructure = {
        profiles: { default: { fqbn: 'test', platforms: [], libraries: [] } },
        default_profile: 'default'
      };

      await expect(SketchYamlService.writeSketchYaml(yamlContent)).rejects.toThrow('Write failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateSketchYamlFqbn', () => {
    const existingYaml = `profiles:
  default:
    fqbn: esp32:esp32:esp32s3:UploadSpeed=460800
    platforms:
      - platform: esp32:esp32 (3.0.5)
    libraries: []
default_profile: default
`;

    it('should update FQBN in existing sketch.yaml', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(existingYaml);
      (fs.writeFileSync as jest.Mock).mockImplementation();

      const showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');

      await SketchYamlService.updateSketchYamlFqbn(
        'esp32:esp32:esp32s3:UploadSpeed=921600',
        createESP32S3BoardDetails()
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      const updatedContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];

      expect(updatedContent).toContain('UploadSpeed=921600');
      expect(updatedContent).toContain('3.0.7'); // Updated version
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'sketch.yaml updated with new board configuration'
      );
    });

    it('should work in silent mode without notifications', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(existingYaml);
      (fs.writeFileSync as jest.Mock).mockImplementation();

      const showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');

      await SketchYamlService.updateSketchYamlFqbn(
        'esp32:esp32:esp32s3:UploadSpeed=921600',
        createESP32S3BoardDetails(),
        true // silent mode
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(showInformationMessageSpy).not.toHaveBeenCalled();
    });

    it('should handle missing sketch.yaml gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await SketchYamlService.updateSketchYamlFqbn(
        'esp32:esp32:esp32s3',
        createESP32S3BoardDetails()
      );

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(existingYaml);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await SketchYamlService.updateSketchYamlFqbn(
        'esp32:esp32:esp32s3',
        createESP32S3BoardDetails()
      );

      expect(showErrorMessageSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateDefaultProfile', () => {
    const multiProfileYaml = `profiles:
  default:
    fqbn: esp32:esp32:esp32s3
    platforms:
      - platform: esp32:esp32
    libraries: []
  production:
    fqbn: esp32:esp32:esp32s3:UploadSpeed=460800
    platforms:
      - platform: esp32:esp32
    libraries: []
default_profile: default
`;

    it('should update default_profile field', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(multiProfileYaml);
      (fs.writeFileSync as jest.Mock).mockImplementation();

      await SketchYamlService.updateDefaultProfile('production');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const updatedContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];

      expect(updatedContent).toContain('default_profile: production');
    });

    it('should handle missing sketch.yaml gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await SketchYamlService.updateDefaultProfile('production');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle non-existent profile gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(multiProfileYaml);
      (fs.writeFileSync as jest.Mock).mockImplementation();

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await SketchYamlService.updateDefaultProfile('nonexistent');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Profile "nonexistent" not found in sketch.yaml'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('isAutoUpdateEnabled', () => {
    it('should return true when auto-update is enabled', () => {
      const mockGet = jest.fn().mockReturnValue(true);
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: mockGet
      } as any);

      expect(SketchYamlService.isAutoUpdateEnabled()).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('arduino-sketch-vault.autoUpdateSketchYaml', true);
    });

    it('should return false when auto-update is disabled', () => {
      const mockGet = jest.fn().mockReturnValue(false);
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: mockGet
      } as any);

      expect(SketchYamlService.isAutoUpdateEnabled()).toBe(false);
    });
  });

  describe('promptToCreateSketchYaml', () => {
    let showInformationMessageSpy: jest.SpyInstance;
    let showErrorMessageSpy: jest.SpyInstance;

    beforeEach(() => {
      showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage');
      showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');
      jest.spyOn(vscode.window, 'showTextDocument').mockResolvedValue({} as any);
      jest.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue({} as any);
    });

    it('should prompt user and create sketch.yaml when user agrees', async () => {
      showInformationMessageSpy.mockResolvedValue('Create sketch.yaml');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation();

      await SketchYamlService.promptToCreateSketchYaml(mockArduinoContext);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('No sketch.yaml found'),
        'Create sketch.yaml',
        'Not now'
      );
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not create sketch.yaml when user declines', async () => {
      showInformationMessageSpy.mockResolvedValue('Not now');

      await SketchYamlService.promptToCreateSketchYaml(mockArduinoContext);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should show error message when creation fails', async () => {
      showInformationMessageSpy.mockResolvedValue('Create sketch.yaml');
      (vscode.workspace.workspaceFolders as any) = undefined; // Will cause error

      await SketchYamlService.promptToCreateSketchYaml(mockArduinoContext);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create sketch.yaml')
      );
    });
  });
});

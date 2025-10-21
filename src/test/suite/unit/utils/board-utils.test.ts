/**
 * Unit tests for Board utilities
 */

import * as sinon from 'sinon';
import { extractBoardName, checkAndPromptForSketchYaml } from '../../../../utils/board-utils';
import { SketchYamlService } from '../../../../services/sketch-yaml-service';
import { MockArduinoContext } from '../../../mocks/arduino-api-mock';

describe('Board Utilities', () => {
  describe('extractBoardName', () => {
    it('should return FQBN as-is for ESP32 board', () => {
      const fqbn = 'esp32:esp32:esp32s3';
      const name = extractBoardName(fqbn);

      expect(name).toBe('esp32:esp32:esp32s3');
    });

    it('should return FQBN as-is for Arduino Uno', () => {
      const fqbn = 'arduino:avr:uno';
      const name = extractBoardName(fqbn);

      expect(name).toBe('arduino:avr:uno');
    });

    it('should return FQBN with options as-is', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc';
      const name = extractBoardName(fqbn);

      expect(name).toBe('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc');
    });

    it('should handle empty string', () => {
      const name = extractBoardName('');
      expect(name).toBe('');
    });

    it('should handle invalid FQBN', () => {
      const fqbn = 'invalid';
      const name = extractBoardName(fqbn);

      expect(name).toBe('invalid');
    });
  });

  describe('checkAndPromptForSketchYaml', () => {
    let mockArduinoContext: MockArduinoContext;
    let hasSketchYamlStub: sinon.SinonStub;
    let promptToCreateStub: sinon.SinonStub;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      mockArduinoContext = new MockArduinoContext();
      hasSketchYamlStub = sinon.stub(SketchYamlService, 'hasSketchYaml');
      promptToCreateStub = sinon.stub(SketchYamlService, 'promptToCreateSketchYaml');
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      sinon.restore();
      jest.restoreAllMocks();
    });

    it('should return early when no board is selected', async () => {
      mockArduinoContext._setFqbn(undefined);

      await checkAndPromptForSketchYaml(mockArduinoContext);

      expect(hasSketchYamlStub.called).toBe(false);
      expect(promptToCreateStub.called).toBe(false);
    });

    it('should return early when sketch.yaml already exists', async () => {
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
      hasSketchYamlStub.returns(true);

      await checkAndPromptForSketchYaml(mockArduinoContext);

      expect(consoleLogSpy).toHaveBeenCalledWith('sketch.yaml found in workspace');
      expect(promptToCreateStub.called).toBe(false);
    });

    it('should prompt to create sketch.yaml when missing', async () => {
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
      hasSketchYamlStub.returns(false);
      promptToCreateStub.resolves();

      await checkAndPromptForSketchYaml(mockArduinoContext);

      expect(consoleLogSpy).toHaveBeenCalledWith('No sketch.yaml found, prompting user...');
      expect(promptToCreateStub.calledWith(mockArduinoContext)).toBe(true);
    });

    it('should delay prompt before showing to user', async () => {
      mockArduinoContext._setFqbn('esp32:esp32:esp32s3');
      hasSketchYamlStub.returns(false);
      promptToCreateStub.resolves();

      const startTime = Date.now();
      await checkAndPromptForSketchYaml(mockArduinoContext);
      const endTime = Date.now();

      // Should take at least 2000ms (SKETCH_YAML_PROMPT_DELAY_MS)
      // Allow some margin for test execution
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900);
      expect(promptToCreateStub.called).toBe(true);
    });
  });
});

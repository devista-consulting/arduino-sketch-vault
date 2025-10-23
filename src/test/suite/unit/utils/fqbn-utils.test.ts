/**
 * Unit tests for FQBN utilities
 */

import {
  parseFqbn,
  buildCompleteFqbn,
  extractBaseFqbn,
  extractPlatformId,
  formatPlatformString,
  formatFqbnSummary
} from '../../../../utils/fqbn-utils';
import { createESP32S3BoardDetails, createBoardDetailsWithOptions } from '../../../mocks/arduino-api-mock';
import type { BoardDetails } from '../../../../types';
import { FQBN } from 'fqbn';

describe('FQBN Utilities', () => {
  describe('parseFqbn', () => {
    it('should parse standard FQBN with options correctly', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc';
      const result = parseFqbn(fqbn);

      expect(result).toEqual({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: {
          UploadSpeed: '921600',
          USBMode: 'hwcdc'
        }
      });
    });

    it('should parse FQBN without options', () => {
      const fqbn = 'arduino:avr:uno';
      const result = parseFqbn(fqbn);

      expect(result).toEqual({
        baseFqbn: 'arduino:avr:uno',
        options: {}
      });
    });

    it('should parse FQBN with single option', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600';
      const result = parseFqbn(fqbn);

      expect(result).toEqual({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: {
          UploadSpeed: '921600'
        }
      });
    });

    it('should parse FQBN with many options', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc,DebugLevel=none';
      const result = parseFqbn(fqbn);

      expect(result).toEqual({
        baseFqbn: 'esp32:esp32:esp32s3',
        options: {
          UploadSpeed: '921600',
          USBMode: 'hwcdc',
          CDCOnBoot: 'cdc',
          DebugLevel: 'none'
        }
      });
    });

    it('should return null for invalid FQBN (too few parts)', () => {
      expect(parseFqbn('vendor:arch')).toBeNull();
      expect(parseFqbn('vendor')).toBeNull();
      expect(parseFqbn('')).toBeNull();
    });

    it('should error with malformed option pairs', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,InvalidOption,USBMode=hwcdc';
      const result = parseFqbn(fqbn);

      // Invalid FQBN is treated as falsy
      expect(result).toBeNull();
    });

    it('should handle option values containing special characters', () => {
      const fqbn = 'vendor:arch:board:option1=value-with-dash,option2=value_with_underscore';
      const result = parseFqbn(fqbn);

      expect(result).toEqual({
        baseFqbn: 'vendor:arch:board',
        options: {
          option1: 'value-with-dash',
          option2: 'value_with_underscore'
        }
      });
    });
  });

  describe('buildCompleteFqbn', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should build complete FQBN from BoardDetails with all selected options', () => {
      const boardDetails = createESP32S3BoardDetails();
      const fqbn = buildCompleteFqbn(boardDetails);

      expect(fqbn).toBe('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc');
    });

    it('should return base FQBN when no config options exist', () => {
      const boardDetails = createBoardDetailsWithOptions('arduino:avr:uno', []);
      const fqbn = buildCompleteFqbn(boardDetails);

      expect(fqbn).toBe('arduino:avr:uno');
    });

    it('should return base FQBN when no options are selected', () => {
      const boardDetails: BoardDetails = {
        fqbn: 'test:board:v1',
        configOptions: [
          {
            option: 'Speed',
            optionLabel: 'CPU Speed',
            values: [
              { value: '80MHz', valueLabel: '80MHz', selected: false },
              { value: '160MHz', valueLabel: '160MHz', selected: false }
            ]
          }
        ],
        buildProperties: {},
        programmers: [],
        toolsDependencies: []
      };

      const fqbn = buildCompleteFqbn(boardDetails);
      expect(fqbn).toBe('test:board:v1');
    });

    it('should return undefined when boardDetails is undefined', () => {
      const fqbn = buildCompleteFqbn(undefined);
      expect(fqbn).toBeUndefined();
    });

    it('should build FQBN with single option', () => {
      const boardDetails = createBoardDetailsWithOptions(
        'test:board:v1',
        [
          {
            option: 'Speed',
            optionLabel: 'Speed',
            selectedValue: '160MHz',
            values: ['80MHz', '160MHz']
          }
        ]
      );

      const fqbn = buildCompleteFqbn(boardDetails);
      expect(fqbn).toBe('test:board:v1:Speed=160MHz');
    });

    it('should rethrow unexpected errors from fqbn library', () => {
      const boardDetails = createESP32S3BoardDetails();
      const unexpected = new Error('unexpected failure');

      jest.spyOn(FQBN.prototype, 'withConfigOptions').mockImplementation(() => {
        throw unexpected;
      });

      expect(() => buildCompleteFqbn(boardDetails)).toThrow(unexpected);
    });
  });

  describe('extractBaseFqbn', () => {
    it('should extract base FQBN from full FQBN with options', () => {
      const baseFqbn = extractBaseFqbn('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc');
      expect(baseFqbn).toBe('esp32:esp32:esp32s3');
    });

    it('should return same value for FQBN without options', () => {
      const baseFqbn = extractBaseFqbn('arduino:avr:uno');
      expect(baseFqbn).toBe('arduino:avr:uno');
    });

    it('should return original string for invalid FQBN', () => {
      expect(extractBaseFqbn('vendor:arch')).toBe('vendor:arch');
      expect(extractBaseFqbn('vendor')).toBe('vendor');
    });

    it('should handle empty string', () => {
      expect(extractBaseFqbn('')).toBe('');
    });
  });

  describe('extractPlatformId', () => {
    it('should extract platform ID from full FQBN', () => {
      const platformId = extractPlatformId('esp32:esp32:esp32s3:UploadSpeed=921600');
      expect(platformId).toBe('esp32:esp32');
    });

    it('should extract platform ID from base FQBN', () => {
      const platformId = extractPlatformId('arduino:avr:uno');
      expect(platformId).toBe('arduino:avr');
    });

    it('should return original string for invalid FQBN', () => {
      expect(extractPlatformId('vendor')).toBe('vendor');
      expect(extractPlatformId('')).toBe('');
    });
  });

  describe('formatPlatformString', () => {
    it('should format platform string with version', () => {
      const formatted = formatPlatformString('esp32:esp32', '3.0.7');
      expect(formatted).toBe('esp32:esp32 (3.0.7)');
    });

    it('should return platform ID only when version is undefined', () => {
      const formatted = formatPlatformString('esp32:esp32', undefined);
      expect(formatted).toBe('esp32:esp32');
    });

    it('should return platform ID only when version is empty string', () => {
      const formatted = formatPlatformString('esp32:esp32', '');
      expect(formatted).toBe('esp32:esp32');
    });
  });

  describe('formatFqbnSummary', () => {
    it('should format FQBN with 2 options by default', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc,DebugLevel=none';
      const summary = formatFqbnSummary(fqbn);

      expect(summary).toBe('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc...');
    });

    it('should format FQBN with custom max options', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc';
      const summary = formatFqbnSummary(fqbn, 1);

      expect(summary).toBe('esp32:esp32:esp32s3:UploadSpeed=921600...');
    });

    it('should not add ellipsis when options count equals max', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc';
      const summary = formatFqbnSummary(fqbn, 2);

      expect(summary).toBe('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc');
    });

    it('should not add ellipsis when options count is less than max', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600';
      const summary = formatFqbnSummary(fqbn, 2);

      expect(summary).toBe('esp32:esp32:esp32s3:UploadSpeed=921600');
    });

    it('should return base FQBN when no options present', () => {
      const fqbn = 'arduino:avr:uno';
      const summary = formatFqbnSummary(fqbn);

      expect(summary).toBe('arduino:avr:uno');
    });

    it('should show all options when maxOptions is high', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc';
      const summary = formatFqbnSummary(fqbn, 10);

      expect(summary).toBe('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc');
    });

    it('should handle maxOptions = 0', () => {
      const fqbn = 'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc';
      const summary = formatFqbnSummary(fqbn, 0);

      expect(summary).toBe('esp32:esp32:esp32s3:...');
    });
  });
});

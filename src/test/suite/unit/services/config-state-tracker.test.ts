/**
 * Unit tests for ConfigStateTracker
 */

import { ConfigStateTracker } from '../../../../services/config-state-tracker';
import { createESP32S3BoardDetails, createBoardDetailsWithOptions } from '../../../mocks/arduino-api-mock';
import type { BoardDetails } from '../../../../types';

describe('ConfigStateTracker', () => {
  let tracker: ConfigStateTracker;

  beforeEach(() => {
    tracker = new ConfigStateTracker();
  });

  describe('detectChanges', () => {
    it('should return isInitial:true for first detection with no previous state', () => {
      const boardDetails = createESP32S3BoardDetails();
      const result = tracker.detectChanges('esp32:esp32:esp32s3', boardDetails);

      expect(result.isInitial).toBe(true);
      expect(result.changes).toEqual([]);
    });

    it('should return isInitial:true when boardDetails is undefined', () => {
      const result = tracker.detectChanges('esp32:esp32:esp32s3', undefined);

      expect(result.isInitial).toBe(true);
      expect(result.changes).toEqual([]);
    });

    it('should return isInitial:false and empty changes when config has not changed', () => {
      const boardDetails = createESP32S3BoardDetails();

      // First detection
      tracker.detectChanges('esp32:esp32:esp32s3', boardDetails);

      // Second detection with same config
      const result = tracker.detectChanges('esp32:esp32:esp32s3', boardDetails);

      expect(result.isInitial).toBe(false);
      expect(result.changes).toEqual([]);
    });

    it('should detect when a single config option value changes', () => {
      const fqbn = 'esp32:esp32:esp32s3';
      const initialBoardDetails = createESP32S3BoardDetails();

      // First detection
      tracker.detectChanges(fqbn, initialBoardDetails);

      // Change UploadSpeed from 921600 to 460800
      const updatedBoardDetails: BoardDetails = {
        ...initialBoardDetails,
        configOptions: initialBoardDetails.configOptions.map(opt => {
          if (opt.option === 'UploadSpeed') {
            return {
              ...opt,
              values: opt.values.map(val => ({
                ...val,
                selected: val.value === '460800'
              }))
            };
          }
          return opt;
        })
      };

      // Second detection with changed config
      const result = tracker.detectChanges(fqbn, updatedBoardDetails);

      expect(result.isInitial).toBe(false);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        option: 'UploadSpeed',
        label: 'Upload Speed',
        previousValue: '921600',
        previousLabel: '921600',
        newValue: '460800',
        newLabel: '460800'
      });
    });

    it('should detect when multiple config options change', () => {
      const fqbn = 'esp32:esp32:esp32s3';
      const initialBoardDetails = createESP32S3BoardDetails();

      // First detection
      tracker.detectChanges(fqbn, initialBoardDetails);

      // Change both UploadSpeed and USBMode
      const updatedBoardDetails: BoardDetails = {
        ...initialBoardDetails,
        configOptions: initialBoardDetails.configOptions.map(opt => {
          if (opt.option === 'UploadSpeed') {
            return {
              ...opt,
              values: opt.values.map(val => ({
                ...val,
                selected: val.value === '115200'
              }))
            };
          }
          if (opt.option === 'USBMode') {
            return {
              ...opt,
              values: opt.values.map(val => ({
                ...val,
                selected: val.value === 'default'
              }))
            };
          }
          return opt;
        })
      };

      // Second detection with changed config
      const result = tracker.detectChanges(fqbn, updatedBoardDetails);

      expect(result.isInitial).toBe(false);
      expect(result.changes).toHaveLength(2);

      // Find changes by option name
      const uploadSpeedChange = result.changes.find(c => c.option === 'UploadSpeed');
      const usbModeChange = result.changes.find(c => c.option === 'USBMode');

      expect(uploadSpeedChange).toEqual({
        option: 'UploadSpeed',
        label: 'Upload Speed',
        previousValue: '921600',
        previousLabel: '921600',
        newValue: '115200',
        newLabel: '115200'
      });

      expect(usbModeChange).toEqual({
        option: 'USBMode',
        label: 'USB Mode',
        previousValue: 'hwcdc',
        previousLabel: 'Hardware CDC and JTAG',
        newValue: 'default',
        newLabel: 'USB-OTG (TinyUSB)'
      });
    });

    it('should track states separately per FQBN and detect board switches', () => {
      const fqbn1 = 'esp32:esp32:esp32s3';
      const fqbn2 = 'arduino:avr:uno';

      const boardDetails1 = createESP32S3BoardDetails();
      const boardDetails2 = createBoardDetailsWithOptions(
        fqbn2,
        [
          {
            option: 'cpu',
            optionLabel: 'Processor',
            selectedValue: 'atmega328p',
            values: ['atmega328p', 'atmega328']
          }
        ]
      );

      // First detection for board 1 - initial state
      const result1 = tracker.detectChanges(fqbn1, boardDetails1);
      expect(result1.isInitial).toBe(true);
      expect(result1.changes).toEqual([]);

      // Switch to board 2 - should detect board change (not initial)
      const result2 = tracker.detectChanges(fqbn2, boardDetails2);
      expect(result2.isInitial).toBe(false);
      expect(result2.changes).toHaveLength(1);
      expect(result2.changes[0]).toEqual({
        option: 'FQBN',
        label: 'Board Selection',
        previousValue: fqbn1,
        newValue: fqbn2,
        previousLabel: 'Previous board',
        newLabel: 'New board',
      });

      // Switch back to board 1 - should detect board change
      const result1_2 = tracker.detectChanges(fqbn1, boardDetails1);
      expect(result1_2.isInitial).toBe(false);
      expect(result1_2.changes).toHaveLength(1);
      expect(result1_2.changes[0].option).toBe('FQBN');
      expect(result1_2.changes[0].previousValue).toBe(fqbn2);
      expect(result1_2.changes[0].newValue).toBe(fqbn1);

      // Switch back to board 2 - should detect board change
      const result2_2 = tracker.detectChanges(fqbn2, boardDetails2);
      expect(result2_2.isInitial).toBe(false);
      expect(result2_2.changes).toHaveLength(1);
      expect(result2_2.changes[0].option).toBe('FQBN');
      expect(result2_2.changes[0].previousValue).toBe(fqbn1);
      expect(result2_2.changes[0].newValue).toBe(fqbn2);
    });

    it('should handle config option with no selected value', () => {
      const fqbn = 'test:board:id';
      const boardDetails: BoardDetails = {
        fqbn,
        configOptions: [
          {
            option: 'TestOption',
            optionLabel: 'Test Option',
            values: [
              { value: 'value1', valueLabel: 'Value 1', selected: false },
              { value: 'value2', valueLabel: 'Value 2', selected: false }
            ]
          }
        ],
        programmers: [],
        toolsDependencies: [],
        buildProperties: {}
      };

      const result = tracker.detectChanges(fqbn, boardDetails);

      // Should still work, just won't track the option with no selected value
      expect(result.isInitial).toBe(true);
      expect(result.changes).toEqual([]);
    });

    it('should detect when a new config option is added', () => {
      const fqbn = 'esp32:esp32:esp32s3';
      const initialBoardDetails = createESP32S3BoardDetails();

      // First detection - only existing options
      tracker.detectChanges(fqbn, initialBoardDetails);

      // Add a new option
      const updatedBoardDetails: BoardDetails = {
        ...initialBoardDetails,
        configOptions: [
          ...initialBoardDetails.configOptions,
          {
            option: 'NewOption',
            optionLabel: 'New Option',
            values: [
              { value: 'value1', valueLabel: 'Value 1', selected: false },
              { value: 'value2', valueLabel: 'Value 2', selected: true }
            ]
          }
        ]
      };

      const result = tracker.detectChanges(fqbn, updatedBoardDetails);

      expect(result.isInitial).toBe(false);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        option: 'NewOption',
        label: 'New Option',
        previousValue: undefined,
        newValue: 'value2',
        previousLabel: undefined,
        newLabel: 'Value 2'
      });
    });

    it('should handle board details with empty configOptions array', () => {
      const fqbn = 'test:board:id';
      const boardDetails: BoardDetails = {
        fqbn,
        configOptions: [], // Empty array
        programmers: [],
        toolsDependencies: [],
        buildProperties: {}
      };

      const result = tracker.detectChanges(fqbn, boardDetails);

      expect(result.isInitial).toBe(true);
      expect(result.changes).toEqual([]);

      // Second detection should also work
      const result2 = tracker.detectChanges(fqbn, boardDetails);
      expect(result2.isInitial).toBe(false);
      expect(result2.changes).toEqual([]);
    });

    it('should detect board switch from board with options to board without options', () => {
      const fqbnESP32 = 'esp32:esp32:esp32s3';
      const fqbnLUFA = 'Arduino-LUFA:avr:yun';

      // ESP32 board with many config options
      const esp32Details = createESP32S3BoardDetails();

      // Arduino-LUFA board with no config options
      const lufaDetails: BoardDetails = {
        fqbn: fqbnLUFA,
        configOptions: [],
        programmers: [],
        toolsDependencies: [],
        buildProperties: {}
      };

      // Start with ESP32
      const result1 = tracker.detectChanges(fqbnESP32, esp32Details);
      expect(result1.isInitial).toBe(true);

      // Switch to LUFA (no config options) - should still detect board change
      const result2 = tracker.detectChanges(fqbnLUFA, lufaDetails);
      expect(result2.isInitial).toBe(false);
      expect(result2.changes).toHaveLength(1);
      expect(result2.changes[0]).toEqual({
        option: 'FQBN',
        label: 'Board Selection',
        previousValue: fqbnESP32,
        newValue: fqbnLUFA,
        previousLabel: 'Previous board',
        newLabel: 'New board',
      });

      // Switch back to ESP32 - should detect board change
      const result3 = tracker.detectChanges(fqbnESP32, esp32Details);
      expect(result3.isInitial).toBe(false);
      expect(result3.changes).toHaveLength(1);
      expect(result3.changes[0].option).toBe('FQBN');
      expect(result3.changes[0].previousValue).toBe(fqbnLUFA);
      expect(result3.changes[0].newValue).toBe(fqbnESP32);
    });
  });

  describe('clear', () => {
    it('should clear all tracked states', () => {
      const fqbn = 'esp32:esp32:esp32s3';
      const boardDetails = createESP32S3BoardDetails();

      // First detection
      tracker.detectChanges(fqbn, boardDetails);

      // Verify state is tracked
      const result1 = tracker.detectChanges(fqbn, boardDetails);
      expect(result1.isInitial).toBe(false);

      // Clear all states
      tracker.clear();

      // After clear, should be initial again
      const result2 = tracker.detectChanges(fqbn, boardDetails);
      expect(result2.isInitial).toBe(true);
    });
  });
});

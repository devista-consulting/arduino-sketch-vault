/**
 * Unit tests for version extraction utilities
 */

import {
  extractPlatformVersionFromPath,
  getPlatformVersion
} from '../../../../utils/version-utils';

describe('Version Utilities', () => {
  describe('extractPlatformVersionFromPath', () => {
    describe('Standard Paths', () => {
      it('should extract version from ESP32 platform path (macOS)', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/tibor/Library/Arduino15/packages/arduino/hardware/esp32/2.0.18-arduino.5'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBe('2.0.18-arduino.5');
      });

      it('should extract version from ESP32 platform path (Linux)', () => {
        const buildProperties = {
          'runtime.platform.path': '/home/user/.arduino15/packages/esp32/hardware/esp32/3.0.7'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'esp32:esp32');
        expect(version).toBe('3.0.7');
      });

      it('should extract version from ESP32 platform path (Windows)', () => {
        // Arduino CLI normalizes paths to forward slashes even on Windows
        const buildProperties = {
          'runtime.platform.path': 'C:/Users/User/AppData/Local/Arduino15/packages/esp32/hardware/esp32/2.0.17'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'esp32:esp32');
        expect(version).toBe('2.0.17');
      });

      it('should extract version from Arduino AVR platform path', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/user/Library/Arduino15/packages/arduino/hardware/avr/1.8.6'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:avr');
        expect(version).toBe('1.8.6');
      });

      it('should extract version from Arduino SAMD platform path', () => {
        const buildProperties = {
          'runtime.platform.path': '/home/user/.arduino15/packages/arduino/hardware/samd/1.8.13'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:samd');
        expect(version).toBe('1.8.13');
      });

      it('should extract version from Adafruit SAMD platform path', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/user/Library/Arduino15/packages/adafruit/hardware/samd/1.7.14'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'adafruit:samd');
        expect(version).toBe('1.7.14');
      });

      it('should extract version from STM32 platform path', () => {
        const buildProperties = {
          'runtime.platform.path': '/home/user/.arduino15/packages/STMicroelectronics/hardware/stm32/2.8.1'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'STMicroelectronics:stm32');
        expect(version).toBe('2.8.1');
      });

      it('should extract version from RP2040 platform path', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/user/Library/Arduino15/packages/rp2040/hardware/rp2040/4.2.1'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'rp2040:rp2040');
        expect(version).toBe('4.2.1');
      });
    });

    describe('Version Formats', () => {
      it('should extract simple semantic version', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('1.2.3');
      });

      it('should extract version with pre-release tag', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/2.0.0-rc.1'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('2.0.0-rc.1');
      });

      it('should extract version with build metadata', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.5.0+build.20241022'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('1.5.0+build.20241022');
      });

      it('should extract version with custom suffix (arduino style)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/arduino/hardware/esp32/2.0.18-arduino.5'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBe('2.0.18-arduino.5');
      });

      it('should extract version with underscores', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1_2_3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('1_2_3');
      });
    });

    describe('Edge Cases', () => {
      it('should return undefined when buildProperties is undefined', () => {
        const version = extractPlatformVersionFromPath(undefined, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should return undefined when runtime.platform.path is missing', () => {
        const buildProperties = {
          'version': '1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should return undefined when runtime.platform.path is empty', () => {
        const buildProperties = {
          'runtime.platform.path': ''
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should return undefined when platform ID is malformed (no colon)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'invalid');
        expect(version).toBeUndefined();
      });

      it('should return undefined when platform ID has empty vendor', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, ':arch');
        expect(version).toBeUndefined();
      });

      it('should return undefined when platform ID has empty arch', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path does not contain platform pattern', () => {
        const buildProperties = {
          'runtime.platform.path': '/completely/different/path/structure/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path has vendor mismatch', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/wrongvendor/hardware/arch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path has arch mismatch', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/wrongarch/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path ends at arch (no version)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path ends with trailing slash (no version)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });
    });

    describe('Path with Subdirectories', () => {
      it('should extract version only (not include subdirectories)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3/cores/arduino'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('1.2.3');
      });

      it('should extract version from middle of longer path', () => {
        const buildProperties = {
          'runtime.platform.path': '/long/path/to/packages/vendor/hardware/arch/5.6.7/variants/board'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'vendor:arch');
        expect(version).toBe('5.6.7');
      });
    });

    describe('Case Sensitivity', () => {
      it('should match case-sensitively (vendor mismatch)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/Arduino/hardware/esp32/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should match case-sensitively (arch mismatch)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/arduino/hardware/ESP32/1.2.3'
        };

        const version = extractPlatformVersionFromPath(buildProperties, 'arduino:esp32');
        expect(version).toBeUndefined();
      });
    });
  });

  describe('getPlatformVersion', () => {
    describe('Successful Path Extraction', () => {
      it('should return version from runtime.platform.path when available', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/arduino/hardware/esp32/2.0.18-arduino.5',
          'version': 'v2.0.17-arduino.5'  // Outdated/invalid
        };

        const version = getPlatformVersion(buildProperties, 'arduino:esp32');
        expect(version).toBe('2.0.18-arduino.5');
      });

      it('should prefer path over version property even when both valid', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/3.0.0',
          'version': '2.0.0'
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBe('3.0.0');
      });
    });

    describe('Fallback to Version Property', () => {
      it('should fallback to version property when path is missing', () => {
        const buildProperties = {
          'version': '1.8.6'
        };

        const version = getPlatformVersion(buildProperties, 'arduino:avr');
        expect(version).toBe('1.8.6');
      });

      it('should fallback to version property when path extraction fails', () => {
        const buildProperties = {
          'runtime.platform.path': '/invalid/path/structure',
          'version': '2.0.0'
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBe('2.0.0');
      });

      it('should fallback to version property when platform ID is malformed', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.2.3',
          'version': '5.0.0'
        };

        const version = getPlatformVersion(buildProperties, 'invalid');
        expect(version).toBe('5.0.0');
      });

      it('should fallback even with invalid version property format', () => {
        const buildProperties = {
          'runtime.platform.path': '/invalid/path',
          'version': 'v1.2.3'  // Invalid format (v prefix)
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBe('v1.2.3');
      });
    });

    describe('Both Undefined', () => {
      it('should return undefined when buildProperties is undefined', () => {
        const version = getPlatformVersion(undefined, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should return undefined when both path and version are missing', () => {
        const buildProperties = {
          'some.other.property': 'value'
        };

        const version = getPlatformVersion(buildProperties, 'arduino:esp32');
        expect(version).toBeUndefined();
      });

      it('should return undefined when path extraction fails and version is missing', () => {
        const buildProperties = {
          'runtime.platform.path': '/invalid/path'
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBeUndefined();
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle ESP32 platform with correct version from path', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/tibor/Library/Arduino15/packages/arduino/hardware/esp32/2.0.18-arduino.5',
          'version': 'v2.0.17-arduino.5',  // Outdated with v prefix
          'build.board': 'ESP32_DEV',
          'build.f_cpu': '240000000L'
        };

        const version = getPlatformVersion(buildProperties, 'arduino:esp32');
        expect(version).toBe('2.0.18-arduino.5');
      });

      it('should handle Arduino AVR platform', () => {
        const buildProperties = {
          'runtime.platform.path': '/home/user/.arduino15/packages/arduino/hardware/avr/1.8.6',
          'version': '1.8.6',
          'build.board': 'AVR_UNO'
        };

        const version = getPlatformVersion(buildProperties, 'arduino:avr');
        expect(version).toBe('1.8.6');
      });

      it('should handle third-party platform (Adafruit SAMD)', () => {
        const buildProperties = {
          'runtime.platform.path': '/Users/user/Library/Arduino15/packages/adafruit/hardware/samd/1.7.14',
          'version': '1.7.14'
        };

        const version = getPlatformVersion(buildProperties, 'adafruit:samd');
        expect(version).toBe('1.7.14');
      });

      it('should handle platform without version in buildProperties', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/esp32/hardware/esp32/3.0.7',
          'build.board': 'ESP32S3_DEV'
        };

        const version = getPlatformVersion(buildProperties, 'esp32:esp32');
        expect(version).toBe('3.0.7');
      });
    });

    describe('Priority Testing', () => {
      it('should use path version even when version property is more recent (trust path)', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.0.0',
          'version': '2.0.0'  // Higher version in property
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBe('1.0.0');
      });

      it('should use path version even when version property looks cleaner', () => {
        const buildProperties = {
          'runtime.platform.path': '/packages/vendor/hardware/arch/1.0.0-beta.1',
          'version': '1.0.0'  // Cleaner version in property
        };

        const version = getPlatformVersion(buildProperties, 'vendor:arch');
        expect(version).toBe('1.0.0-beta.1');
      });
    });
  });
});

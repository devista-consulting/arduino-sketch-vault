/**
 * Unit tests for BoardSyncService
 */

import { BoardSyncService } from '../../../../services/board-sync-service';
import * as vscode from 'vscode';

// Mock vscode is already set up via jest.config.js

describe('BoardSyncService', () => {
  let service: BoardSyncService;
  let executeCommandSpy: jest.SpyInstance;
  let getCommandsSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new BoardSyncService();
    executeCommandSpy = jest.spyOn(vscode.commands, 'executeCommand');
    getCommandsSpy = jest.spyOn(vscode.commands, 'getCommands');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('applyFqbn', () => {
    it('should successfully apply FQBN with board selection and options', async () => {
      // Mock commands being available
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600',
        'esp32:esp32:esp32s3-USBMode--hwcdc'
      ]);

      executeCommandSpy.mockResolvedValue(undefined);

      const result = await service.applyFqbn('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc');

      expect(result.success).toBe(true);
      expect(result.boardSelected).toBe(true);
      expect(result.optionsApplied).toHaveLength(2);
      expect(result.optionsFailed).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // Verify commands were executed
      expect(executeCommandSpy).toHaveBeenCalledWith('arduino-select-board--esp32:esp32:esp32s3');
      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-UploadSpeed--921600');
      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-USBMode--hwcdc');
    });

    it('should successfully apply FQBN without options', async () => {
      getCommandsSpy.mockResolvedValue(['arduino-select-board--arduino:avr:uno']);
      executeCommandSpy.mockResolvedValue(undefined);

      const result = await service.applyFqbn('arduino:avr:uno');

      expect(result.success).toBe(true);
      expect(result.boardSelected).toBe(true);
      expect(result.optionsApplied).toHaveLength(0);
      expect(result.optionsFailed).toHaveLength(0);

      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('arduino-select-board--arduino:avr:uno');
    });

    it('should fail with invalid FQBN format', async () => {
      const result = await service.applyFqbn('invalid');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(false);
      expect(result.errors).toContain('Invalid FQBN format');
      expect(executeCommandSpy).not.toHaveBeenCalled();
    });

    it('should fail when board command is not available (timeout)', async () => {
      // Mock command never becoming available
      getCommandsSpy.mockResolvedValue([]);

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    }, 15000); // Increase timeout to 15 seconds for this test

    it('should handle partial success when some options fail', async () => {
      // Mock board selection available, but only one option available
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
        // USBMode command NOT available
      ]);

      executeCommandSpy.mockResolvedValue(undefined);

      const result = await service.applyFqbn('esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc');

      expect(result.success).toBe(false); // Not fully successful
      expect(result.boardSelected).toBe(true);
      expect(result.optionsApplied).toHaveLength(1);
      expect(result.optionsFailed).toHaveLength(1);

      // Check which option succeeded and which failed
      expect(result.optionsApplied[0]).toEqual({ option: 'UploadSpeed', value: '921600' });
      expect(result.optionsFailed[0]).toEqual({
        option: 'USBMode',
        value: 'hwcdc',
        reason: 'Command not found (option may not be available for this board)'
      });
    });

    it('should handle board selection command execution error', async () => {
      getCommandsSpy.mockResolvedValue(['arduino-select-board--esp32:esp32:esp32s3']);
      executeCommandSpy.mockRejectedValue(new Error('Command execution failed'));

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(false);
      expect(result.errors[0]).toContain('Failed to select board');
    });

    it('should handle option command execution error', async () => {
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
      ]);

      // Board selection succeeds, option execution fails
      executeCommandSpy
        .mockResolvedValueOnce(undefined) // Board selection success
        .mockRejectedValueOnce(new Error('Option execution failed')); // Option fails

      const result = await service.applyFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(true);
      expect(result.optionsApplied).toHaveLength(0);
      expect(result.optionsFailed).toHaveLength(1);
      expect(result.optionsFailed[0].reason).toContain('Execution failed');
    });

    it('should apply multiple options successfully', async () => {
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600',
        'esp32:esp32:esp32s3-USBMode--hwcdc',
        'esp32:esp32:esp32s3-CDCOnBoot--cdc'
      ]);

      executeCommandSpy.mockResolvedValue(undefined);

      const result = await service.applyFqbn(
        'esp32:esp32:esp32s3:UploadSpeed=921600,USBMode=hwcdc,CDCOnBoot=cdc'
      );

      expect(result.success).toBe(true);
      expect(result.optionsApplied).toHaveLength(3);
      expect(result.optionsFailed).toHaveLength(0);

      // Verify all options were applied
      expect(result.optionsApplied).toContainEqual({ option: 'UploadSpeed', value: '921600' });
      expect(result.optionsApplied).toContainEqual({ option: 'USBMode', value: 'hwcdc' });
      expect(result.optionsApplied).toContainEqual({ option: 'CDCOnBoot', value: 'cdc' });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Simulate an unexpected error by making getCommands throw
      getCommandsSpy.mockRejectedValue(new Error('Unexpected error'));

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('waitForCommand pattern', () => {
    it('should find command immediately if available', async () => {
      getCommandsSpy.mockResolvedValue(['arduino-select-board--esp32:esp32:esp32s3']);
      executeCommandSpy.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await service.applyFqbn('esp32:esp32:esp32s3');
      const duration = Date.now() - startTime;

      expect(result.boardSelected).toBe(true);
      // Should be fast (no polling needed)
      expect(duration).toBeLessThan(1000);
    });

    it('should poll and find command after delay', async () => {
      let callCount = 0;
      getCommandsSpy.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call: command not available
          return [];
        }
        // Second call: command available
        return ['arduino-select-board--esp32:esp32:esp32s3'];
      });

      executeCommandSpy.mockResolvedValue(undefined);

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.boardSelected).toBe(true);
      expect(callCount).toBeGreaterThan(1); // Should have polled multiple times
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error exception in main catch block', async () => {
      // Throw a string instead of Error object
      getCommandsSpy.mockRejectedValue('String error message');

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('String error message');
    });

    it('should handle non-Error exception in selectBoard', async () => {
      getCommandsSpy.mockResolvedValue(['arduino-select-board--esp32:esp32:esp32s3']);
      // Throw a string instead of Error object
      executeCommandSpy.mockRejectedValue('Board selection string error');

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(false);
      expect(result.errors[0]).toContain('Board selection string error');
    });

    it('should handle non-Error exception in setConfigOption', async () => {
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--921600'
      ]);

      // Board selection succeeds, option execution fails with string
      executeCommandSpy
        .mockResolvedValueOnce(undefined) // Board selection success
        .mockRejectedValueOnce('Option string error'); // Option fails with string

      const result = await service.applyFqbn('esp32:esp32:esp32s3:UploadSpeed=921600');

      expect(result.success).toBe(false);
      expect(result.boardSelected).toBe(true);
      expect(result.optionsFailed).toHaveLength(1);
      expect(result.optionsFailed[0].reason).toContain('Option string error');
    });

    it('should handle object exception in catch blocks', async () => {
      // Throw an object instead of Error
      getCommandsSpy.mockRejectedValue({ code: 500, message: 'Object error' });

      const result = await service.applyFqbn('esp32:esp32:esp32s3');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('[object Object]'); // String() converts object to this
    });
  });

  describe('command pattern validation', () => {
    it('should use correct board selection command pattern', async () => {
      getCommandsSpy.mockResolvedValue(['arduino-select-board--arduino:avr:uno']);
      executeCommandSpy.mockResolvedValue(undefined);

      await service.applyFqbn('arduino:avr:uno');

      expect(executeCommandSpy).toHaveBeenCalledWith('arduino-select-board--arduino:avr:uno');
    });

    it('should use correct option command pattern', async () => {
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--esp32:esp32:esp32s3',
        'esp32:esp32:esp32s3-UploadSpeed--115200'
      ]);

      executeCommandSpy.mockResolvedValue(undefined);

      await service.applyFqbn('esp32:esp32:esp32s3:UploadSpeed=115200');

      expect(executeCommandSpy).toHaveBeenCalledWith('esp32:esp32:esp32s3-UploadSpeed--115200');
    });

    it('should handle complex option values', async () => {
      getCommandsSpy.mockResolvedValue([
        'arduino-select-board--vendor:arch:board',
        'vendor:arch:board-Option--value-with-dashes'
      ]);

      executeCommandSpy.mockResolvedValue(undefined);

      await service.applyFqbn('vendor:arch:board:Option=value-with-dashes');

      expect(executeCommandSpy).toHaveBeenCalledWith('vendor:arch:board-Option--value-with-dashes');
    });
  });
});

/**
 * Unit tests for LogService
 */

import { LogService } from '../../../../services/log-service';
import type { LogEntry } from '../../../../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('LogService', () => {
  let logService: LogService;
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: any;
  let showInformationMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn()
    };

    // Mock vscode.window.createOutputChannel
    jest.spyOn(vscode.window, 'createOutputChannel').mockReturnValue(mockOutputChannel);

    // Mock showInformationMessage
    showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

    // Create mock extension context
    mockContext = {} as vscode.ExtensionContext;

    // Create service
    logService = new LogService(mockContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with workspace folder and load existing logs', async () => {
      const mockLogs: LogEntry[] = [
        {
          timestamp: '2025-01-01T00:00:00.000Z',
          sketchPath: '/test/workspace',
          fqbn: 'arduino:avr:uno',
          board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
          changes: [],
          changeType: 'initial'
        }
      ];

      // Mock fs
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockLogs));

      await logService.initialize();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join('/test/workspace', '.arduino-sketch-vault.json'),
        'utf-8'
      );
      expect(logService.getLogs()).toEqual(mockLogs);
    });

    it('should initialize without existing log file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await logService.initialize();

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(logService.getLogs()).toEqual([]);
    });

    it('should handle corrupted log file gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await logService.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load logs:', expect.any(Error));
      expect(logService.getLogs()).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing workspace folder', async () => {
      // Override workspace mock to have no folders
      (vscode.workspace.workspaceFolders as any) = undefined;

      await logService.initialize();

      // Should not crash, just not load any logs
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('logConfigChange', () => {
    beforeEach(async () => {
      // Ensure workspace folders are set
      (vscode.workspace.workspaceFolders as any) = [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0
        }
      ];
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation();
      await logService.initialize();
    });

    it('should log configuration change with all outputs', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'esp32:esp32:esp32s3:UploadSpeed=921600',
        board: { name: 'ESP32S3', fqbn: 'esp32:esp32:esp32s3' },
        port: { address: '/dev/ttyUSB0', protocol: 'serial' },
        changes: [
          {
            option: 'UploadSpeed',
            label: 'Upload Speed',
            previousValue: '460800',
            previousLabel: '460800',
            newValue: '921600',
            newLabel: '921600'
          }
        ],
        changeType: 'fqbn'
      };

      await logService.logConfigChange(entry);

      // Verify log was added to memory
      expect(logService.getLogs()).toHaveLength(1);
      expect(logService.getLogs()[0]).toEqual(entry);

      // Verify file write
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Verify output channel
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();

      // Verify notification (should show for non-initial changes)
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'Board config changed: Upload Speed: 460800 → 921600'
      );
    });

    it('should NOT show notification for initial state', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        changes: [],
        changeType: 'initial'
      };

      await logService.logConfigChange(entry);

      // Verify log was added
      expect(logService.getLogs()).toHaveLength(1);

      // Verify NO notification for initial state
      expect(showInformationMessageSpy).not.toHaveBeenCalled();
    });

    it('should NOT show notification for changes with empty change array', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        changes: [],
        changeType: 'fqbn'
      };

      await logService.logConfigChange(entry);

      expect(showInformationMessageSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple changes in notification', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'esp32:esp32:esp32s3',
        board: { name: 'ESP32S3', fqbn: 'esp32:esp32:esp32s3' },
        changes: [
          {
            option: 'UploadSpeed',
            label: 'Upload Speed',
            previousValue: '460800',
            previousLabel: '460800',
            newValue: '921600',
            newLabel: '921600'
          },
          {
            option: 'USBMode',
            label: 'USB Mode',
            previousValue: 'default',
            previousLabel: 'USB-OTG',
            newValue: 'hwcdc',
            newLabel: 'Hardware CDC'
          }
        ],
        changeType: 'board'
      };

      await logService.logConfigChange(entry);

      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        'Board config changed: Upload Speed: 460800 → 921600, USB Mode: USB-OTG → Hardware CDC'
      );
    });

    it('should format output to console correctly', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        port: { address: '/dev/ttyUSB0', protocol: 'serial' },
        changes: [
          {
            option: 'cpu',
            label: 'Processor',
            previousValue: 'atmega328',
            previousLabel: 'ATmega328 (Old Bootloader)',
            newValue: 'atmega328p',
            newLabel: 'ATmega328P'
          }
        ],
        changeType: 'board'
      };

      await logService.logConfigChange(entry);

      const calls = mockOutputChannel.appendLine.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Check the output contains expected information
      const output = calls[0][0];
      expect(output).toContain('[2025-01-01T12:00:00.000Z]');
      expect(output).toContain('/test/workspace');
      expect(output).toContain('arduino:avr:uno');
      expect(output).toContain('Arduino Uno');
      expect(output).toContain('/dev/ttyUSB0');
      expect(output).toContain('Processor');
      expect(output).toContain('ATmega328 (Old Bootloader) → ATmega328P');
    });

    it('should handle file write errors gracefully', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Disk full');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        changes: [],
        changeType: 'initial'
      };

      await logService.logConfigChange(entry);

      // Should still add to memory even if file write fails
      expect(logService.getLogs()).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write log file:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getLogs', () => {
    it('should return empty array initially', () => {
      expect(logService.getLogs()).toEqual([]);
    });

    it('should return all logged entries', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation();

      const entry1: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        changes: [],
        changeType: 'initial'
      };

      const entry2: LogEntry = {
        timestamp: '2025-01-01T12:05:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'esp32:esp32:esp32s3',
        board: { name: 'ESP32S3', fqbn: 'esp32:esp32:esp32s3' },
        changes: [],
        changeType: 'fqbn'
      };

      await logService.logConfigChange(entry1);
      await logService.logConfigChange(entry2);

      const logs = logService.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toEqual(entry1);
      expect(logs[1]).toEqual(entry2);
    });
  });

  describe('clearLogs', () => {
    beforeEach(async () => {
      // Ensure workspace folders are set
      (vscode.workspace.workspaceFolders as any) = [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0
        }
      ];
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation();
      await logService.initialize();
    });

    it('should clear all logs from memory and file', async () => {
      const entry: LogEntry = {
        timestamp: '2025-01-01T12:00:00.000Z',
        sketchPath: '/test/workspace',
        fqbn: 'arduino:avr:uno',
        board: { name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
        changes: [],
        changeType: 'initial'
      };

      await logService.logConfigChange(entry);
      expect(logService.getLogs()).toHaveLength(1);

      await logService.clearLogs();

      // Verify memory cleared
      expect(logService.getLogs()).toEqual([]);

      // Verify file cleared
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/test/workspace', '.arduino-sketch-vault.json'),
        '[]',
        'utf-8'
      );

      // Verify output channel message
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        '[Arduino Sketch Vault] Logs cleared\n'
      );

      // Verify notification
      expect(showInformationMessageSpy).toHaveBeenCalledWith('Arduino Sketch Vault logs cleared');
    });

    it('should handle clear errors gracefully', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await logService.clearLogs();

      // Should still clear memory
      expect(logService.getLogs()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear log file:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('showOutputChannel', () => {
    it('should show the output channel', () => {
      logService.showOutputChannel();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose the output channel', () => {
      logService.dispose();
      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });
  });
});

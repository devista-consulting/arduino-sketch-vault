/**
 * Mock implementation of vscode-arduino-api for testing
 */

import { EventEmitter } from 'events';
import type { BoardDetails, ConfigOption, Port } from '../../types';

// ==================== Event Emitter ====================
class ArduinoEventEmitter<T> {
  private emitter = new EventEmitter();

  fire(data: T): void {
    this.emitter.emit('event', data);
  }

  event(listener: (e: T) => any) {
    this.emitter.on('event', listener);
    return {
      dispose: () => {
        this.emitter.off('event', listener);
      }
    };
  }

  dispose(): void {
    this.emitter.removeAllListeners();
  }
}

// ==================== Arduino Context ====================
export class MockArduinoContext {
  private _fqbn?: string;
  private _boardDetails?: BoardDetails;
  private _port?: Port;
  private _sketchPath?: string;
  private _compileSummary?: any;
  private _userDirPath?: string;
  private _dataDirPath?: string;

  private fqbnEmitter = new ArduinoEventEmitter<string | undefined>();
  private boardDetailsEmitter = new ArduinoEventEmitter<BoardDetails | undefined>();
  private portEmitter = new ArduinoEventEmitter<Port | undefined>();

  constructor() {
    this._sketchPath = '/test/workspace';
    this._userDirPath = '/test/user';
    this._dataDirPath = '/test/data';
  }

  // ==================== Getters ====================
  get fqbn(): string | undefined {
    return this._fqbn;
  }

  get boardDetails(): BoardDetails | undefined {
    return this._boardDetails;
  }

  get port(): Port | undefined {
    return this._port;
  }

  get sketchPath(): string | undefined {
    return this._sketchPath;
  }

  get compileSummary(): any | undefined {
    return this._compileSummary;
  }

  get userDirPath(): string | undefined {
    return this._userDirPath;
  }

  get dataDirPath(): string | undefined {
    return this._dataDirPath;
  }

  // ==================== Event Listeners ====================
  onDidChange(property: 'fqbn'): (listener: (e: string | undefined) => any) => any;
  onDidChange(property: 'boardDetails'): (listener: (e: BoardDetails | undefined) => any) => any;
  onDidChange(property: 'port'): (listener: (e: Port | undefined) => any) => any;
  onDidChange(property: string): any {
    switch (property) {
      case 'fqbn':
        return this.fqbnEmitter.event.bind(this.fqbnEmitter);
      case 'boardDetails':
        return this.boardDetailsEmitter.event.bind(this.boardDetailsEmitter);
      case 'port':
        return this.portEmitter.event.bind(this.portEmitter);
      default:
        throw new Error(`Unknown property: ${property}`);
    }
  }

  // ==================== Test Helpers ====================
  _setFqbn(fqbn: string | undefined): void {
    this._fqbn = fqbn;
    this.fqbnEmitter.fire(fqbn);
  }

  _setBoardDetails(boardDetails: BoardDetails | undefined): void {
    this._boardDetails = boardDetails;
    this.boardDetailsEmitter.fire(boardDetails);
  }

  _setPort(port: Port | undefined): void {
    this._port = port;
    this.portEmitter.fire(port);
  }

  _setSketchPath(path: string | undefined): void {
    this._sketchPath = path;
  }
}

// ==================== Sample Board Details ====================
export const createESP32S3BoardDetails = (): BoardDetails => ({
  fqbn: 'esp32:esp32:esp32s3',
  configOptions: [
    {
      option: 'UploadSpeed',
      optionLabel: 'Upload Speed',
      values: [
        {
          value: '115200',
          valueLabel: '115200',
          selected: false
        },
        {
          value: '460800',
          valueLabel: '460800',
          selected: false
        },
        {
          value: '921600',
          valueLabel: '921600',
          selected: true
        }
      ]
    },
    {
      option: 'USBMode',
      optionLabel: 'USB Mode',
      values: [
        {
          value: 'hwcdc',
          valueLabel: 'Hardware CDC and JTAG',
          selected: true
        },
        {
          value: 'default',
          valueLabel: 'USB-OTG (TinyUSB)',
          selected: false
        }
      ]
    },
    {
      option: 'CDCOnBoot',
      optionLabel: 'CDC On Boot',
      values: [
        {
          value: 'cdc',
          valueLabel: 'Enabled',
          selected: true
        },
        {
          value: 'default',
          valueLabel: 'Disabled',
          selected: false
        }
      ]
    }
  ],
  buildProperties: {
    'build.board': 'ESP32S3_DEV',
    'build.f_cpu': '240000000L',
    'version': '3.0.7'
  },
  programmers: [],
  toolsDependencies: []
});

export const createArduinoUnoBoardDetails = (): BoardDetails => ({
  fqbn: 'arduino:avr:uno',
  configOptions: [
    {
      option: 'cpu',
      optionLabel: 'Processor',
      values: [
        {
          value: 'atmega328p',
          valueLabel: 'ATmega328P',
          selected: true
        },
        {
          value: 'atmega328',
          valueLabel: 'ATmega328P (Old Bootloader)',
          selected: false
        }
      ]
    }
  ],
  buildProperties: {
    'build.board': 'AVR_UNO',
    'build.f_cpu': '16000000L',
    'version': '1.8.6'
  },
  programmers: [],
  toolsDependencies: []
});

export const createBoardDetailsWithOptions = (
  fqbn: string,
  options: Array<{ option: string; optionLabel: string; selectedValue: string; values: string[] }>
): BoardDetails => ({
  fqbn,
  configOptions: options.map(opt => ({
    option: opt.option,
    optionLabel: opt.optionLabel,
    values: opt.values.map(val => ({
      value: val,
      valueLabel: val,
      selected: val === opt.selectedValue
    }))
  })),
  buildProperties: {
    'version': '1.0.0'
  },
  programmers: [],
  toolsDependencies: []
});

// ==================== Sample Ports ====================
export const createSerialPort = (address: string = '/dev/ttyUSB0'): Port => ({
  address,
  protocol: 'serial',
  protocolLabel: 'Serial Port (USB)',
  label: address,
  properties: {},
  hardwareId: 'USB_VID:PID=1A86:7523'
});

export const createNetworkPort = (address: string = '192.168.1.100'): Port => ({
  address,
  protocol: 'network',
  protocolLabel: 'Network Port',
  label: address,
  properties: {},
  hardwareId: ''
});

// ==================== Export ====================
export default MockArduinoContext;

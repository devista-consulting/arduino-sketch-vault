/**
 * Mock implementation of VS Code API for testing
 */

import { EventEmitter } from 'events';

// ==================== URI ====================
export class Uri {
  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string
  ) {}

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    const parts = value.split('://');
    return new Uri(parts[0] || '', '', parts[1] || '', '', '');
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }

  fsPath = this.path;
}

// ==================== Disposable ====================
export class Disposable {
  constructor(private callOnDispose: () => void) {}

  dispose(): void {
    this.callOnDispose();
  }

  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      disposables.forEach(d => d.dispose());
    });
  }
}

// ==================== Event Emitter ====================
class VSCodeEventEmitter<T> {
  private emitter = new EventEmitter();

  fire(data: T): void {
    this.emitter.emit('event', data);
  }

  get event() {
    return (listener: (e: T) => any) => {
      this.emitter.on('event', listener);
      return new Disposable(() => {
        this.emitter.off('event', listener);
      });
    };
  }

  dispose(): void {
    this.emitter.removeAllListeners();
  }
}

// ==================== QuickPickItem ====================
export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

// ==================== QuickPick ====================
export class QuickPick<T extends QuickPickItem> {
  title?: string;
  items: T[] = [];
  activeItems: T[] = [];
  selectedItems: T[] = [];
  placeholder?: string;
  private _onDidAccept = new VSCodeEventEmitter<void>();
  private _onDidHide = new VSCodeEventEmitter<void>();
  private _disposed = false;

  get onDidAccept() {
    return this._onDidAccept.event;
  }

  get onDidHide() {
    return this._onDidHide.event;
  }

  show(): void {
    // Mock implementation - in tests, we'll manually trigger events
  }

  hide(): void {
    this._onDidHide.fire();
  }

  dispose(): void {
    if (!this._disposed) {
      this._onDidAccept.dispose();
      this._onDidHide.dispose();
      this._disposed = true;
    }
  }

  // Test helper to simulate user selection
  _simulateAccept(): void {
    this.selectedItems = this.activeItems.length > 0 ? this.activeItems : [];
    this._onDidAccept.fire();
  }
}

// ==================== Input Box ====================
export class InputBox {
  value = '';
  placeholder?: string;
  prompt?: string;
  private _onDidAccept = new VSCodeEventEmitter<void>();
  private _onDidHide = new VSCodeEventEmitter<void>();

  get onDidAccept() {
    return this._onDidAccept.event;
  }

  get onDidHide() {
    return this._onDidHide.event;
  }

  show(): void {}

  hide(): void {
    this._onDidHide.fire();
  }

  dispose(): void {
    this._onDidAccept.dispose();
    this._onDidHide.dispose();
  }

  _simulateAccept(): void {
    this._onDidAccept.fire();
  }
}

// ==================== Output Channel ====================
export class OutputChannel {
  private output: string[] = [];

  append(value: string): void {
    this.output.push(value);
  }

  appendLine(value: string): void {
    this.output.push(value + '\n');
  }

  clear(): void {
    this.output = [];
  }

  show(): void {}

  hide(): void {}

  dispose(): void {
    this.output = [];
  }

  // Test helper
  _getOutput(): string {
    return this.output.join('');
  }
}

// ==================== Progress Location ====================
export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15
}

// ==================== Status Bar Item ====================
export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export class StatusBarItem {
  text = '';
  tooltip?: string;
  command?: string;
  alignment: StatusBarAlignment;
  priority?: number;

  constructor(alignment: StatusBarAlignment, priority?: number) {
    this.alignment = alignment;
    this.priority = priority;
  }

  show(): void {}

  hide(): void {}

  dispose(): void {}
}

// ==================== Window ====================
const window = {
  showInformationMessage: jest.fn((message: string, ...items: string[]) => {
    return Promise.resolve(items[0]);
  }),

  showWarningMessage: jest.fn((message: string, ...items: string[]) => {
    return Promise.resolve(items[0]);
  }),

  showErrorMessage: jest.fn((message: string, ...items: string[]) => {
    return Promise.resolve(items[0]);
  }),

  showQuickPick: jest.fn(<T extends QuickPickItem>(
    items: T[] | Promise<T[]>,
    options?: any
  ) => {
    return Promise.resolve(Array.isArray(items) ? items[0] : undefined);
  }),

  showInputBox: jest.fn((options?: any) => {
    return Promise.resolve('test-input');
  }),

  createQuickPick: jest.fn(<T extends QuickPickItem>() => {
    return new QuickPick<T>();
  }),

  createInputBox: jest.fn(() => {
    return new InputBox();
  }),

  createOutputChannel: jest.fn((name: string) => {
    return new OutputChannel();
  }),

  createStatusBarItem: jest.fn((alignment?: StatusBarAlignment, priority?: number) => {
    return new StatusBarItem(alignment || StatusBarAlignment.Left, priority);
  }),

  withProgress: jest.fn((options: any, task: any) => {
    return task({ report: jest.fn() });
  }),

  showTextDocument: jest.fn((document: any, options?: any) => {
    return Promise.resolve({});
  })
};

// ==================== Workspace ====================
const workspace = {
  workspaceFolders: [
    {
      uri: Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0
    }
  ],

  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
    stat: jest.fn(),
    readDirectory: jest.fn()
  },

  getConfiguration: jest.fn((section?: string) => {
    return {
      get: jest.fn((key: string, defaultValue?: any) => defaultValue),
      has: jest.fn(() => true),
      inspect: jest.fn(),
      update: jest.fn()
    };
  }),

  onDidChangeConfiguration: jest.fn(() => new Disposable(() => {})),

  openTextDocument: jest.fn((path: string) => {
    return Promise.resolve({});
  })
};

// ==================== Commands ====================
const commands = {
  registerCommand: jest.fn((command: string, callback: (...args: any[]) => any) => {
    return new Disposable(() => {});
  }),

  executeCommand: jest.fn((command: string, ...rest: any[]) => {
    return Promise.resolve();
  }),

  getCommands: jest.fn((filterInternal?: boolean) => {
    return Promise.resolve([
      'arduino-select-board--esp32:esp32:esp32s3',
      'esp32:esp32:esp32s3-UploadSpeed--921600',
      'esp32:esp32:esp32s3-UploadSpeed--460800',
      'esp32:esp32:esp32s3-USBMode--hwcdc'
    ]);
  })
};

// ==================== Extensions ====================
const extensions = {
  getExtension: jest.fn((extensionId: string) => {
    if (extensionId === 'dankeboy36.vscode-arduino-api') {
      return {
        exports: {} // Will be populated by arduino-api-mock
      };
    }
    return undefined;
  }),

  all: []
};

// ==================== Exports ====================
export {
  window,
  workspace,
  commands,
  extensions
};

// Export everything as default for module mock
export default {
  Uri,
  Disposable,
  window,
  workspace,
  commands,
  extensions,
  StatusBarAlignment,
  ProgressLocation
};

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from '../types';
import { OUTPUT_CHANNEL_NAME, LOG_FILENAME } from '../utils/constants';

export class LogService {
  private outputChannel: vscode.OutputChannel;
  private logs: LogEntry[] = [];
  private logFilePath: string | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }

  async initialize(): Promise<void> {
    // Determine log file location
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.logFilePath = path.join(
        workspaceFolders[0].uri.fsPath,
        LOG_FILENAME
      );
      await this.loadLogs();
    }
  }

  private async loadLogs(): Promise<void> {
    if (!this.logFilePath) {
      return;
    }

    try {
      if (fs.existsSync(this.logFilePath)) {
        const content = fs.readFileSync(this.logFilePath, 'utf-8');
        this.logs = JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }
  }

  async logConfigChange(entry: LogEntry): Promise<void> {
    // Add to in-memory log
    this.logs.push(entry);

    // Write to file
    await this.writeToFile();

    // Output to console
    this.outputToConsole(entry);

    // Show notification (only for actual changes, not initial state)
    if (entry.changeType !== 'initial' && entry.changes.length > 0) {
      this.showNotification(entry);
    }
  }

  private async writeToFile(): Promise<void> {
    if (!this.logFilePath) {
      return;
    }

    try {
      const content = JSON.stringify(this.logs, null, 2);
      fs.writeFileSync(this.logFilePath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const lines: string[] = [];
    lines.push(`[${entry.timestamp}] Board Configuration Changed`);
    lines.push(`  Sketch: ${entry.sketchPath || 'N/A'}`);
    lines.push(`  FQBN: ${entry.fqbn}`);

    if (entry.board) {
      lines.push(`  Board: ${entry.board.name}`);
    }

    if (entry.port) {
      lines.push(`  Port: ${entry.port.address} (${entry.port.protocol})`);
    }

    if (entry.changes.length > 0) {
      lines.push(`  Changes:`);
      entry.changes.forEach((change) => {
        const from = change.previousLabel || change.previousValue || 'None';
        const to = change.newLabel;
        lines.push(`    - ${change.label}: ${from} → ${to}`);
      });
    } else if (entry.changeType === 'initial') {
      lines.push(`  Initial configuration logged`);
    }

    lines.push(''); // Empty line for separation

    this.outputChannel.appendLine(lines.join('\n'));
  }

  private showNotification(entry: LogEntry): void {
    if (entry.changes.length === 0) {
      return;
    }

    // Create a concise notification message
    const changeDescriptions = entry.changes
      .map((c) => {
        const from = c.previousLabel || c.previousValue || 'None';
        const to = c.newLabel;
        return `${c.label}: ${from} → ${to}`;
      })
      .join(', ');

    const message = `Board config changed: ${changeDescriptions}`;
    vscode.window.showInformationMessage(message);
  }

  getLogs(): readonly LogEntry[] {
    return this.logs;
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    if (this.logFilePath) {
      try {
        fs.writeFileSync(this.logFilePath, '[]', 'utf-8');
      } catch (error) {
        console.error('Failed to clear log file:', error);
      }
    }
    this.outputChannel.appendLine('[Arduino Sketch Vault] Logs cleared\n');
    vscode.window.showInformationMessage('Arduino Sketch Vault logs cleared');
  }

  showOutputChannel(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

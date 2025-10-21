/**
 * Status Bar Service
 * Manages the status bar item showing active profile
 */

import * as vscode from 'vscode';
import type { ArduinoContext } from '../types';
import { ProfileService } from './profile-service';
import { extractBoardName } from '../utils/board-utils';
import {
  CIRCUIT_BOARD_ICON,
  STATUS_BAR_PRIORITY,
  STATUS_BAR_DEFAULT_TEXT,
  STATUS_BAR_TOOLTIP_BASE
} from '../utils/constants';

export class StatusBarService {
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private profileService: ProfileService,
    private arduinoContext: ArduinoContext | undefined,
    commandId: string
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      STATUS_BAR_PRIORITY
    );
    this.statusBarItem.command = commandId;
    this.statusBarItem.text = `$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`;
    this.statusBarItem.tooltip = STATUS_BAR_TOOLTIP_BASE;
  }

  /**
   * Update status bar with current active profile
   */
  async updateStatusBar(): Promise<void> {
    if (!this.arduinoContext) {
      this.statusBarItem.text = `$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`;
      this.statusBarItem.tooltip = `${STATUS_BAR_TOOLTIP_BASE}\nClick to select`;
      return;
    }

    const active = await this.profileService.getActiveProfile(this.arduinoContext);
    if (active) {
      this.statusBarItem.text = `$(${CIRCUIT_BOARD_ICON}) ${active.name.toUpperCase()}`;
      this.statusBarItem.tooltip = `Active: ${active.name}\nBoard: ${extractBoardName(active.fqbn)}\nClick to switch`;
    } else {
      this.statusBarItem.text = `$(${CIRCUIT_BOARD_ICON}) ${STATUS_BAR_DEFAULT_TEXT}`;
      this.statusBarItem.tooltip = `${STATUS_BAR_TOOLTIP_BASE}\nClick to select`;
    }
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

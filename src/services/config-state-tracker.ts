import { BoardDetails, ConfigChange, ConfigOption, ConfigValue } from '../types';

interface BoardConfigState {
  readonly fqbn: string;
  readonly configOptions: Map<string, SelectedConfigOption>;
  readonly programmerId: string | undefined;
}

interface SelectedConfigOption {
  readonly option: string;
  readonly label: string;
  readonly value: string;
  readonly valueLabel: string;
}

export class ConfigStateTracker {
  private previousStates = new Map<string, BoardConfigState>();

  detectChanges(
    fqbn: string,
    boardDetails: BoardDetails | undefined
  ): { isInitial: boolean; changes: ConfigChange[] } {
    if (!boardDetails) {
      return { isInitial: true, changes: [] };
    }

    const previousState = this.previousStates.get(fqbn);
    const newState = this.createState(fqbn, boardDetails);

    if (!previousState) {
      // First time seeing this board
      this.previousStates.set(fqbn, newState);
      return { isInitial: true, changes: [] };
    }

    const changes = this.compareStates(previousState, newState);
    this.previousStates.set(fqbn, newState);

    return { isInitial: false, changes };
  }

  private createState(
    fqbn: string,
    boardDetails: BoardDetails
  ): BoardConfigState {
    const configOptions = new Map<string, SelectedConfigOption>();

    for (const option of boardDetails.configOptions) {
      const selectedValue = option.values.find((v: ConfigValue) => v.selected);
      if (selectedValue) {
        configOptions.set(option.option, {
          option: option.option,
          label: option.optionLabel,
          value: selectedValue.value,
          valueLabel: selectedValue.valueLabel,
        });
      }
    }

    // Extract programmer from FQBN or board details if available
    const programmerId = this.extractProgrammerFromFqbn(fqbn);

    return {
      fqbn,
      configOptions,
      programmerId,
    };
  }

  private extractProgrammerFromFqbn(fqbn: string): string | undefined {
    // FQBNs can include programmer info, but it's not always present
    // This is a simplified extraction
    return undefined;
  }

  private compareStates(
    previous: BoardConfigState,
    current: BoardConfigState
  ): ConfigChange[] {
    const changes: ConfigChange[] = [];

    // Check for changed config options
    for (const [option, currentValue] of current.configOptions) {
      const previousValue = previous.configOptions.get(option);

      if (!previousValue) {
        // New option that wasn't present before
        changes.push({
          option: currentValue.option,
          label: currentValue.label,
          previousValue: undefined,
          newValue: currentValue.value,
          previousLabel: undefined,
          newLabel: currentValue.valueLabel,
        });
      } else if (previousValue.value !== currentValue.value) {
        // Option value changed
        changes.push({
          option: currentValue.option,
          label: currentValue.label,
          previousValue: previousValue.value,
          newValue: currentValue.value,
          previousLabel: previousValue.valueLabel,
          newLabel: currentValue.valueLabel,
        });
      }
    }

    return changes;
  }

  clear(): void {
    this.previousStates.clear();
  }
}

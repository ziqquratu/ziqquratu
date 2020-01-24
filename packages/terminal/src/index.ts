import {ScopeLogFormatter} from '@ziqquratu/core';
import chalk from 'chalk';

export class ColoredScopeFormatter extends ScopeLogFormatter {
  protected formatTimestamp(timestamp: number): string {
    return chalk.grey(super.formatTimestamp(timestamp));
  }

  protected formatScope(scope: string[]): string {
    return chalk.blue(super.formatScope(scope));
  }

  protected formatMessage(message: string): string {
    return message.replace(/'.*?'/g, m => chalk.green(m.substr(1, m.length - 2)));
  }
}

export const terminal = () => new ColoredScopeFormatter();

import { BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

export default class RefreshFitbitTokens extends BaseCommand {
  static commandName = 'refresh:fitbit-tokens';
  static description = '';

  static options: CommandOptions = {};

  async run() {
    this.logger.info('Hello world from "RefreshFitbitTokens"');
  }
}

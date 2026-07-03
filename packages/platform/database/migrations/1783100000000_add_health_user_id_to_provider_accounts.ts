import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'provider_accounts';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Google Health's per-user id (from `getIdentity`), used to map incoming
      // webhook notifications back to a provider account. Distinct from the
      // OAuth `sub` stored in `provider_user_id`.
      table.string('health_user_id').nullable();
      table.index('health_user_id');
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('health_user_id');
    });
  }
}

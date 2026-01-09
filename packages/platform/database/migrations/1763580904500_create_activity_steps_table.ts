import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'activity_steps';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table
        .integer('provider_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('provider_accounts')
        .onDelete('CASCADE');
      table.date('date').notNullable();
      table.time('time').nullable(); // NULL for daily aggregates, populated for intraday
      table.integer('steps').notNullable();
      table.string('granularity').notNullable().defaultTo('daily').checkIn(['daily', 'intraday']);
      table.timestamp('synced_at').notNullable();

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // Unique constraint: prevents duplicates at whatever granularity
      table.unique(['provider_account_id', 'date', 'time']);
      // Index for efficient queries
      table.index(['provider_account_id', 'date']);
      table.index(['provider_account_id', 'date', 'time']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'daily_steps';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.date('date').notNullable();
      table.integer('steps').notNullable();
      table
        .integer('primary_account_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL');

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // Unique constraint: one record per user per day
      table.unique(['user_id', 'date']);
      // Index for efficient queries
      table.index(['user_id', 'date']);
      table.index(['date']); // For leaderboard queries
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

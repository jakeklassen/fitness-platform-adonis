import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'accounts';

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
      table.string('provider').notNullable();
      table.string('provider_id').notNullable();
      table.text('access_token').nullable();
      table.text('refresh_token').nullable();
      table.timestamp('expires_at').nullable();

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // Ensure a user can only link each provider once
      table.unique(['user_id', 'provider']);
      // Ensure provider user IDs are unique per provider
      table.unique(['provider', 'provider_id']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

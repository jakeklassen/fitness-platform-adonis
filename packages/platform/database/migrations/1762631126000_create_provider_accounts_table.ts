import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'provider_accounts';

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
      table
        .integer('provider_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('providers')
        .onDelete('CASCADE');
      table.string('provider_user_id').notNullable();
      table.text('access_token').nullable();
      table.text('refresh_token').nullable();
      table.timestamp('expires_at').nullable();

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // Ensure a user can only link each provider once
      table.unique(['user_id', 'provider_id']);
      // Ensure provider user IDs are unique per provider
      table.unique(['provider_id', 'provider_user_id']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

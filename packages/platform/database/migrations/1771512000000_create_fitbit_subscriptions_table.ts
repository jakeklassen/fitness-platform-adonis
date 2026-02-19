import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'fitbit_subscriptions';

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
        .integer('provider_account_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('provider_accounts')
        .onDelete('CASCADE');

      table.string('subscription_id').notNullable();
      table.string('collection_type').notNullable();
      table.string('fitbit_subscriber_id').nullable();
      table.boolean('is_active').defaultTo(true);

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      table.unique(['provider_account_id', 'collection_type']);
      table.unique(['subscription_id']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

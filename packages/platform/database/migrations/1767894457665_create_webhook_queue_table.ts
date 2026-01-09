import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'webhook_queue';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();

      table.string('job_type').notNullable();
      table.json('payload').notNullable();
      table.string('status').notNullable().defaultTo('pending');
      table.integer('retries').defaultTo(0);
      table.text('error').nullable();
      table.timestamp('processed_at').nullable();

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      table.index(['status', 'created_at']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

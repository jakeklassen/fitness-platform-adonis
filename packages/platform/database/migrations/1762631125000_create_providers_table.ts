import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'providers';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.string('name').notNullable().unique();
      table.string('display_name').notNullable();

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
    });

    // Seed initial provider
    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        name: 'fitbit',
        display_name: 'Fitbit',
        created_at: new Date(),
        updated_at: new Date(),
      });
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

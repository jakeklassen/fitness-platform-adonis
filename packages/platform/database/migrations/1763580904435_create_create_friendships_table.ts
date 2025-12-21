import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'friendships';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('friend_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .string('status')
        .notNullable()
        .defaultTo('pending')
        .checkIn(['pending', 'accepted', 'declined']);

      table.timestamp('created_at');
      table.timestamp('updated_at');

      // Ensure a user can't send multiple requests to the same person
      table.unique(['user_id', 'friend_id']);

      // Index for faster queries
      table.index(['user_id', 'status']);
      table.index(['friend_id', 'status']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

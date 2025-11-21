import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'competition_members';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('competitions')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('status', ['invited', 'accepted', 'declined'], {
          useNative: true,
          enumName: 'competition_member_status',
        })
        .notNullable()
        .defaultTo('invited');
      table
        .integer('invited_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // Unique constraint: user can only be a member once per competition
      table.unique(['competition_id', 'user_id']);
      // Indexes
      table.index(['competition_id', 'status']);
      table.index(['user_id', 'status']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}

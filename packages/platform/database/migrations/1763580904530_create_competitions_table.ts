import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'competitions';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table
        .enum('goal_type', ['total_steps', 'goal_based'], {
          useNative: true,
          enumName: 'competition_goal_type',
          existingType: true,
        })
        .notNullable()
        .defaultTo('total_steps');
      table.integer('goal_value').unsigned().nullable(); // For goal-based competitions
      table.integer('team_id').unsigned().nullable().comment('If set, this is a team competition');
      // .references('id')
      // .inTable('teams')
      // .onDelete('CASCADE'); // Uncomment when teams table exists
      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enum('visibility', ['private', 'public'], {
          useNative: true,
          enumName: 'visibility',
          existingType: true,
        })
        .notNullable()
        .defaultTo('private');
      table
        .enum('status', ['draft', 'active', 'ended'], {
          useNative: true,
          enumName: 'competition_status',
          existingType: true,
        })
        .notNullable()
        .defaultTo('draft');

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.timestamp('deleted_at').nullable(); // Soft delete for cancelled competitions

      // Indexes
      table.index(['created_by']);
      table.index(['team_id']);
      table.index(['status']);
      table.index(['start_date', 'end_date']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
    await this.db.rawQuery('DROP TYPE IF EXISTS competition_goal_type');
    await this.db.rawQuery('DROP TYPE IF EXISTS visibility');
    await this.db.rawQuery('DROP TYPE IF EXISTS competition_status');
  }
}

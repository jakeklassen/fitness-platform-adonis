import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'providers';

  async up() {
    // Seed the Google Health provider (replaces Fitbit going forward).
    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        name: 'google_health',
        display_name: 'Google Health',
        created_at: new Date(),
        updated_at: new Date(),
      });
    });
  }

  async down() {
    this.defer(async (db) => {
      await db.from(this.tableName).where('name', 'google_health').delete();
    });
  }
}

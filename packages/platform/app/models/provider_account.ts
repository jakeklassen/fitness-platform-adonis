import ActivityStep from '#models/activity_step';
import Provider from '#models/provider';
import User from '#models/user';
import encryption from '@adonisjs/core/services/encryption';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class ProviderAccount extends BaseModel {
  static table = 'provider_accounts';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column()
  declare providerId: number;

  @column()
  declare providerUserId: string;

  @column({
    prepare: (value: string | null) => {
      return value ? encryption.encrypt(value) : null;
    },
    consume: (value: string | null) => {
      return value ? encryption.decrypt<string>(value) : null;
    },
  })
  declare accessToken: string | null;

  @column({
    prepare: (value: string | null) => {
      return value ? encryption.encrypt(value) : null;
    },
    consume: (value: string | null) => {
      return value ? encryption.decrypt<string>(value) : null;
    },
  })
  declare refreshToken: string | null;

  @column.dateTime()
  declare expiresAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => Provider)
  declare provider: BelongsTo<typeof Provider>;

  @hasMany(() => ActivityStep)
  declare activitySteps: HasMany<typeof ActivityStep>;
}

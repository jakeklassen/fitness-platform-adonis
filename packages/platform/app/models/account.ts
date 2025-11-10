import User from '#models/user';
import encryption from '@adonisjs/core/services/encryption';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class Account extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column()
  declare provider: string;

  @column()
  declare providerId: string;

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
}

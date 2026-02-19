import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class DailyStep extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column.date()
  declare date: DateTime;

  @column()
  declare steps: number;

  @column()
  declare primaryProviderAccountId: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => ProviderAccount, {
    foreignKey: 'primaryProviderAccountId',
  })
  declare primaryProviderAccount: BelongsTo<typeof ProviderAccount>;
}

import ProviderAccount from '#models/provider_account';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class ActivityStep extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare providerAccountId: number;

  @column.date()
  declare date: DateTime;

  @column()
  declare time: string | null;

  @column()
  declare steps: number;

  @column()
  declare granularity: 'daily' | 'intraday';

  @column.dateTime()
  declare syncedAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => ProviderAccount)
  declare account: BelongsTo<typeof ProviderAccount>;
}

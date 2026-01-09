import ProviderAccount from '#models/provider_account';
import User from '#models/user';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class FitbitSubscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column()
  declare providerAccountId: number;

  @column()
  declare subscriptionId: string;

  @column()
  declare collectionType: string;

  @column()
  declare fitbitSubscriberId: string | null;

  @column()
  declare isActive: boolean;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => ProviderAccount)
  declare providerAccount: BelongsTo<typeof ProviderAccount>;
}

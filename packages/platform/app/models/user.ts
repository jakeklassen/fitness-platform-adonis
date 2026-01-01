import ProviderAccount from '#models/provider_account';
import CompetitionMember from '#models/competition_member';
import DailyStep from '#models/daily_step';
import Friendship from '#models/friendship';
import Provider from '#models/provider';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
});

export default class User extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User);

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare fullName: string | null;

  @column()
  declare email: string;

  @column({ serializeAs: null })
  declare password: string;

  @column()
  declare preferredStepsProviderId: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;

  @hasMany(() => ProviderAccount)
  declare accounts: HasMany<typeof ProviderAccount>;

  @belongsTo(() => Provider, {
    foreignKey: 'preferredStepsProviderId',
  })
  declare preferredStepsProvider: BelongsTo<typeof Provider>;

  @hasMany(() => DailyStep)
  declare dailySteps: HasMany<typeof DailyStep>;

  @hasMany(() => CompetitionMember)
  declare competitionMemberships: HasMany<typeof CompetitionMember>;

  @hasMany(() => Friendship, {
    foreignKey: 'userId',
  })
  declare sentFriendRequests: HasMany<typeof Friendship>;

  @hasMany(() => Friendship, {
    foreignKey: 'friendId',
  })
  declare receivedFriendRequests: HasMany<typeof Friendship>;
}

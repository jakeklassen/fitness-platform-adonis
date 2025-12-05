import Account from '#models/account';
import CompetitionMember from '#models/competition_member';
import DailyStep from '#models/daily_step';
import Friendship from '#models/friendship';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
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
  declare preferredStepsProvider: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null;

  @hasMany(() => Account)
  declare accounts: HasMany<typeof Account>;

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

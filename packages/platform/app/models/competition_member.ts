import Competition from '#models/competition';
import User from '#models/user';
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export type MemberStatus = 'invited' | 'accepted' | 'declined';

export default class CompetitionMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare competitionId: number;

  @column()
  declare userId: number;

  @column()
  declare status: MemberStatus;

  @column()
  declare invitedBy: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  // Relationships
  @belongsTo(() => Competition)
  declare competition: BelongsTo<typeof Competition>;

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => User, {
    foreignKey: 'invitedBy',
  })
  declare inviter: BelongsTo<typeof User>;

  // Scopes
  static accepted = scope((query) => {
    query.where('status', 'accepted');
  });

  static pending = scope((query) => {
    query.where('status', 'invited');
  });

  // Helper methods
  isAccepted(): boolean {
    return this.status === 'accepted';
  }

  isPending(): boolean {
    return this.status === 'invited';
  }

  isDeclined(): boolean {
    return this.status === 'declined';
  }
}

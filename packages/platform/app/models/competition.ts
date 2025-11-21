import CompetitionMember from '#models/competition_member';
import User from '#models/user';
import { BaseModel, belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export type GoalType = 'total_steps' | 'goal_based';
export type CompetitionStatus = 'draft' | 'active' | 'ended';
export type Visibility = 'private' | 'public';

export default class Competition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare description: string | null;

  @column.date()
  declare startDate: DateTime;

  @column.date()
  declare endDate: DateTime;

  @column()
  declare goalType: GoalType;

  @column()
  declare goalValue: number | null;

  @column()
  declare teamId: number | null;

  @column()
  declare createdBy: number;

  @column()
  declare visibility: Visibility;

  @column()
  declare status: CompetitionStatus;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @column.dateTime()
  declare deletedAt: DateTime | null;

  // Relationships
  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>;

  @hasMany(() => CompetitionMember)
  declare members: HasMany<typeof CompetitionMember>;

  // Scopes
  static active = scope((query) => {
    query.where('status', 'active').whereNull('deleted_at');
  });

  static notDeleted = scope((query) => {
    query.whereNull('deleted_at');
  });

  // Helper methods
  isActive(): boolean {
    const now = DateTime.now();
    return (
      this.status === 'active' &&
      this.startDate <= now &&
      this.endDate >= now &&
      this.deletedAt === null
    );
  }

  isTeamCompetition(): boolean {
    return this.teamId !== null;
  }

  hasStarted(): boolean {
    return this.startDate <= DateTime.now();
  }

  hasEnded(): boolean {
    return this.endDate < DateTime.now();
  }
}

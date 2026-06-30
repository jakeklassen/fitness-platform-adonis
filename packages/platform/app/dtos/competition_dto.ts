import type Competition from '#models/competition';

export class CompetitionDto {
  constructor(private competition: Competition) {}

  toJson() {
    return {
      id: this.competition.id,
      name: this.competition.name,
      description: this.competition.description,
      startDate: this.competition.startDate.toISODate()!,
      endDate: this.competition.endDate.toISODate()!,
      goalType: this.competition.goalType,
      goalValue: this.competition.goalValue,
      visibility: this.competition.visibility,
      status: this.competition.status,
      createdBy: this.competition.createdBy,
    };
  }
}

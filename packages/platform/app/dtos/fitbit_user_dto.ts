import { DateTime } from 'luxon';

/**
 * DTO for Fitbit user data with validation
 */
export class FitbitUserDto {
  constructor(private data: any) {}

  toJson(): {
    age: number | undefined;
    gender: string | undefined;
    averageDailySteps: number | undefined;
    height: number | undefined;
    heightUnit: string | undefined;
    weight: number | undefined;
    weightUnit: string | undefined;
    memberSince: string | undefined;
    memberSinceFormatted: string | undefined;
    displayName: string | undefined;
    avatar640: string | undefined;
    topBadges: Array<{
      shortName: string;
      description: string;
      image100px: string;
    }>;
  } {
    // Validate and extract only the fields we need
    const user = this.data;

    return {
      age: typeof user.age === 'number' ? user.age : undefined,
      gender: typeof user.gender === 'string' ? user.gender : undefined,
      averageDailySteps:
        typeof user.averageDailySteps === 'number' ? user.averageDailySteps : undefined,
      height: typeof user.height === 'number' ? user.height : undefined,
      heightUnit: typeof user.heightUnit === 'string' ? user.heightUnit : undefined,
      weight: typeof user.weight === 'number' && user.weight > 0 ? user.weight : undefined,
      weightUnit: typeof user.weightUnit === 'string' ? user.weightUnit : undefined,
      memberSince: typeof user.memberSince === 'string' ? user.memberSince : undefined,
      memberSinceFormatted: this.formatMemberSince(user.memberSince),
      displayName: typeof user.displayName === 'string' ? user.displayName : undefined,
      avatar640: typeof user.avatar640 === 'string' ? user.avatar640 : undefined,
      topBadges: this.validateTopBadges(user.topBadges),
    };
  }

  private formatMemberSince(memberSince: any): string | undefined {
    if (typeof memberSince !== 'string') {
      return undefined;
    }

    try {
      const date = DateTime.fromISO(memberSince);
      return date.isValid ? date.toFormat('MM/dd/yyyy') : undefined;
    } catch {
      return undefined;
    }
  }

  private validateTopBadges(badges: any): Array<{
    shortName: string;
    description: string;
    image100px: string;
  }> {
    if (!Array.isArray(badges)) {
      return [];
    }

    return badges
      .filter((badge) => {
        return (
          typeof badge === 'object' &&
          badge !== null &&
          typeof badge.shortName === 'string' &&
          typeof badge.description === 'string' &&
          typeof badge.image100px === 'string'
        );
      })
      .map((badge) => ({
        shortName: badge.shortName,
        description: badge.description,
        image100px: badge.image100px,
      }));
  }
}

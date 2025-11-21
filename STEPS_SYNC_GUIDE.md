# Steps Sync System Guide

This guide explains how to use the time-series steps syncing system that supports both daily and intraday data from multiple fitness providers.

## Overview

The system uses a two-table approach:
- **`activity_steps`**: Stores raw time-series data from each provider
- **`daily_steps`**: Stores de-duplicated daily totals (computed from raw data)

This design supports both current daily polling and future intraday syncing with intelligent de-duplication.

## Database Schema

### activity_steps
- Stores raw step data at whatever granularity the provider gives
- Links to `accounts` table (which tracks the fitness provider)
- Supports both daily and intraday granularity
- Unique constraint on `(account_id, date, time)`

### daily_steps
- Stores the computed daily total for each user
- Tracks which provider's data was used via `primary_account_id`
- Used for competitions and leaderboards
- Unique constraint on `(user_id, date)`

## Running Migrations

```bash
cd packages/platform
node ace migration:run
```

## Usage Examples

### 1. Storing Daily Step Data (Current Approach)

When polling FitBit's daily endpoint:

```typescript
import ActivityStep from '#models/activity_step';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { DateTime } from 'luxon';

// After fetching from FitBit API
const response = await fetch(
  `https://api.fitbit.com/1/user/-/activities/steps/date/2025-11-20/1d.json`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

const data = await response.json();
const dateValue = data['activities-steps'][0];

// Store raw data
await ActivityStep.updateOrCreate(
  {
    accountId: account.id,
    date: dateValue.dateTime,
    time: null, // NULL for daily data
  },
  {
    steps: parseInt(dateValue.value),
    granularity: 'daily',
    syncedAt: DateTime.now(),
  }
);

// Aggregate into daily_steps table
const aggregationService = new StepsAggregationService();
await aggregationService.aggregateDailySteps(account.userId, dateValue.dateTime);
```

### 2. Storing Intraday Step Data (Future Approach)

When polling FitBit's intraday endpoint (15-minute intervals):

```typescript
import ActivityStep from '#models/activity_step';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { DateTime } from 'luxon';

// After fetching from FitBit intraday API
const response = await fetch(
  `https://api.fitbit.com/1/user/-/activities/steps/date/2025-11-20/1d/15min.json`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

const data = await response.json();
const date = data['activities-steps'][0].dateTime;

// Store each 15-minute interval
for (const interval of data['activities-steps-intraday'].dataset) {
  await ActivityStep.updateOrCreate(
    {
      accountId: account.id,
      date: date,
      time: interval.time, // e.g., "09:15:00"
    },
    {
      steps: interval.value,
      granularity: 'intraday',
      syncedAt: DateTime.now(),
    }
  );
}

// Aggregate - will use intelligent merging
const aggregationService = new StepsAggregationService();
await aggregationService.aggregateDailySteps(account.userId, date);
```

### 3. Querying User's Daily Steps

```typescript
import DailyStep from '#models/daily_step';

// Get user's steps for a specific date
const dailyStep = await DailyStep.query()
  .where('user_id', userId)
  .where('date', '2025-11-20')
  .first();

console.log(`Steps: ${dailyStep?.steps || 0}`);

// Get total steps for a date range (for competitions)
const result = await DailyStep.query()
  .where('user_id', userId)
  .whereBetween('date', ['2025-11-01', '2025-11-30'])
  .sum('steps as total');

console.log(`Total steps: ${result[0].$extras.total}`);
```

### 4. Competition Leaderboard Query

```typescript
import DailyStep from '#models/daily_step';

// Get top 10 users for a competition period
const leaderboard = await DailyStep.query()
  .select('user_id')
  .sum('steps as total_steps')
  .whereBetween('date', ['2025-11-01', '2025-11-30'])
  .groupBy('user_id')
  .orderBy('total_steps', 'desc')
  .limit(10)
  .preload('user');

for (const entry of leaderboard) {
  console.log(`${entry.user.fullName}: ${entry.$extras.total_steps} steps`);
}
```

### 5. Setting User's Preferred Provider

```typescript
import User from '#models/user';

// Set user's preferred provider for de-duplication
const user = await User.findOrFail(userId);
user.preferredStepsProvider = 'fitbit'; // or 'garmin', etc.
await user.save();
```

### 6. Batch Aggregation (for Scheduled Jobs)

```typescript
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { DateTime } from 'luxon';

const aggregationService = new StepsAggregationService();

// Aggregate all users for yesterday
const yesterday = DateTime.now().minus({ days: 1 }).toISODate();
await aggregationService.aggregateAllUsersForDate(yesterday);
```

## Scheduled Job Example

Add this to your `start/scheduler.ts`:

```typescript
import scheduler from 'adonisjs-scheduler/services/main';
import { StepsAggregationService } from '#services/steps_aggregation_service';
import { DateTime } from 'luxon';

// Run aggregation daily at 1 AM
scheduler
  .call(async () => {
    const aggregationService = new StepsAggregationService();
    const yesterday = DateTime.now().minus({ days: 1 }).toISODate();

    console.log(`[Steps Sync] Aggregating steps for ${yesterday}`);
    await aggregationService.aggregateAllUsersForDate(yesterday);
    console.log(`[Steps Sync] Aggregation complete`);
  })
  .daily()
  .at('01:00');
```

## De-duplication Strategy

When a user has multiple providers (e.g., FitBit and Garmin):

### With Daily Data
- The system picks ONE provider's daily total
- Priority: User preference > Most recent sync

### With Intraday Data (Future)
- The system merges time-series intelligently
- Only applies priority when timestamps conflict
- Example: FitBit data from 9am-5pm + Garmin data from 6pm-8pm = combined total

## Migration Path

1. **Phase 1 (Now)**: Daily polling, all data has `granularity: 'daily'`, `time: null`
2. **Phase 2 (Future)**: Add intraday polling for supported providers
3. **Phase 3**: System automatically uses intelligent merging when intraday data exists

No code changes needed for existing features when upgrading to intraday!

## Best Practices

1. **Always aggregate after storing raw data**: The `daily_steps` table is the source of truth
2. **Use transactions for batch inserts**: When inserting multiple intervals
3. **Handle API errors gracefully**: Don't fail the whole sync if one interval fails
4. **Monitor synced_at timestamps**: Detect stale data or sync failures
5. **Index wisely**: The unique constraints provide covering indexes for common queries

## Troubleshooting

### Steps not showing up in competitions
- Check if aggregation ran: Query `daily_steps` table
- Check raw data exists: Query `activity_steps` table
- Manually trigger aggregation for that date/user

### Duplicate step counts
- Check unique constraints are in place
- Verify aggregation logic is using the service, not manual queries

### Missing intraday data
- Confirm provider supports intraday API
- Check `granularity` field is set to 'intraday'
- Verify `time` field is populated (not null)

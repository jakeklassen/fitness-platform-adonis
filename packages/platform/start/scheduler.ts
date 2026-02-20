import SyncFitbitStepsJob from '#jobs/sync_fitbit_steps_job';
import logger from '@adonisjs/core/services/logger';

try {
  await SyncFitbitStepsJob.schedule({}).cron('0 * * * *').id('sync-fitbit-hourly');
  logger.info('Registered job schedule: sync-fitbit-hourly (every hour)');
} catch {
  logger.warn('Failed to register job schedules (queue tables may not exist yet — run migrations)');
}

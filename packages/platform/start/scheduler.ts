import SyncFitbitStepsJob from '#jobs/sync_fitbit_steps_job';

await SyncFitbitStepsJob.schedule({}).cron('0 * * * *').id('sync-fitbit-hourly');

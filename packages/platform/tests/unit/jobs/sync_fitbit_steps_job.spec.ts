import SyncFitbitStepsJob from '#jobs/sync_fitbit_steps_job';
import { test } from '@japa/runner';
import queue from '@adonisjs/queue/services/main';

test.group('SyncFitbitStepsJob', (group) => {
  group.each.setup(() => {
    return () => {
      queue.restore();
    };
  });

  test('dispatches successfully', async () => {
    const fake = queue.fake();

    await SyncFitbitStepsJob.dispatch({});

    fake.assertPushed(SyncFitbitStepsJob);
    fake.assertPushedCount(1);
  });

  test('dispatches to the fitbit queue', async ({ assert }) => {
    const fake = queue.fake();

    await SyncFitbitStepsJob.dispatch({});

    const pushed = fake.getPushedJobsOn('fitbit');

    assert.lengthOf(pushed, 1);
  });
});

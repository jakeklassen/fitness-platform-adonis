import BackfillFitbitStepsJob from '#jobs/backfill_fitbit_steps_job';
import { test } from '@japa/runner';
import queue from '@adonisjs/queue/services/main';

test.group('BackfillFitbitStepsJob', (group) => {
  group.each.setup(() => {
    return () => {
      queue.restore();
    };
  });

  test('dispatches successfully with userId payload', async ({ assert }) => {
    const fake = queue.fake();

    await BackfillFitbitStepsJob.dispatch({ userId: 42 });

    fake.assertPushed(BackfillFitbitStepsJob);
    fake.assertPushedCount(1);

    const pushed = fake.getPushedJobs();

    assert.lengthOf(pushed, 1);
    assert.deepEqual(pushed[0].job.payload, { userId: 42 });
  });

  test('dispatches to the fitbit queue', async ({ assert }) => {
    const fake = queue.fake();

    await BackfillFitbitStepsJob.dispatch({ userId: 1 });

    const pushed = fake.getPushedJobsOn('fitbit');

    assert.lengthOf(pushed, 1);
  });
});

import ProcessFitbitNotificationJob from '#jobs/process_fitbit_notification_job';
import { test } from '@japa/runner';
import queue from '@adonisjs/queue/services/main';

test.group('ProcessFitbitNotificationJob', (group) => {
  group.each.setup(() => {
    return () => {
      queue.restore();
    };
  });

  test('dispatches with correct payload shape', async ({ assert }) => {
    const fake = queue.fake();

    await ProcessFitbitNotificationJob.dispatch({
      collectionType: 'activities',
      date: '2024-01-15',
      ownerId: 'fitbit-user-123',
      ownerType: 'user',
      subscriptionId: 'sub-123',
    });

    fake.assertPushed(ProcessFitbitNotificationJob);
    fake.assertPushedCount(1);

    const pushed = fake.getPushedJobs();

    assert.lengthOf(pushed, 1);
    assert.equal(pushed[0].job.payload.collectionType, 'activities');
    assert.equal(pushed[0].job.payload.ownerId, 'fitbit-user-123');
    assert.equal(pushed[0].job.payload.date, '2024-01-15');
  });

  test('dispatches to the fitbit queue', async ({ assert }) => {
    const fake = queue.fake();

    await ProcessFitbitNotificationJob.dispatch({
      collectionType: 'activities',
      date: '2024-01-15',
      ownerId: 'fitbit-user-456',
      ownerType: 'user',
      subscriptionId: 'sub-456',
    });

    const pushed = fake.getPushedJobsOn('fitbit');

    assert.lengthOf(pushed, 1);
  });

  test('dispatches multiple notifications independently', async () => {
    const fake = queue.fake();

    await ProcessFitbitNotificationJob.dispatch({
      collectionType: 'activities',
      date: '2024-01-15',
      ownerId: 'fitbit-user-1',
      ownerType: 'user',
      subscriptionId: 'sub-1',
    });

    await ProcessFitbitNotificationJob.dispatch({
      collectionType: 'sleep',
      date: '2024-01-15',
      ownerId: 'fitbit-user-2',
      ownerType: 'user',
      subscriptionId: 'sub-2',
    });

    fake.assertPushedCount(2);
  });
});

import User from '#models/user';
import { test } from '@japa/runner';

test.group('Smoke test', () => {
  test('database connection works and migrations ran', async ({ assert }) => {
    const users = await User.all();

    assert.isArray(users);
  });

  test('can create and query a user', async ({ assert }) => {
    const email = `smoke-test-${Date.now()}@example.com`;

    const user = await User.create({
      email,
      password: 'password123',
      fullName: 'Smoke Test',
    });

    assert.isNotNull(user.id);

    const found = await User.find(user.id);

    assert.isNotNull(found);
    assert.equal(found!.email, email);
  });
});

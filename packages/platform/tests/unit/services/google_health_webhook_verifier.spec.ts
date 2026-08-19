import { GoogleHealthWebhookVerifier } from '#services/google_health_webhook_verifier';
import { makeTinkSigner as makeSigner } from '#tests/utils/tink_signer';
import { test } from '@japa/runner';

test.group('GoogleHealthWebhookVerifier', () => {
  const body = Buffer.from(JSON.stringify({ data: { operation: 'UPSERT', dataType: 'steps' } }));

  test('accepts a correctly signed payload', async ({ assert }) => {
    const { keyset, sign } = makeSigner();
    const verifier = new GoogleHealthWebhookVerifier();
    verifier.loadKeyset(keyset);

    assert.isTrue(await verifier.verify(body, sign(body)));
  });

  test('rejects a tampered body', async ({ assert }) => {
    const { keyset, sign } = makeSigner();
    const verifier = new GoogleHealthWebhookVerifier();
    verifier.loadKeyset(keyset);

    const signature = sign(body);

    assert.isFalse(
      await verifier.verify(Buffer.from(JSON.stringify({ data: 'tampered' })), signature),
    );
  });

  test('rejects a signature from an unknown key id', async ({ assert }) => {
    const signer = makeSigner();
    const verifier = new GoogleHealthWebhookVerifier();
    verifier.loadKeyset(signer.keyset);

    // Sign with a different key that isn't in the loaded keyset.
    const other = makeSigner(987654321);

    assert.isFalse(await verifier.verify(body, other.sign(body)));
  });

  test('rejects a missing or malformed signature header', async ({ assert }) => {
    const { keyset } = makeSigner();
    const verifier = new GoogleHealthWebhookVerifier();
    verifier.loadKeyset(keyset);

    assert.isFalse(await verifier.verify(body, undefined));
    assert.isFalse(await verifier.verify(body, 'not-base64-tink'));
  });
});

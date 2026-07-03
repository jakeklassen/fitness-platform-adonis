import crypto from 'node:crypto';

/**
 * Test helper that mints a P-256 keypair and produces a Tink-format public
 * keyset + a signer, mirroring how Google signs Health API webhooks:
 * ECDSA P-256/SHA-256 (DER) framed with Tink's 5-byte prefix (0x01 + keyId).
 */
export function makeTinkSigner(keyId = 123456789) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const x = Buffer.from(jwk.x ?? '', 'base64url');
  const y = Buffer.from(jwk.y ?? '', 'base64url');

  // EcdsaPublicKey protobuf: params(SHA256/P256/DER), field 3 = x, field 4 = y.
  const params = Buffer.from([0x08, 0x03, 0x10, 0x02, 0x18, 0x02]);
  const value = Buffer.concat([
    Buffer.from([0x12, params.length]),
    params,
    Buffer.from([0x1a, x.length]),
    x,
    Buffer.from([0x22, y.length]),
    y,
  ]);

  const keyset = {
    primaryKeyId: keyId,
    key: [
      {
        keyId,
        status: 'ENABLED',
        outputPrefixType: 'TINK',
        keyData: {
          typeUrl: 'type.googleapis.com/google.crypto.tink.EcdsaPublicKey',
          value: value.toString('base64'),
        },
      },
    ],
  };

  const sign = (body: string | Buffer) => {
    const derSignature = crypto.sign('sha256', Buffer.from(body), privateKey);
    const prefix = Buffer.alloc(5);
    prefix[0] = 0x01;
    prefix.writeUInt32BE(keyId, 1);

    return Buffer.concat([prefix, derSignature]).toString('base64');
  };

  return { keyset, sign };
}

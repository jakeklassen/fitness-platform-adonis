import logger from '@adonisjs/core/services/logger';
import crypto from 'node:crypto';

const KEYSET_URL = 'https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json';
const KEYSET_TTL_MS = 6 * 60 * 60 * 1000; // refresh keyset every 6h (keys rotate ~30d)

interface TinkKeyset {
  key?: Array<{
    keyId?: number;
    status?: string;
    keyData?: { value?: string; typeUrl?: string };
  }>;
}

/**
 * Strip leading zero bytes then left-pad to 32 bytes — an EC P-256 coordinate.
 */
function normalizeCoord(buf: Buffer): Buffer {
  let start = 0;

  while (start < buf.length - 1 && buf[start] === 0x00) {
    start += 1;
  }

  const trimmed = buf.subarray(start);

  if (trimmed.length > 32) {
    throw new Error('EC coordinate longer than 32 bytes');
  }

  return Buffer.concat([Buffer.alloc(32 - trimmed.length), trimmed]);
}

/**
 * Extract the x/y coordinates from a serialized Tink `EcdsaPublicKey` protobuf.
 * Layout: field 2 = params (skipped), field 3 = x, field 4 = y (both bytes).
 */
function extractXy(value: Buffer): { x: Buffer; y: Buffer } {
  let i = 0;
  let x: Buffer | undefined;
  let y: Buffer | undefined;

  while (i < value.length) {
    const tag = value[i];
    i += 1;
    const field = tag >> 3;
    const wireType = tag & 0x07;

    if (wireType === 0) {
      // varint — advance past it
      while (i < value.length && (value[i] & 0x80) !== 0) {
        i += 1;
      }
      i += 1;
    } else if (wireType === 2) {
      // length-delimited (length fits in one byte for params/x/y here)
      const length = value[i];
      i += 1;
      const data = value.subarray(i, i + length);
      i += length;

      if (field === 3) {
        x = data;
      } else if (field === 4) {
        y = data;
      }
    } else {
      throw new Error(`Unsupported protobuf wire type ${wireType}`);
    }
  }

  if (!x || !y) {
    throw new Error('EcdsaPublicKey is missing x/y coordinates');
  }

  return { x: normalizeCoord(x), y: normalizeCoord(y) };
}

function keyObjectFromTink(value: Buffer): crypto.KeyObject {
  const { x, y } = extractXy(value);

  return crypto.createPublicKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: x.toString('base64url'),
      y: y.toString('base64url'),
    },
  });
}

/**
 * Verifies Google Health API webhook signatures (`GOOGLE-HEALTH-API-SIGNATURE`).
 *
 * Signatures are ECDSA P-256/SHA-256 (DER) over the raw request body, framed
 * with Tink's 5-byte prefix (0x01 + big-endian keyId), verified against Google's
 * public keyset. Uses `node:crypto` (no Tink dependency) — the docs explicitly
 * bless manual verification.
 */
export class GoogleHealthWebhookVerifier {
  #keys = new Map<number, crypto.KeyObject>();
  #fetchedAt = 0;

  constructor(private keysetUrl: string = KEYSET_URL) {}

  /**
   * Load a keyset JSON (public for testing).
   */
  loadKeyset(keyset: TinkKeyset): void {
    const keys = new Map<number, crypto.KeyObject>();

    for (const key of keyset.key ?? []) {
      if (key.status !== 'ENABLED' || typeof key.keyId !== 'number' || !key.keyData?.value) {
        continue;
      }

      try {
        keys.set(key.keyId, keyObjectFromTink(Buffer.from(key.keyData.value, 'base64')));
      } catch (error) {
        logger.warn({ err: error, keyId: key.keyId }, 'Skipping unparseable webhook key');
      }
    }

    this.#keys = keys;
    this.#fetchedAt = Date.now();
  }

  private async ensureKeyset(): Promise<void> {
    if (this.#keys.size > 0 && Date.now() - this.#fetchedAt < KEYSET_TTL_MS) {
      return;
    }

    const response = await fetch(this.keysetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch webhook keyset: ${response.status}`);
    }

    this.loadKeyset((await response.json()) as TinkKeyset);
    this.#fetchedAt = Date.now();
  }

  /**
   * Verify the base64 `GOOGLE-HEALTH-API-SIGNATURE` header against the raw body.
   */
  async verify(rawBody: Buffer, signatureHeader: string | undefined): Promise<boolean> {
    if (!signatureHeader) {
      return false;
    }

    try {
      await this.ensureKeyset();
    } catch (error) {
      logger.error({ err: error }, 'Could not load Google Health webhook keyset');

      return false;
    }

    const signature = Buffer.from(signatureHeader, 'base64');

    if (signature.length < 6 || signature[0] !== 0x01) {
      return false;
    }

    const keyId = signature.readUInt32BE(1);
    const publicKey = this.#keys.get(keyId);

    if (!publicKey) {
      return false;
    }

    return crypto.verify('sha256', rawBody, publicKey, signature.subarray(5));
  }
}

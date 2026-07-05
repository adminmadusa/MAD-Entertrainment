import crypto from 'crypto';

import { getEnv } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptPayload(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext; // Prevent double encryption

  const key = Buffer.from(getEnv().DLQ_ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  return `${PREFIX}${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptPayload(ciphertext: string): string {
  if (!isEncrypted(ciphertext)) return ciphertext; // Plaintext fallback compatibility

  try {
    const parts = ciphertext.substring(PREFIX.length).split(':');
    if (parts.length !== 3) return ciphertext; // Fallback if format does not match

    const [ivHex, tagHex, encryptedHex] = parts;
    const key = Buffer.from(getEnv().DLQ_ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error(`Decryption failed: ${(err as Error).message}`);
  }
}

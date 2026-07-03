import { describe, expect, it, vi } from 'vitest';
import * as envConfig from '../config/env';
import { encryptPayload, decryptPayload, isEncrypted } from './encryption';

vi.mock('../config/env', () => ({
  getEnv: () => ({
    DLQ_ENCRYPTION_KEY: 'a_secret_key_of_32_characters_long_for_dev_test',
  }),
  validateEnv: () => ({
    DLQ_ENCRYPTION_KEY: 'a_secret_key_of_32_characters_long_for_dev_test',
  }),
}));

describe('AES-256-GCM Encryption Utility', () => {
  it('should encrypt and decrypt a string payload correctly', () => {
    const plaintext = 'Secret user data: customer@gmail.com';
    const encrypted = encryptPayload(plaintext);

    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should prevent double encryption by returning the value as-is if already encrypted', () => {
    const plaintext = 'customer@gmail.com';
    const encryptedFirst = encryptPayload(plaintext);
    const encryptedSecond = encryptPayload(encryptedFirst);

    expect(encryptedSecond).toBe(encryptedFirst);
  });

  it('should fallback to plaintext when trying to decrypt a string without the encrypted prefix', () => {
    const plaintext = 'Plaintext customer data';
    const decrypted = decryptPayload(plaintext);

    expect(decrypted).toBe(plaintext);
  });

  it('should throw an error if decrypting with an incorrect key', () => {
    const plaintext = 'Super secret';
    const encrypted = encryptPayload(plaintext);

    // Spy on getEnv to return a different key for decryption
    const spy = vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      DLQ_ENCRYPTION_KEY: 'different_secret_key_32_characters_long_for_test',
    } as any);

    try {
      expect(() => decryptPayload(encrypted)).toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

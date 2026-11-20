import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_ADMIN_SECRET: '12345678901234567890123456789012',
    JWT_SESSION_SECRET: '12345678901234567890123456789012',
    REDIS_URL: 'redis://localhost:6379',
  })),
}));

import type Redis from 'ioredis';

import {
  COMPARE_AND_DELETE_LUA,
  releaseLockAtomic,
  releaseLocksAtomic,
} from './redis';

describe('Redis Atomic Distributed Lock Release', () => {
  let mockRedis: {
    eval: ReturnType<typeof vi.fn>;
    store: Map<string, string>;
  };

  beforeEach(() => {
    const store = new Map<string, string>();
    mockRedis = {
      store,
      eval: vi.fn(async (script: string, numkeys: number, key: string, owner: string) => {
        if (script !== COMPARE_AND_DELETE_LUA || numkeys !== 1) {
          throw new Error('Invalid script or numkeys argument to eval');
        }
        const currentValue = store.get(key);
        if (currentValue !== undefined && currentValue === owner) {
          store.delete(key);
          return 1;
        }
        return 0;
      }),
    };
  });

  it('should successfully delete lock when owner matches (returns true)', async () => {
    const lockKey = 'mad:lock:event:evt-100:seat:A-12';
    const ownerToken = 'session-owner-uuid-1';
    mockRedis.store.set(lockKey, ownerToken);

    const released = await releaseLockAtomic(mockRedis as unknown as Redis, lockKey, ownerToken);

    expect(released).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      COMPARE_AND_DELETE_LUA,
      1,
      lockKey,
      ownerToken
    );
    expect(mockRedis.store.has(lockKey)).toBe(false);
  });

  it('should reject release when ownership mismatches and preserve the active lock (returns false)', async () => {
    const lockKey = 'mad:lock:event:evt-100:seat:A-12';
    const legitimateOwner = 'session-owner-uuid-1';
    const impostorSession = 'session-other-uuid-2';
    mockRedis.store.set(lockKey, legitimateOwner);

    const released = await releaseLockAtomic(mockRedis as unknown as Redis, lockKey, impostorSession);

    expect(released).toBe(false);
    expect(mockRedis.store.get(lockKey)).toBe(legitimateOwner); // Lock preserved!
  });

  it('should return false when the lock has already expired (key absent in Redis)', async () => {
    const lockKey = 'mad:lock:event:evt-100:seat:A-12';
    const ownerToken = 'session-owner-uuid-1';
    // Key not set in mockRedis.store (simulating TTL expiration)

    const released = await releaseLockAtomic(mockRedis as unknown as Redis, lockKey, ownerToken);

    expect(released).toBe(false);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      COMPARE_AND_DELETE_LUA,
      1,
      lockKey,
      ownerToken
    );
  });

  it('should protect replacement lock ownership when an old owner attempts late release', async () => {
    const lockKey = 'mad:lock:event:evt-100:seat:A-12';
    const originalOwner = 'session-slow-worker';
    const replacementOwner = 'session-new-buyer';

    // Original owner's lock expired and replacement owner acquired it
    mockRedis.store.set(lockKey, replacementOwner);

    // Slow worker finishes and attempts to release with its original token
    const released = await releaseLockAtomic(mockRedis as unknown as Redis, lockKey, originalOwner);

    expect(released).toBe(false);
    // Crucial invariant: replacement owner's lock remains active and untouched
    expect(mockRedis.store.get(lockKey)).toBe(replacementOwner);
  });

  it('should handle concurrent release calls safely (only one caller succeeds)', async () => {
    const lockKey = 'mad:lock:event:evt-100:seat:A-12';
    const ownerToken = 'session-owner-uuid-1';
    mockRedis.store.set(lockKey, ownerToken);

    // Two concurrent release calls for the same lock
    const [result1, result2] = await Promise.all([
      releaseLockAtomic(mockRedis as unknown as Redis, lockKey, ownerToken),
      releaseLockAtomic(mockRedis as unknown as Redis, lockKey, ownerToken),
    ]);

    // Exactly one call succeeds, the other returns false because the key is already deleted
    expect([result1, result2].filter(Boolean)).toHaveLength(1);
    expect(mockRedis.store.has(lockKey)).toBe(false);
  });

  it('should atomically release multiple keys and return only successfully released keys', async () => {
    const owner = 'session-owner-1';
    const key1 = 'mad:lock:event:1:seat:1';
    const key2 = 'mad:lock:event:1:seat:2';
    const key3 = 'mad:lock:event:1:seat:3';

    mockRedis.store.set(key1, owner);
    mockRedis.store.set(key2, 'different-owner');
    // key3 is absent/expired

    const released = await releaseLocksAtomic(
      mockRedis as unknown as Redis,
      [key1, key2, key3],
      owner
    );

    expect(released).toEqual([key1]);
    expect(mockRedis.store.has(key1)).toBe(false);
    expect(mockRedis.store.get(key2)).toBe('different-owner');
  });

  it('should propagate Redis execution errors when eval rejects', async () => {
    const redisWithError = {
      eval: vi.fn().mockRejectedValue(new Error('ECONNREFUSED: Redis offline')),
    };

    await expect(
      releaseLockAtomic(
        redisWithError as unknown as Redis,
        'mad:lock:test',
        'owner-1'
      )
    ).rejects.toThrow('ECONNREFUSED: Redis offline');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { runInTransaction, _resetTransactionSupport } from './transaction';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'development',
    APP_ENV: 'local',
    LOG_LEVEL: 'debug',
  })),
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'development',
    APP_ENV: 'local',
    LOG_LEVEL: 'debug',
  })),
}));

const { mockSession, mockConnection } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      await callback();
    }),
    endSession: vi.fn().mockResolvedValue(undefined),
  };

  const connection = {
    readyState: 1,
    getClient: vi.fn().mockReturnValue({
      topology: { description: { type: 'ReplicaSetWithPrimary' } }
    }),
    db: {
      command: vi.fn().mockResolvedValue({ setName: 'rs0' })
    }
  };

  return { mockSession: session, mockConnection: connection };
});

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockResolvedValue(mockSession),
      connection: mockConnection,
    },
    startSession: vi.fn().mockResolvedValue(mockSession),
    connection: mockConnection,
  };
});

describe('runInTransaction utility', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetTransactionSupport();
    vi.clearAllMocks();
    
    // Default mock behavior
    vi.mocked(mongoose.startSession).mockResolvedValue(mockSession as any);
    mockConnection.getClient.mockReturnValue({
      topology: { description: { type: 'ReplicaSetWithPrimary' } }
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // Test 1: Transaction session available (Executes normally)
  it('should execute callback with active session when transactions are supported', async () => {
    const callback = vi.fn().mockResolvedValue('success-result');
    const result = await runInTransaction(callback);

    expect(result).toBe('success-result');
    expect(mongoose.startSession).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(mockSession);
  });

  // Test 2: Production/Staging - Session unavailable (Throws error, no fallback)
  it('should throw an error and not execute callback if session creation fails in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';

    vi.mocked(mongoose.startSession).mockRejectedValueOnce(new Error('Session error') as never);

    const callback = vi.fn().mockResolvedValue('should-not-run');

    await expect(runInTransaction(callback)).rejects.toThrow(
      'Failed to create a MongoDB transaction session, but transactions are mandatory in production/staging.'
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it('should throw an error if transactions are unsupported in staging', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'staging';

    mockConnection.getClient.mockReturnValue({
      topology: { description: { type: 'Single' } }
    });

    const callback = vi.fn().mockResolvedValue('should-not-run');

    await expect(runInTransaction(callback)).rejects.toThrow(
      'MongoDB transactions are not supported on this deployment, but are mandatory in production/staging.'
    );

    expect(callback).not.toHaveBeenCalled();
  });

  // Test 3: Development - Session unavailable (graceful fallback)
  it('should fall back gracefully to non-transactional execution in development when session fails', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'local';

    vi.mocked(mongoose.startSession).mockRejectedValueOnce(new Error('Session start failed') as never);

    const callback = vi.fn().mockResolvedValue('fallback-result');
    const result = await runInTransaction(callback);

    expect(result).toBe('fallback-result');
    expect(callback).toHaveBeenCalledWith(undefined);
  });

  // Test 4: Nested transaction safety
  it('should execute normally under nested runs without regressions', async () => {
    const callbackOuter = vi.fn().mockImplementation(async (sessionOuter) => {
      const resultInner = await runInTransaction(async (sessionInner) => {
        return 'inner';
      });
      return `outer-${resultInner}`;
    });

    const result = await runInTransaction(callbackOuter);
    expect(result).toBe('outer-inner');
    expect(callbackOuter).toHaveBeenCalled();
  });

  // Test 5: exactly-once callback guarantee in normal path
  it('should execute callback exactly once on successful transaction', async () => {
    const callback = vi.fn().mockResolvedValue('success');
    await runInTransaction(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // Test 6: exactly-once callback guarantee and error propagation on normal error
  it('should execute callback exactly once and propagate error on normal transaction error', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('Normal DB write error'));
    
    mockSession.withTransaction.mockImplementationOnce(async (cb) => {
      await cb();
    });

    await expect(runInTransaction(callback)).rejects.toThrow('Normal DB write error');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // Test 7: replica failure rethrow and capability cache update behavior
  it('should re-throw replica set support error, execute callback exactly once, and update capability cache', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'local';

    const callback = vi.fn().mockResolvedValue('partial-work');

    // Mock withTransaction to call callback then throw replica support error
    mockSession.withTransaction.mockImplementationOnce(async (cb) => {
      await cb();
      throw new Error('CommandNotSupported: This MongoDB deployment does not support replica sets');
    });

    await expect(runInTransaction(callback)).rejects.toThrow('CommandNotSupported');
    expect(callback).toHaveBeenCalledTimes(1);

    // Verify capability cache update: subsequent call should bypass startSession and execute fallback fn(undefined)
    vi.mocked(mongoose.startSession).mockClear();
    const callback2 = vi.fn().mockResolvedValue('fallback-success');
    const result2 = await runInTransaction(callback2);

    expect(result2).toBe('fallback-success');
    expect(mongoose.startSession).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith(undefined);
  });
});

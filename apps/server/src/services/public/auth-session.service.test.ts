import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RefreshTokenModel } from '../../models/refresh-token.schema';
import { UserModel } from '../../models/user.schema';
import { AuthService } from './auth.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    GOOGLE_CLIENT_ID: 'google_client_id_placeholder',
  })),
}));

vi.mock('../../utils/jwt', () => ({
  signUserToken: vi.fn(() => 'mock-access-token'),
}));

vi.mock('../../models/refresh-token.schema', () => ({
  RefreshTokenModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
  },
}));

vi.mock('../../models/magic-token.schema', () => ({
  MagicTokenModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findOne: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../lib/email', () => ({
  magicLinkHtml: vi.fn(),
}));

const mockRedis = {
  set: vi.fn(),
  ttl: vi.fn(),
  del: vi.fn(),
};

vi.mock('../../config/redis', () => ({
  getRedis: vi.fn(() => mockRedis),
  isRedisConnected: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AuthService - refreshSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if refresh token is missing', async () => {
    await expect(AuthService.refreshSession('', '')).rejects.toThrow('Refresh token is required');
  });

  it('should throw error if refresh token is not found in database', async () => {
    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(null);
    await expect(AuthService.refreshSession('unknown-token', 'any-csrf')).rejects.toThrow('Invalid session');
  });

  it('should perform normal refresh rotation successfully', async () => {
    const expiredAt = new Date(Date.now() + 600000);
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'valid-token-abc',
      csrfToken: 'valid-csrf-token',
      isRevoked: false,
      expiresAt: expiredAt,
      userId: 'user-id-999',
      save: vi.fn(),
    };

    const mockSuccessorRecord = {
      token: 'new-rotated-token-xyz',
      csrfToken: 'new-csrf-token',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);
    vi.mocked(RefreshTokenModel.findOneAndUpdate).mockResolvedValue(mockTokenRecord as any);
    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue(mockSuccessorRecord as any);

    const result = await AuthService.refreshSession('valid-token-abc', 'valid-csrf-token');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('new-rotated-token-xyz');
    expect(result.csrfToken).toBe('new-csrf-token');
    expect(RefreshTokenModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'token-id-123', isRevoked: false },
      { $set: { isRevoked: true, replacedByToken: expect.any(String) } },
      { new: true }
    );
  });

  it('should throw error if refresh token has expired', async () => {
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'expired-token-123',
      csrfToken: 'some-csrf-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() - 10000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('expired-token-123', 'some-csrf-token')).rejects.toThrow('Session has expired');
  });

  it('should handle legitimate concurrent refresh requests within grace period', async () => {
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'recently-revoked-token',
      csrfToken: 'some-csrf-token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'valid-successor-token',
      updatedAt: new Date(Date.now() - 1000),
      userId: 'user-id-999',
    };

    const mockSuccessorRecord = {
      token: 'valid-successor-token',
      csrfToken: 'successor-csrf-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne)
      .mockResolvedValueOnce(mockTokenRecord as any)
      .mockResolvedValueOnce(mockSuccessorRecord as any);

    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);

    const result = await AuthService.refreshSession('recently-revoked-token', 'some-csrf-token');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('valid-successor-token');
    expect(RefreshTokenModel.updateMany).not.toHaveBeenCalled();
  });

  it('should resolve concurrent refresh races atomically', async () => {
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'active-token-abc',
      csrfToken: 'active-csrf-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValueOnce(mockTokenRecord as any);
    vi.mocked(RefreshTokenModel.findOneAndUpdate).mockResolvedValueOnce(null);

    const reFetchedRecord = {
      _id: 'token-id-123',
      token: 'active-token-abc',
      isRevoked: true,
      replacedByToken: 'winner-successor-token',
    };

    const mockSuccessorRecord = {
      token: 'winner-successor-token',
      csrfToken: 'winner-csrf-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findById).mockResolvedValue(reFetchedRecord as any);
    vi.mocked(RefreshTokenModel.findOne).mockResolvedValueOnce(mockSuccessorRecord as any);
    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);

    const result = await AuthService.refreshSession('active-token-abc', 'active-csrf-token');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('winner-successor-token');
  });

  it('should revoke all user refresh tokens on actual replay attack (outside grace period)', async () => {
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'stale-revoked-token',
      csrfToken: 'some-csrf',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'successor-token',
      updatedAt: new Date(Date.now() - 20000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('stale-revoked-token', 'some-csrf')).rejects.toThrow('Session compromised');

    expect(RefreshTokenModel.updateMany).toHaveBeenCalledWith({ userId: 'user-id-999' }, { isRevoked: true });
  });
});

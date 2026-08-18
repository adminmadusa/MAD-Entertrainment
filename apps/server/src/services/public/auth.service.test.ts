import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationType } from '@mad/shared';

import { isRedisConnected } from '../../config/redis';
import { magicLinkHtml } from '../../lib/email';
import { Booking } from '../../models/booking.schema';
import { MagicTokenModel } from '../../models/magic-token.schema';
import { RefreshTokenModel } from '../../models/refresh-token.schema';
import { UserModel } from '../../models/user.schema';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
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
    const expiredAt = new Date(Date.now() + 600000); // 10 minutes from now
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
      expiresAt: new Date(Date.now() - 10000), // expired 10 seconds ago
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('expired-token-123', 'some-csrf-token')).rejects.toThrow('Session has expired');
  });

  it('should handle legitimate concurrent refresh requests within grace period', async () => {
    // Current request supplies a token that has been revoked 1 second ago
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'recently-revoked-token',
      csrfToken: 'some-csrf-token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'valid-successor-token',
      updatedAt: new Date(Date.now() - 1000), // rotated 1 second ago (well within 10s grace period)
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
      .mockResolvedValueOnce(mockTokenRecord as any) // first find the revoked token
      .mockResolvedValueOnce(mockSuccessorRecord as any); // then find the successor

    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);

    const result = await AuthService.refreshSession('recently-revoked-token', 'some-csrf-token');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('valid-successor-token');
    expect(RefreshTokenModel.updateMany).not.toHaveBeenCalled();
  });

  it('should resolve concurrent refresh races atomically', async () => {
    // Current request finds the token as active
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'active-token-abc',
      csrfToken: 'active-csrf-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    // The atomic update fails because another concurrent request won the race and updated the document
    vi.mocked(RefreshTokenModel.findOne).mockResolvedValueOnce(mockTokenRecord as any);
    vi.mocked(RefreshTokenModel.findOneAndUpdate).mockResolvedValueOnce(null);

    // Re-fetch should now return the updated record showing it has been rotated
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
    // Current request supplies a token that has been revoked 20 seconds ago
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'stale-revoked-token',
      csrfToken: 'some-csrf',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'successor-token',
      updatedAt: new Date(Date.now() - 20000), // rotated 20 seconds ago (outside 10s grace period)
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('stale-revoked-token', 'some-csrf')).rejects.toThrow('Session compromised');

    expect(RefreshTokenModel.updateMany).toHaveBeenCalledWith({ userId: 'user-id-999' }, { isRevoked: true });
  });
});

describe('AuthService - requestMagicLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OTP-001: Successful OTP request (token created, notification created, queue job created, Redis lock created)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(mockRedis.set).mockResolvedValue('OK');
    vi.mocked(magicLinkHtml).mockResolvedValue('<html>magic link</html>');

    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      createdAt: new Date(),
    };
    vi.mocked(MagicTokenModel.create).mockResolvedValue(mockToken as any);
    vi.mocked(createNotificationSafe).mockResolvedValue({} as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue({} as any);

    await AuthService.requestMagicLink('user@example.com', 'http://localhost:3000', {
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '1234567890'
    });

    expect(isRedisConnected).toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalledWith(
      'mad:otp:cooldown:user@example.com',
      '1',
      'EX',
      60,
      'NX'
    );
    expect(MagicTokenModel.deleteOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      otp: expect.any(String),
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '1234567890',
      expiresAt: expect.any(Date),
    });
    expect(magicLinkHtml).toHaveBeenCalledWith({
      email: 'user@example.com',
      otpCode: expect.stringMatching(/^\d{6}$/),
    });
    expect(createNotificationSafe).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'user@example.com',
      type: NotificationType.OTP,
    }));
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      expect.any(String),
      'email-dispatch',
      expect.objectContaining({
        to: 'user@example.com',
        html: '<html>magic link</html>',
      }),
      expect.any(String)
    );
  });

  it('OTP-002: Redis cooldown active (AppError thrown with OTP_COOLDOWN_ACTIVE and retryAfter)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(mockRedis.set).mockResolvedValue(null); // NX lock failed
    vi.mocked(mockRedis.ttl).mockResolvedValue(45);

    await expect(
      AuthService.requestMagicLink('user@example.com', 'http://localhost:3000')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 429,
        code: 'OTP_COOLDOWN_ACTIVE',
        retryAfter: 45,
      })
    );

    expect(mockRedis.set).toHaveBeenCalled();
    expect(mockRedis.ttl).toHaveBeenCalledWith('mad:otp:cooldown:user@example.com');
    expect(MagicTokenModel.create).not.toHaveBeenCalled();
  });

  it('OTP-003: Queue failure cleanup (Redis lock removed, original error propagated)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(mockRedis.set).mockResolvedValue('OK');
    vi.mocked(magicLinkHtml).mockResolvedValue('<html>magic link</html>');

    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      createdAt: new Date(),
    };
    vi.mocked(MagicTokenModel.create).mockResolvedValue(mockToken as any);
    vi.mocked(createNotificationSafe).mockResolvedValue({} as any);
    vi.mocked(QueueService.enqueue).mockRejectedValue(new Error('Queue connection lost'));

    await expect(
      AuthService.requestMagicLink('user@example.com', 'http://localhost:3000')
    ).rejects.toThrow('Queue connection lost');

    expect(mockRedis.del).toHaveBeenCalledWith('mad:otp:cooldown:user@example.com');
  });

  it('OTP-004: Redis offline + existing token under cooldown (Mongo fallback returns OTP_COOLDOWN_ACTIVE)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(false);

    const existingToken = {
      email: 'user@example.com',
      createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
    };
    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(existingToken as any);

    await expect(
      AuthService.requestMagicLink('user@example.com', 'http://localhost:3000')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 429,
        code: 'OTP_COOLDOWN_ACTIVE',
        retryAfter: expect.any(Number),
      })
    );

    expect(MagicTokenModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.create).not.toHaveBeenCalled();
  });

  it('OTP-005: Redis offline + expired cooldown (old token removed, new token issued)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(false);

    const existingToken = {
      email: 'user@example.com',
      createdAt: new Date(Date.now() - 70 * 1000), // 70 seconds ago (expired cooldown)
    };
    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(existingToken as any);

    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      createdAt: new Date(),
    };
    vi.mocked(MagicTokenModel.create).mockResolvedValue(mockToken as any);
    vi.mocked(createNotificationSafe).mockResolvedValue({} as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue({} as any);

    await AuthService.requestMagicLink('user@example.com', 'http://localhost:3000');

    expect(MagicTokenModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.deleteOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.create).toHaveBeenCalled();
  });

  it('OTP-006: Redis offline + no token (request succeeds)', async () => {
    vi.mocked(isRedisConnected).mockReturnValue(false);
    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(null);

    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      createdAt: new Date(),
    };
    vi.mocked(MagicTokenModel.create).mockResolvedValue(mockToken as any);
    vi.mocked(createNotificationSafe).mockResolvedValue({} as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue({} as any);

    await AuthService.requestMagicLink('user@example.com', 'http://localhost:3000');

    expect(MagicTokenModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.deleteOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(MagicTokenModel.create).toHaveBeenCalled();
  });
});

describe('AuthService - verifyMagicLinkOrOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OTP-007: Existing user login (token deleted, lastLogin updated, JWT returned)', async () => {
    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      otp: 'hashed_otp',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins in future
    };
    const mockUser = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      isActive: true,
      lastLogin: null,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(mockToken as any);
    vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

    const result = await AuthService.verifyMagicLinkOrOTP('123456', 'user@example.com');

    expect(MagicTokenModel.findOne).toHaveBeenCalledWith({
      email: 'user@example.com',
      otp: expect.any(String),
    });
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(mockUser.save).toHaveBeenCalled();
    expect(mockUser.lastLogin).toBeInstanceOf(Date);
    expect(MagicTokenModel.deleteOne).toHaveBeenCalledWith({ _id: mockToken._id });

    expect(result.user).toBe(mockUser);
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(result.refreshToken).toHaveLength(64);
  });

  it('OTP-008: Auto-registration (user created, user activated, JWT returned)', async () => {
    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'newuser@example.com',
      otp: 'hashed_otp',
      firstName: 'Alice',
      lastName: 'Smith',
      mobileNumber: '9999999999',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    const mockUser = {
      _id: new Types.ObjectId(),
      email: 'newuser@example.com',
      isActive: true,
      lastLogin: null,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(mockToken as any);
    vi.mocked(UserModel.findOne).mockResolvedValue(null); // User does not exist
    vi.mocked(UserModel.create).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

    const result = await AuthService.verifyMagicLinkOrOTP('123456', 'newuser@example.com');

    expect(UserModel.create).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      name: 'Alice Smith',
      mobileNumber: '9999999999',
      isActive: true,
    });
    expect(result.user).toBe(mockUser);
    expect(result.accessToken).toBe('mock-access-token');
  });

  it('OTP-009: Expired OTP rejection (AppError thrown)', async () => {
    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      otp: 'hashed_otp',
      expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
    };

    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(mockToken as any);

    await expect(
      AuthService.verifyMagicLinkOrOTP('123456', 'user@example.com')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid or expired login passcode',
      })
    );

    expect(MagicTokenModel.deleteOne).not.toHaveBeenCalled();
    expect(UserModel.findOne).not.toHaveBeenCalled();
  });

  it('OTP-010: Invalid OTP rejection (AppError thrown)', async () => {
    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(null);

    await expect(
      AuthService.verifyMagicLinkOrOTP('123456', 'user@example.com')
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid or expired login passcode',
      })
    );

    expect(MagicTokenModel.deleteOne).not.toHaveBeenCalled();
  });

  it('OTP-011: One-time use enforcement (verification deletes token)', async () => {
    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      otp: 'hashed_otp',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    const mockUser = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      isActive: true,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(mockToken as any);
    vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

    await AuthService.verifyMagicLinkOrOTP('123456', 'user@example.com');

    expect(MagicTokenModel.deleteOne).toHaveBeenCalledWith({ _id: mockToken._id });
  });

  it('OTP-012: Guest booking claim (Booking.updateMany called with correct filter)', async () => {
    const mockToken = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      otp: 'hashed_otp',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    const mockUser = {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      isActive: true,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(MagicTokenModel.findOne).mockResolvedValue(mockToken as any);
    vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 2 } as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

    await AuthService.verifyMagicLinkOrOTP('123456', 'user@example.com');

    expect(Booking.updateMany).toHaveBeenCalledWith(
      {
        guestEmail: 'user@example.com',
        $or: [{ userId: { $exists: false } }, { userId: null }],
      },
      {
        $set: { userId: expect.any(Object) },
      }
    );
  });

  it('OTP-013: Profile hydration (Empty profile populated from booking)', async () => {
    const userId = new Types.ObjectId();
    const mockUser = {
      _id: userId,
      email: 'user@example.com',
      isActive: true,
      firstName: '',
      lastName: '  ',
      mobileNumber: undefined,
      name: '',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockBooking = {
      firstName: 'Jane',
      lastName: 'Smith',
      guestPhone: '9876543210',
    };

    vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockBooking),
    } as any);

    await AuthService.hydrateUserProfile(userId.toString(), 'user@example.com');

    expect(UserModel.findById).toHaveBeenCalledWith(userId.toString());
    expect(Booking.findOne).toHaveBeenCalledWith(expect.objectContaining({
      guestEmail: 'user@example.com',
    }));
    expect(mockUser.firstName).toBe('Jane');
    expect(mockUser.lastName).toBe('Smith');
    expect(mockUser.mobileNumber).toBe('9876543210');
    expect(mockUser.name).toBe('Jane Smith');
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('OTP-014: Profile preservation (Existing profile values are NOT overwritten)', async () => {
    const userId = new Types.ObjectId();
    const mockUser = {
      _id: userId,
      email: 'user@example.com',
      isActive: true,
      firstName: 'John',
      lastName: 'Doe',
      mobileNumber: '1234567890',
      name: 'John Doe',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockBooking = {
      firstName: 'Jane',
      lastName: 'Smith',
      guestPhone: '9876543210',
    };

    vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);
    vi.mocked(Booking.findOne).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockBooking),
    } as any);

    await AuthService.hydrateUserProfile(userId.toString(), 'user@example.com');

    expect(UserModel.findById).toHaveBeenCalledWith(userId.toString());
    expect(Booking.findOne).not.toHaveBeenCalled();
    expect(mockUser.firstName).toBe('John');
    expect(mockUser.lastName).toBe('Doe');
    expect(mockUser.mobileNumber).toBe('1234567890');
    expect(mockUser.name).toBe('John Doe');
  });

  describe('AuthService - verifyGoogleToken', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('GOOGLE-001: New User registration with Google (creates user and maps given_name/family_name)', async () => {
      vi.mocked(UserModel.findOne).mockResolvedValue(null);

      const mockUser = {
        _id: new Types.ObjectId(),
        googleId: 'google-sub-123',
        email: 'newuser@gmail.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(UserModel.create).mockResolvedValue(mockUser as any);
      vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Booking.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

      const result = await AuthService.verifyGoogleToken('mock_newuser@gmail.com');

      expect(UserModel.create).toHaveBeenCalledWith({
        email: 'newuser@gmail.com',
        googleId: 'mock_google_id_newuser@gmail.com',
        name: 'Mock User',
        firstName: 'Mock',
        lastName: 'User',
        picture: 'https://lh3.googleusercontent.com/a/mock',
        isActive: true,
      });
      expect(result.user).toBe(mockUser);
    });

    it('GOOGLE-002: Scenario A/B - Existing user with custom name details (does not overwrite stored names)', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        googleId: 'google-sub-123',
        email: 'existinguser@gmail.com',
        firstName: 'Kalyan',
        lastName: 'MV',
        mobileNumber: '+919876543210',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Booking.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

      await AuthService.verifyGoogleToken('mock_existinguser@gmail.com');

      expect(mockUser.firstName).toBe('Kalyan');
      expect(mockUser.lastName).toBe('MV');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('GOOGLE-003: Scenario C - Existing user with partial details (populates missing lastName only)', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        googleId: 'google-sub-123',
        email: 'partialuser@gmail.com',
        firstName: 'Kalyan',
        lastName: '',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Booking.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);

      await AuthService.verifyGoogleToken('mock_partialuser@gmail.com');

      expect(mockUser.firstName).toBe('Kalyan');
      expect(mockUser.lastName).toBe('User');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('GOOGLE-004: Cross-Provider Linking (existing OTP account links Google ID on Google login without duplicate user)', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'otpuser@gmail.com',
        firstName: 'Kalyan',
        lastName: 'MV',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(UserModel.findOne)
        .mockResolvedValueOnce(null) // for findOne({ googleId })
        .mockResolvedValueOnce(mockUser as any); // for findOne({ email })

      vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Booking.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      } as any);
      vi.mocked(RefreshTokenModel.create).mockResolvedValue({ token: 'mock-refresh-token' } as any);
      vi.mocked(UserModel.create).mockResolvedValue({} as any);

      const result = await AuthService.verifyGoogleToken('mock_otpuser@gmail.com');

      expect(UserModel.findOne).toHaveBeenNthCalledWith(1, { googleId: 'mock_google_id_otpuser@gmail.com' });
      expect(UserModel.findOne).toHaveBeenNthCalledWith(2, { email: 'otpuser@gmail.com' });

      expect(result.user._id).toBe('507f1f77bcf86cd799439011');
      expect(result.user.googleId).toBe('mock_google_id_otpuser@gmail.com'); // Linked successfully
      expect(UserModel.create).not.toHaveBeenCalled(); // Duplication prevented
    });
  });
});

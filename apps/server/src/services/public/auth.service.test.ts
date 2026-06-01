import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { RefreshTokenModel } from '../../models/refresh-token.schema';
import { UserModel } from '../../models/user.schema';
import { AppError } from '../../middleware/error.middleware';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    GOOGLE_CLIENT_ID: 'test_google_client_id',
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

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    updateMany: vi.fn(() => Promise.resolve({ modifiedCount: 0 })),
  },
}));

const mockVerifyIdToken = vi.fn().mockResolvedValue({
  getPayload: () => ({
    email: 'google-user@example.com',
    name: 'Google User',
    sub: 'google-id-12345',
    picture: 'https://lh3.googleusercontent.com/a/photo',
    given_name: 'Google',
    family_name: 'User',
    email_verified: true,
  }),
});

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken() {
      return mockVerifyIdToken();
    }
  },
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
    await expect(AuthService.refreshSession('')).rejects.toThrow('Refresh token is required');
  });

  it('should throw error if refresh token is not found in database', async () => {
    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(null);
    await expect(AuthService.refreshSession('unknown-token')).rejects.toThrow('Invalid session');
  });

  it('should perform normal refresh rotation successfully', async () => {
    const expiredAt = new Date(Date.now() + 600000); // 10 minutes from now
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'valid-token-abc',
      isRevoked: false,
      expiresAt: expiredAt,
      userId: 'user-id-999',
      save: vi.fn(),
    };

    const mockSuccessorRecord = {
      token: 'new-rotated-token-xyz',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);
    vi.mocked(RefreshTokenModel.findOneAndUpdate).mockResolvedValue(mockTokenRecord as any);
    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);
    vi.mocked(RefreshTokenModel.create).mockResolvedValue(mockSuccessorRecord as any);

    const result = await AuthService.refreshSession('valid-token-abc');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('new-rotated-token-xyz');
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
      isRevoked: false,
      expiresAt: new Date(Date.now() - 10000), // expired 10 seconds ago
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('expired-token-123')).rejects.toThrow('Session has expired');
  });

  it('should handle legitimate concurrent refresh requests within grace period', async () => {
    // Current request supplies a token that has been revoked 1 second ago
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'recently-revoked-token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'valid-successor-token',
      updatedAt: new Date(Date.now() - 1000), // rotated 1 second ago (well within 10s grace period)
      userId: 'user-id-999',
    };

    const mockSuccessorRecord = {
      token: 'valid-successor-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne)
      .mockResolvedValueOnce(mockTokenRecord as any) // first find the revoked token
      .mockResolvedValueOnce(mockSuccessorRecord as any); // then find the successor

    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);

    const result = await AuthService.refreshSession('recently-revoked-token');

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
      isRevoked: false,
      expiresAt: new Date(Date.now() + 600000),
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findById).mockResolvedValue(reFetchedRecord as any);
    vi.mocked(RefreshTokenModel.findOne).mockResolvedValueOnce(mockSuccessorRecord as any);
    vi.mocked(UserModel.findById).mockResolvedValue({ _id: 'user-id-999', email: 'user@example.com', isActive: true } as any);

    const result = await AuthService.refreshSession('active-token-abc');

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('winner-successor-token');
  });

  it('should revoke all user refresh tokens on actual replay attack (outside grace period)', async () => {
    // Current request supplies a token that has been revoked 20 seconds ago
    const mockTokenRecord = {
      _id: 'token-id-123',
      token: 'stale-revoked-token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 600000),
      replacedByToken: 'successor-token',
      updatedAt: new Date(Date.now() - 20000), // rotated 20 seconds ago (outside 10s grace period)
      userId: 'user-id-999',
    };

    vi.mocked(RefreshTokenModel.findOne).mockResolvedValue(mockTokenRecord as any);

    await expect(AuthService.refreshSession('stale-revoked-token')).rejects.toThrow('Session compromised');

    expect(RefreshTokenModel.updateMany).toHaveBeenCalledWith({ userId: 'user-id-999' }, { isRevoked: true });
  });
});

describe('AuthService - verifyGoogleToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should match user by googleId directly and log in successfully', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'google-user@example.com',
      googleId: 'google-id-12345',
      isActive: true,
      save: vi.fn(),
    };

    vi.mocked(UserModel.findOne).mockResolvedValueOnce(mockUser as any); // Match by googleId first

    const result = await AuthService.verifyGoogleToken('mock-google-token');

    expect(result).toBeDefined();
    expect(result.user._id).toBe('507f1f77bcf86cd799439011');
    expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: 'google-id-12345' });
    expect(UserModel.findOne).toHaveBeenCalledTimes(1); // Should not fall back to email query
  });

  it('should match user by googleId and update email if it changed with no collision', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'old-email@example.com', // changed from google-user@example.com
      googleId: 'google-id-12345',
      isActive: true,
      save: vi.fn(),
    };

    vi.mocked(UserModel.findOne)
      .mockResolvedValueOnce(mockUser as any) // Match by googleId first
      .mockResolvedValueOnce(null); // No collision on new email query

    const result = await AuthService.verifyGoogleToken('mock-google-token');

    expect(result).toBeDefined();
    expect(mockUser.email).toBe('google-user@example.com'); // Assert updated email
    expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: 'google-id-12345' });
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'google-user@example.com' });
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('should match user by googleId but skip email update if there is a collision with another user', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'old-email@example.com',
      googleId: 'google-id-12345',
      isActive: true,
      save: vi.fn(),
    };

    const collisionUser = {
      _id: '507f1f77bcf86cd799439012',
      email: 'google-user@example.com',
    };

    vi.mocked(UserModel.findOne)
      .mockResolvedValueOnce(mockUser as any) // Match by googleId first
      .mockResolvedValueOnce(collisionUser as any); // Email occupied by another account

    const result = await AuthService.verifyGoogleToken('mock-google-token');

    expect(result).toBeDefined();
    expect(mockUser.email).toBe('old-email@example.com'); // Bypassed update, kept old email
    expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: 'google-id-12345' });
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'google-user@example.com' });
  });

  it('should match user by email and link googleId securely if not matched by googleId', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439013',
      email: 'google-user@example.com',
      isActive: true,
      save: vi.fn(),
    };

    vi.mocked(UserModel.findOne)
      .mockResolvedValueOnce(null) // googleId lookup fails
      .mockResolvedValueOnce(mockUser as any); // email lookup succeeds

    const result = await AuthService.verifyGoogleToken('mock-google-token');

    expect(result).toBeDefined();
    expect(result.user.googleId).toBe('google-id-12345'); // Securely linked
    expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: 'google-id-12345' });
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'google-user@example.com' });
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('should register a completely new user if neither googleId nor email matches', async () => {
    const mockCreatedUser = {
      _id: '507f1f77bcf86cd799439014',
      email: 'google-user@example.com',
      googleId: 'google-id-12345',
      isActive: true,
      save: vi.fn(),
    };

    vi.mocked(UserModel.findOne)
      .mockResolvedValueOnce(null) // googleId fails
      .mockResolvedValueOnce(null); // email fails

    vi.mocked(UserModel.create).mockResolvedValueOnce(mockCreatedUser as any);

    const result = await AuthService.verifyGoogleToken('mock-google-token');

    expect(result).toBeDefined();
    expect(result.user._id).toBe('507f1f77bcf86cd799439014');
    expect(UserModel.create).toHaveBeenCalledWith({
      email: 'google-user@example.com',
      googleId: 'google-id-12345',
      name: 'Google User',
      firstName: 'Google',
      lastName: 'User',
      picture: 'https://lh3.googleusercontent.com/a/photo',
      isActive: true,
    });
  });

  it('should throw error if matched account has been deactivated', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439015',
      email: 'google-user@example.com',
      googleId: 'google-id-12345',
      isActive: false,
    };

    vi.mocked(UserModel.findOne).mockResolvedValueOnce(mockUser as any);

    await expect(AuthService.verifyGoogleToken('mock-google-token')).rejects.toThrow('Your account has been deactivated');
  });
});

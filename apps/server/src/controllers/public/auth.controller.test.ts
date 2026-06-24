import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { UserModel } from '../../models/user.schema';
import { AuthService } from '../../services/public/auth.service';
import { AppError } from '../../middleware/error.middleware';

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findById: vi.fn(),
  },
}));

vi.mock('../../services/public/auth.service', () => ({
  AuthService: {
    verifyMagicLinkOrOTP: vi.fn(),
    verifyGoogleToken: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    ALLOWED_ORIGINS: 'http://localhost:3000',
  })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRequest = (payload: { user?: any; body?: any } = {}) => {
  return {
    user: payload.user || { sub: 'user-123' },
    body: payload.body || {},
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

describe('Public Auth Controller - Profile Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMe', () => {
    it('returns enhanced and backward-compatible fields for an active user', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'buyer@gmail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+919876543210',
        picture: 'https://lh3.googleusercontent.com/a/photo',
        isActive: true,
      };

      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const req = mockRequest();
      const res = mockResponse();

      await AuthController.getMe(req, res);

      expect(UserModel.findById).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user-123',
          email: 'buyer@gmail.com',
          name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          mobileNumber: '+919876543210',
          phone: '+919876543210', // Response alias only
          picture: 'https://lh3.googleusercontent.com/a/photo',
          isGuest: false,
          onboardingRequired: false,
        },
      });
    });

    it('falls back to empty string for missing profile fields in getMe response', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'buyer@gmail.com',
        isActive: true,
        // No firstName, lastName, or mobileNumber stored
      };

      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const req = mockRequest();
      const res = mockResponse();

      await AuthController.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user-123',
          email: 'buyer@gmail.com',
          name: undefined,
          firstName: '',
          lastName: '',
          mobileNumber: '',
          phone: '',
          picture: undefined,
          isGuest: false,
          onboardingRequired: true,
        },
      });
    });

    it('throws unauthorized error if user is not found or deactivated', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      const req = mockRequest();
      const res = mockResponse();

      await expect(AuthController.getMe(req, res)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          message: 'User is deactivated or does not exist',
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('safely updates allowed profile fields, ignores name inputs, recalculates name programmatically, and persists to DB', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'buyer@gmail.com',
        name: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        mobileNumber: '+918888888888',
        isActive: true,
        save: vi.fn(),
      };

      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const req = mockRequest({
        body: {
          firstName: '  AdaNew  ',
          lastName: '  LovelaceNew  ',
          mobileNumber: '  +14155552671  ',
          // Immutable fields sent by client
          email: 'attacker@gmail.com',
          googleId: 'google-attacker-id',
          name: 'Direct Edit Attacker',
        },
      });
      const res = mockResponse();

      await AuthController.updateProfile(req, res);

      // Verify DB entity state
      expect(mockUser.firstName).toBe('AdaNew');
      expect(mockUser.lastName).toBe('LovelaceNew');
      expect(mockUser.mobileNumber).toBe('+14155552671');
      expect(mockUser.email).toBe('buyer@gmail.com'); // Unmodified
      expect(mockUser.name).toBe('AdaNew LovelaceNew'); // Programmatically derived
      expect(mockUser.save).toHaveBeenCalled();

      // Verify response structure matches enriched schema
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user-123',
          email: 'buyer@gmail.com',
          name: 'AdaNew LovelaceNew',
          firstName: 'AdaNew',
          lastName: 'LovelaceNew',
          mobileNumber: '+14155552671',
          phone: '+14155552671', // Response alias only
          picture: undefined,
          isGuest: false,
        },
      });
    });

    it('allows clearing the mobileNumber by sending empty string', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'buyer@gmail.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        mobileNumber: '+918888888888',
        isActive: true,
        save: vi.fn(),
      };

      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const req = mockRequest({
        body: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          mobileNumber: '', // Clear number
        },
      });
      const res = mockResponse();

      await AuthController.updateProfile(req, res);

      expect(mockUser.mobileNumber).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws unauthorized error if user is deactivated or missing', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      const req = mockRequest({
        body: {
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
      });
      const res = mockResponse();

      await expect(AuthController.updateProfile(req, res)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          message: 'User is deactivated or does not exist',
        })
      );
    });
  });

  describe('verifyMagicLinkOrOTP and loginWithGoogle - onboardingRequired Cases', () => {
    it('returns onboardingRequired: true when firstName is empty (Case 1)', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'buyer@gmail.com',
          firstName: '',
          lastName: 'Doe',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue(mockResult as any);

      const req = mockRequest({ body: { otp: '123456', email: 'buyer@gmail.com' } });
      const res = mockResponse();

      await AuthController.verifyMagicLinkOrOTP(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            onboardingRequired: true,
          }),
        })
      );
    });

    it('returns onboardingRequired: true when firstName is whitespace-only (Case 2)', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'buyer@gmail.com',
          firstName: '   ',
          lastName: 'Doe',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue(mockResult as any);

      const req = mockRequest({ body: { otp: '123456', email: 'buyer@gmail.com' } });
      const res = mockResponse();

      await AuthController.verifyMagicLinkOrOTP(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            onboardingRequired: true,
          }),
        })
      );
    });

    it('returns onboardingRequired: true when firstName is null/undefined (Case 3)', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'buyer@gmail.com',
          firstName: null,
          lastName: 'Doe',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue(mockResult as any);

      const req = mockRequest({ body: { otp: '123456', email: 'buyer@gmail.com' } });
      const res = mockResponse();

      await AuthController.verifyMagicLinkOrOTP(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            onboardingRequired: true,
          }),
        })
      );
    });

    it('returns onboardingRequired: false when firstName and lastName are present (Case 4)', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'buyer@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue(mockResult as any);

      const req = mockRequest({ body: { otp: '123456', email: 'buyer@gmail.com' } });
      const res = mockResponse();

      await AuthController.verifyMagicLinkOrOTP(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            onboardingRequired: false,
          }),
        })
      );
    });

    it('returns onboardingRequired: false for Google users when profile is complete', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'google-user@gmail.com',
          firstName: 'Google',
          lastName: 'User',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyGoogleToken).mockResolvedValue(mockResult as any);

      const req = mockRequest({ body: { idToken: 'google-token-123' } });
      const res = mockResponse();

      await AuthController.loginWithGoogle(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            onboardingRequired: false,
          }),
        })
      );
    });

    it('returns enriched user details (firstName, lastName, mobileNumber) in response payloads', async () => {
      const mockResult = {
        user: {
          _id: 'user-123',
          email: 'test@example.com',
          name: 'Jane Smith',
          picture: 'https://lh3.googleusercontent.com/a/photo',
          firstName: 'Jane',
          lastName: 'Smith',
          mobileNumber: '+919876543210',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      vi.mocked(AuthService.verifyGoogleToken).mockResolvedValue(mockResult as any);
      vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue(mockResult as any);

      // Verify Google login controller returns all details
      const googleReq = mockRequest({ body: { idToken: 'google-token-123' } });
      const googleRes = mockResponse();
      await AuthController.loginWithGoogle(googleReq, googleRes);

      expect(googleRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Jane Smith',
            picture: 'https://lh3.googleusercontent.com/a/photo',
            firstName: 'Jane',
            lastName: 'Smith',
            mobileNumber: '+919876543210',
          },
          token: 'mock-access-token',
          onboardingRequired: false,
        },
      });

      // Verify OTP verification controller returns all details
      const otpReq = mockRequest({ body: { otp: '123456', email: 'test@example.com' } });
      const otpRes = mockResponse();
      await AuthController.verifyMagicLinkOrOTP(otpReq, otpRes);

      expect(otpRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Jane Smith',
            picture: 'https://lh3.googleusercontent.com/a/photo',
            firstName: 'Jane',
            lastName: 'Smith',
            mobileNumber: '+919876543210',
          },
          token: 'mock-access-token',
          onboardingRequired: false,
        },
      });
    });
  });
});


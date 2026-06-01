import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/public/auth.service';
import { UserModel } from '../../models/user.schema';
import { Booking } from '../../models/booking.schema';
import { PublicBookingService } from '../../services/public/booking.service';
import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export class AuthController {
  /**
   * Checks if an email exists in the system.
   */
  static async checkEmail(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) {
      throw AppError.badRequest('Email is required');
    }

    const exists = await AuthService.checkEmailExists(email);

    res.status(200).json({
      success: true,
      data: { exists },
    });
  }

  /**
   * Triggers the magic link & OTP generation flow.
   */
  static async requestMagicLink(req: Request, res: Response): Promise<void> {
    const { email, firstName, lastName, mobileNumber } = req.body;
    logger.info({ email }, "Magic link requested");
    // Derive client origin, fallback to configured ALLOWED_ORIGINS if unavailable
    const env = getEnv();
    const primaryOrigin = env.ALLOWED_ORIGINS.split(',')[0].trim();
    const origin = req.headers.origin || req.headers.referer || primaryOrigin;

    await AuthService.requestMagicLink(email, origin, { firstName, lastName, mobileNumber });

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  }

  /**
   * Handles POST /auth/verify for verifying OTP codes.
   */
  static async verifyMagicLinkOrOTP(req: Request, res: Response): Promise<void> {
    const { otp, email } = req.body;

    if (!otp || !email) {
      throw AppError.badRequest('Email and passcode are required');
    }

    const result = await AuthService.verifyMagicLinkOrOTP(otp, email);

    // Set secure HTTP-only refresh token cookie (SameSite None for cross-site in production)
    const isProd = getEnv().NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax', // Allows cross-domain cookies between Vercel and Render in production
      domain: isProd ? '.esparex.in' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user._id,
          email: result.user.email,
          name: result.user.name,
          picture: result.user.picture,
        },
        token: result.accessToken,
      },
    });
  }

  /**
   * Handles Google OAuth logins.
   */
  static async loginWithGoogle(req: Request, res: Response): Promise<void> {
    const { idToken } = req.body;
    if (!idToken) {
      throw AppError.badRequest('Google ID Token is required');
    }

    const result = await AuthService.verifyGoogleToken(idToken);

    // Set secure HTTP-only refresh token cookie (SameSite None for cross-site in production)
    const isProd = getEnv().NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: isProd ? '.esparex.in' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user._id,
          email: result.user.email,
          name: result.user.name,
          picture: result.user.picture,
        },
        token: result.accessToken,
      },
    });
  }

  /**
   * Handles transparent silent session token refreshes.
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const result = await AuthService.refreshSession(refreshToken);

    // Set secure rotated HTTP-only refresh token cookie (SameSite None for cross-site in production)
    const isProd = getEnv().NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: isProd ? '.esparex.in' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
    });

    res.status(200).json({
      success: true,
      data: {
        token: result.accessToken,
      },
    });
  }

  /**
   * Handles logouts by revoking the refresh token and clearing cookie credentials.
   */
  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await AuthService.revokeSession(refreshToken);
    }

    const isProd = getEnv().NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: isProd ? '.esparex.in' : undefined,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * Fetches the current logged in user details.
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobileNumber: user.mobileNumber ?? '',
        phone: user.mobileNumber ?? '', // Alias response-only
        picture: user.picture,
        isGuest: false,
      },
    });
  }

  /**
   * Updates the authenticated user's profile details safely.
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.sub;
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User is deactivated or does not exist');
    }

    // Adjustment 2: Immutable Field Handling. Only process allowed fields.
    const { firstName, lastName, mobileNumber } = req.body;

    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.mobileNumber = (mobileNumber && mobileNumber.trim() !== '') ? mobileNumber.trim() : undefined;

    // Recalculate dynamic concatenated name from profile fields programmatically
    user.name = `${user.firstName} ${user.lastName}`.trim();

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobileNumber: user.mobileNumber ?? '',
        phone: user.mobileNumber ?? '', // Alias response-only
        picture: user.picture,
        isGuest: false,
      },
    });
  }

  /**
   * Fetches historical bookings associated with the logged-in user (Deprecated in favor of /bookings/me).
   */
  static async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw AppError.unauthorized('Authentication required');
      }

      const { bookings } = await PublicBookingService.getMyBookings(userId);

      // Add standard deprecation headers
      res.setHeader('Deprecation', 'true');
      res.setHeader('Warning', '199 - "This endpoint is deprecated. Use /bookings/me instead."');

      res.status(200).json({
        success: true,
        data: bookings,
      });
    } catch (err) {
      next(err);
    }
  }
}

// Utility import helper for typescript Typings compatibility
import { Types } from 'mongoose';

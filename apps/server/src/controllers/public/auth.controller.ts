import { Request, Response } from 'express';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { AuthService } from '../../services/public/auth.service';
import { clearXsrfCookie, setXsrfCookie } from '../../utils/cookie';
import { logger } from '../../utils/logger';
import { requiresOnboarding } from '../../utils/user';
import { UserProfileController } from './user-profile.controller';

function setAuthCookies(res: Response, refreshToken: string, csrfToken: string): void {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  setXsrfCookie(res, csrfToken);
}

function formatAuthUser(user: any) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    mobileNumber: user.mobileNumber ?? '',
    isEmailVerified: !!user.isEmailVerified,
  };
}

export class AuthController {
  static async checkEmail(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) {
      throw AppError.badRequest('Email is required');
    }
    const exists = await AuthService.checkEmailExists(email);
    res.status(200).json({ success: true, data: { exists } });
  }

  static async requestMagicLink(req: Request, res: Response): Promise<void> {
    const { email, firstName, lastName, mobileNumber } = req.body;
    logger.info({ email }, 'Magic link requested');
    const env = getEnv();
    const primaryOrigin = env.ALLOWED_ORIGINS.split(',')[0].trim();
    const origin = req.headers.origin || req.headers.referer || primaryOrigin;

    await AuthService.requestMagicLink(email, origin, { firstName, lastName, mobileNumber });
    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  }

  static async verifyMagicLinkOrOTP(req: Request, res: Response): Promise<void> {
    const { otp, email } = req.body;
    if (!otp || !email) {
      throw AppError.badRequest('Email and passcode are required');
    }

    const result = await AuthService.verifyMagicLinkOrOTP(otp, email);
    setAuthCookies(res, result.refreshToken, result.csrfToken);

    res.status(200).json({
      success: true,
      data: {
        user: formatAuthUser(result.user),
        token: result.accessToken,
        onboardingRequired: requiresOnboarding(result.user),
      },
    });
  }

  static async loginWithGoogle(req: Request, res: Response): Promise<void> {
    const { idToken } = req.body;
    if (!idToken) {
      throw AppError.badRequest('Google ID Token is required');
    }

    const result = await AuthService.verifyGoogleToken(idToken);
    setAuthCookies(res, result.refreshToken, result.csrfToken);

    res.status(200).json({
      success: true,
      data: {
        user: formatAuthUser(result.user),
        token: result.accessToken,
        onboardingRequired: requiresOnboarding(result.user),
      },
    });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const providedCsrfToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
    const result = await AuthService.refreshSession(refreshToken, providedCsrfToken as string);
    setAuthCookies(res, result.refreshToken, result.csrfToken);

    res.status(200).json({ success: true, data: { token: result.accessToken } });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await AuthService.revokeSession(refreshToken);
    }

    const env = getEnv();
    const isProd = env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: env.COOKIE_DOMAIN || undefined,
    });
    clearXsrfCookie(res);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  // Profile & Media Handlers
  static getMe = UserProfileController.getMe;
  static updateProfile = UserProfileController.updateProfile;
  static uploadProfilePhoto = UserProfileController.uploadProfilePhoto;
  static deleteProfilePhoto = UserProfileController.deleteProfilePhoto;
  static deleteAccount = UserProfileController.deleteAccount;
}

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { NotificationType } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { getRedis, isRedisConnected } from '../../config/redis';
import { magicLinkHtml } from '../../lib/email';
import { AppError } from '../../middleware/error.middleware';
import { MagicTokenModel } from '../../models/magic-token.schema';
import { UserModel, IUser } from '../../models/user.schema';
import { normalizeEmail } from '../../utils/email';
import { logger } from '../../utils/logger';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { AuthSessionService } from './auth-session.service';
import { AuthHydrationService } from './auth-hydration.service';

export class AuthService {
  /**
   * Checks if an email exists in the database.
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    const user = await UserModel.exists({ email: email.trim().toLowerCase() });
    return !!user;
  }

  /**
   * Generates a Magic Link and OTP fallback, hashes the OTP, saves them, and enqueues the email.
   */
  static async requestMagicLink(
    email: string,
    _origin: string,
    registrationData?: { firstName?: string; lastName?: string; mobileNumber?: string }
  ): Promise<void> {
    if (!email) {
      throw AppError.badRequest('Email is required');
    }

    const normalizedEmail = normalizeEmail(email);
    logger.info({ email: normalizedEmail }, 'OTP passcode requested');

    // Cooldown verification (Redis-first with DB fallback)
    const cooldownKey = `mad:otp:cooldown:${normalizedEmail}`;
    const isRedisActive = isRedisConnected();
    let isLocked = false;
    let retryAfter = 60;

    if (isRedisActive) {
      try {
        const redis = getRedis();
        const lockResult = await redis.set(cooldownKey, '1', 'EX', 60, 'NX');
        isLocked = lockResult !== 'OK';
        if (isLocked) {
          const ttl = await redis.ttl(cooldownKey);
          retryAfter = ttl > 0 ? ttl : 60;
        }
      } catch (err) {
        logger.error(
          { err, email: normalizedEmail },
          'Redis cooldown lock set failed. Falling back to MongoDB.'
        );
      }
    }

    if (!isRedisActive || isLocked) {
      if (!isRedisActive) {
        const existing = await MagicTokenModel.findOne({ email: normalizedEmail });
        if (existing) {
          const elapsed = Math.floor((Date.now() - existing.createdAt.getTime()) / 1000);
          if (elapsed < 60) {
            retryAfter = Math.max(0, 60 - elapsed);
            throw AppError.tooManyRequests(
              'Please wait before requesting another code.',
              'OTP_COOLDOWN_ACTIVE',
              retryAfter
            );
          }
        }
      } else {
        throw AppError.tooManyRequests(
          'Please wait before requesting another code.',
          'OTP_COOLDOWN_ACTIVE',
          retryAfter
        );
      }
    }

    let token;
    try {
      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      await MagicTokenModel.deleteOne({ email: normalizedEmail });

      token = await MagicTokenModel.create({
        email: normalizedEmail,
        otp: otpHash,
        firstName: registrationData?.firstName,
        lastName: registrationData?.lastName,
        mobileNumber: registrationData?.mobileNumber,
        expiresAt,
      });
      logger.info({ email: normalizedEmail, tokenId: token._id }, 'OTP login session upserted');

      const html = await magicLinkHtml({
        email: normalizedEmail,
        otpCode: otp,
      });

      const jobId = `magic-${normalizedEmail}-${token._id.toString()}`;
      logger.info({ email: normalizedEmail, jobId }, 'Email job queued');

      await createNotificationSafe({
        jobId,
        status: 'queued',
        queuedAt: new Date(),
        type: NotificationType.OTP,
        channel: 'email',
        recipient: normalizedEmail,
        subject: 'Sign In to MAD Entertainment',
        isSent: false,
        retryCount: 0,
      });

      await QueueService.enqueue(
        getQueueName('notification-queue'),
        'email-dispatch',
        {
          to: normalizedEmail,
          subject: 'Sign In to MAD Entertainment',
          html,
          notificationType: NotificationType.OTP,
        },
        jobId
      );

      logger.info({ email: normalizedEmail }, 'OTP verification email queued successfully.');
    } catch (err: any) {
      const isDuplicateKey =
        err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');

      if (isRedisActive && !isLocked && !isDuplicateKey) {
        try {
          const redis = getRedis();
          await redis.del(cooldownKey);
          logger.info(
            { email: normalizedEmail },
            'Redis cooldown lock rolled back due to write/enqueue failure.'
          );
        } catch (delErr) {
          logger.error(
            { delErr, email: normalizedEmail },
            'Failed to delete Redis cooldown lock during rollback.'
          );
        }
      }

      if (isDuplicateKey) {
        throw AppError.tooManyRequests(
          'Please wait before requesting another code.',
          'OTP_COOLDOWN_ACTIVE',
          60
        );
      }

      throw err;
    }
  }

  /**
   * Verifies the OTP code, logs the user in, and sets up session.
   */
  static async verifyMagicLinkOrOTP(
    otp: string,
    email: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string; csrfToken: string }> {
    if (!otp || !email) {
      throw AppError.badRequest('Verification code and email are required');
    }

    const normalizedEmail = normalizeEmail(email);
    const cleanOtp = otp.trim().replace(/\s/g, '');
    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const magicRecord = await MagicTokenModel.findOne({
      email: normalizedEmail,
      otp: otpHash,
    });

    if (!magicRecord || magicRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired login passcode');
    }

    const userEmail = magicRecord.email;

    let user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      try {
        user = await UserModel.create({
          email: userEmail,
          firstName: magicRecord.firstName,
          lastName: magicRecord.lastName,
          name:
            magicRecord.firstName || magicRecord.lastName
              ? `${magicRecord.firstName || ''} ${magicRecord.lastName || ''}`.trim()
              : undefined,
          mobileNumber: magicRecord.mobileNumber,
          isActive: true,
        });
        logger.info({ userId: user._id, email: userEmail }, 'New passwordless user registered.');
      } catch (err: any) {
        if (err && err.code === 11000) {
          logger.info(
            { email: userEmail },
            'Concurrent email registration race collision caught, fetching existing user.'
          );
          user = await UserModel.findOne({ email: userEmail });
          if (!user) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    } else {
      if (!user.isActive) {
        throw AppError.forbidden('Your account has been deactivated.');
      }
      let modified = false;
      if (magicRecord.firstName && (!user.firstName || user.firstName.trim() === '')) {
        user.firstName = magicRecord.firstName.trim();
        modified = true;
      }
      if (magicRecord.lastName && (!user.lastName || user.lastName.trim() === '')) {
        user.lastName = magicRecord.lastName.trim();
        modified = true;
      }
      if (magicRecord.mobileNumber && (!user.mobileNumber || user.mobileNumber.trim() === '')) {
        user.mobileNumber = magicRecord.mobileNumber.trim();
        modified = true;
      }
      if (modified && (!user.name || user.name.trim() === '')) {
        user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      if (modified) {
        await user.save();
      }
    }

    user.isEmailVerified = true;
    user.lastLogin = new Date();
    await user.save();

    await MagicTokenModel.deleteOne({ _id: magicRecord._id });

    await AuthHydrationService.linkBookingsToUser(userEmail, user._id.toString());
    await AuthHydrationService.hydrateUserProfile(user._id.toString(), userEmail);

    const { accessToken, refreshToken, csrfToken } = await AuthSessionService.issueTokens(
      user._id.toString(),
      user.email,
      'user'
    );

    return { user, accessToken, refreshToken, csrfToken };
  }

  /**
   * Verifies Google Auth token locally using official google-auth-library verifyIdToken.
   */
  static async verifyGoogleToken(
    idToken: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string; csrfToken: string }> {
    if (!idToken) {
      throw AppError.badRequest('Google ID Token is required');
    }

    const env = getEnv();
    const isDevPlaceholder = env.GOOGLE_CLIENT_ID === 'google_client_id_placeholder';

    let payload;
    if (isDevPlaceholder && idToken.startsWith('mock_')) {
      payload = {
        email: idToken.split('_')[1] || 'mock@example.com',
        name: 'Mock User',
        given_name: 'Mock',
        family_name: 'User',
        sub: 'mock_google_id_' + idToken.split('_')[1],
        picture: 'https://lh3.googleusercontent.com/a/mock',
        email_verified: true,
      };
    } else {
      try {
        const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error('Invalid token payload or missing email field');
        }
        if (!payload.email_verified) {
          throw new Error('Google account email is not verified');
        }
      } catch (err: any) {
        logger.error({ err }, 'Google ID Token verification failed.');
        throw AppError.unauthorized(err.message || 'Failed to verify Google ID Token');
      }
    }

    const { email, name, sub: googleId, picture, given_name, family_name } = payload;
    const userEmail = email.trim().toLowerCase();

    let user = await UserModel.findOne({ googleId });

    if (user) {
      if (!user.isActive) {
        throw AppError.forbidden('Your account has been deactivated.');
      }
      if (user.email !== userEmail) {
        const emailCollision = await UserModel.findOne({ email: userEmail });
        if (emailCollision) {
          logger.warn(
            {
              userId: user._id,
              currentEmail: user.email,
              googleEmail: userEmail,
              collisionUserId: emailCollision._id,
            },
            'Google email update skipped due to collision with another existing account.'
          );
        } else {
          user.email = userEmail;
          logger.info(
            { userId: user._id, oldEmail: user.email, newEmail: userEmail },
            'User email updated to Google verified email.'
          );
        }
      }
    } else {
      user = await UserModel.findOne({ email: userEmail });
      if (user) {
        if (!user.isActive) {
          throw AppError.forbidden('Your account has been deactivated.');
        }
        user.googleId = googleId;
        logger.info(
          { userId: user._id, email: userEmail },
          'Linked Google login to existing email account.'
        );
      } else {
        try {
          user = await UserModel.create({
            email: userEmail,
            googleId,
            name,
            firstName: given_name,
            lastName: family_name,
            picture,
            isActive: true,
          });
          logger.info({ userId: user._id, email: userEmail }, 'New Google OAuth user registered.');
        } catch (err: any) {
          if (err && err.code === 11000) {
            logger.info(
              { email: userEmail, googleId },
              'Concurrent Google registration race collision caught, fetching existing user.'
            );
            user = await UserModel.findOne({ $or: [{ googleId }, { email: userEmail }] });
            if (!user) {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
    }

    let profileModified = false;
    if (!user.picture && picture) {
      user.picture = picture;
      profileModified = true;
    }
    if (!user.name && name) {
      user.name = name;
      profileModified = true;
    }
    if (given_name && (!user.firstName || user.firstName.trim() === '')) {
      user.firstName = given_name;
      profileModified = true;
    }
    if (family_name && (!user.lastName || user.lastName.trim() === '')) {
      user.lastName = family_name;
      profileModified = true;
    }
    if (profileModified) {
      await user.save();
    }

    user.isEmailVerified = true;
    user.lastLogin = new Date();
    await user.save();

    await AuthHydrationService.linkBookingsToUser(userEmail, user._id.toString());
    await AuthHydrationService.hydrateUserProfile(user._id.toString(), userEmail);

    const { accessToken, refreshToken, csrfToken } = await AuthSessionService.issueTokens(
      user._id.toString(),
      user.email,
      'user'
    );

    return { user, accessToken, refreshToken, csrfToken };
  }

  /**
   * Refreshes JWT session implementing secure Refresh Token Rotation (RTR).
   */
  static async refreshSession(
    refreshTokenString: string,
    providedCsrfToken: string
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    return AuthSessionService.refreshSession(refreshTokenString, providedCsrfToken);
  }

  /**
   * Revokes a session upon logout.
   */
  static async revokeSession(refreshTokenString: string): Promise<void> {
    return AuthSessionService.revokeSession(refreshTokenString);
  }

  /**
   * Hydrates user profile.
   */
  static async hydrateUserProfile(userId: string, email: string): Promise<void> {
    return AuthHydrationService.hydrateUserProfile(userId, email);
  }
}

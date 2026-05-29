import crypto from 'crypto';
import { Types } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { AppError } from '../../middleware/error.middleware';
import { UserModel, IUser } from '../../models/user.schema';
import { MagicTokenModel } from '../../models/magic-token.schema';
import { RefreshTokenModel } from '../../models/refresh-token.schema';
import { Booking } from '../../models/booking.schema';
import { QueueService } from '../queue.service';
import { magicLinkHtml } from '../../lib/email';
import { NotificationType } from '@mad/shared';
import { signUserToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';

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
    origin: string,
    registrationData?: { firstName?: string; lastName?: string; mobileNumber?: string }
  ): Promise<void> {
    if (!email) {
      throw AppError.badRequest('Email is required');
    }

    const trimmedEmail = email.trim().toLowerCase();
    logger.info({ email: trimmedEmail }, "Magic link requested");

    // 1. Generate unique 6-digit OTP and secure random token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    // 2. Hash the OTP for secure database storage
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // 3. Save MagicToken (upsert for the email to prevent spamming records)
    await MagicTokenModel.findOneAndDelete({ email: trimmedEmail });
    await MagicTokenModel.create({
      email: trimmedEmail,
      token,
      otp: otpHash, // Plaintext OTP is NEVER stored in the database!
      firstName: registrationData?.firstName,
      lastName: registrationData?.lastName,
      mobileNumber: registrationData?.mobileNumber,
      expiresAt,
    });
    logger.info({ email: trimmedEmail, tokenId: token }, "Magic token created");

    // 4. Construct Verification Link
    const magicLinkUrl = `${origin}/login?token=${token}`;

    // 5. Compile HTML Template
    const html = await magicLinkHtml({
      email: trimmedEmail,
      magicLinkUrl,
      otpCode: otp, // Plaintext OTP is sent securely ONLY in the email!
    });

    const jobId = `magic-${trimmedEmail}-${Date.now()}`;
    logger.info({ email: trimmedEmail, jobId }, "Email job queued");

    // 6. Enqueue Email Dispatch Job with exponential BullMQ retries
    await QueueService.enqueue(getQueueName('notification-queue'), 'email-dispatch', {
      to: trimmedEmail,
      subject: 'Sign In to MAD Entertainment',
      html,
      notificationType: NotificationType.OTP,
    }, jobId);

    logger.info({ email: trimmedEmail }, 'Magic Link & OTP email queued successfully.');
  }

  /**
   * Verifies the Magic Link token or OTP code, logs the user in, and sets up session.
   */
  static async verifyMagicLinkOrOTP(
    tokenOrOtp: string,
    email?: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!tokenOrOtp) {
      throw AppError.badRequest('Verification code or link token is required');
    }

    let magicRecord = null;

    if (email) {
      // OTP Verification Mode
      const trimmedEmail = email.trim().toLowerCase();
      const cleanOtp = tokenOrOtp.trim().replace(/\s/g, '');
      const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

      magicRecord = await MagicTokenModel.findOne({
        email: trimmedEmail,
        otp: otpHash, // Match using the secure SHA-256 hash
      });
    } else {
      // Magic Link Verification Mode
      magicRecord = await MagicTokenModel.findOne({ token: tokenOrOtp });
    }

    if (!magicRecord || magicRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired login link/passcode');
    }

    const userEmail = magicRecord.email;

    // 1. Find or create the user in MongoDB
    let user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      user = await UserModel.create({
        email: userEmail,
        firstName: magicRecord.firstName,
        lastName: magicRecord.lastName,
        name: (magicRecord.firstName || magicRecord.lastName) 
          ? `${magicRecord.firstName || ''} ${magicRecord.lastName || ''}`.trim() 
          : undefined,
        mobileNumber: magicRecord.mobileNumber,
        isActive: true,
      });
      logger.info({ userId: user._id, email: userEmail }, 'New passwordless user registered.');
    } else if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated.');
    }

    user.lastLogin = new Date();
    await user.save();

    // 2. Clear the used token immediately (one-time use enforced)
    await MagicTokenModel.deleteOne({ _id: magicRecord._id });

    // 3. Link past guest bookings automatically
    await this.linkBookingsToUser(userEmail, user._id.toString());

    // 4. Issue session tokens
    const { accessToken, refreshToken } = await this.issueTokens(user._id.toString(), user.email, 'user');

    return { user, accessToken, refreshToken };
  }

  /**
   * Verifies Google Auth token locally using official google-auth-library verifyIdToken.
   */
  static async verifyGoogleToken(
    idToken: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!idToken) {
      throw AppError.badRequest('Google ID Token is required');
    }

    const env = getEnv();
    const isDevPlaceholder = env.GOOGLE_CLIENT_ID === 'google_client_id_placeholder';

    let payload;
    if (isDevPlaceholder && idToken.startsWith('mock_')) {
      // Secure local mock verification for development/testing environment
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

    // Find or create User
    let user = await UserModel.findOne({
      $or: [{ googleId }, { email: userEmail }],
    });

    if (!user) {
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
    } else {
      if (!user.isActive) {
        throw AppError.forbidden('Your account has been deactivated.');
      }
      // Keep profile info updated from Google login
      let modified = false;
      if (!user.googleId) { user.googleId = googleId; modified = true; }
      if (!user.picture) { user.picture = picture; modified = true; }
      if (!user.name && name) { user.name = name; modified = true; }
      if (given_name && user.firstName !== given_name) { user.firstName = given_name; modified = true; }
      if (family_name && user.lastName !== family_name) { user.lastName = family_name; modified = true; }
      if (modified) {
        await user.save();
      }
    }

    user.lastLogin = new Date();
    await user.save();

    // Link past bookings
    await this.linkBookingsToUser(userEmail, user._id.toString());

    // Issue tokens
    const { accessToken, refreshToken } = await this.issueTokens(user._id.toString(), user.email, 'user');

    return { user, accessToken, refreshToken };
  }

  /**
   * Refreshes JWT session implementing secure Refresh Token Rotation (RTR).
   */
  static async refreshSession(
    refreshTokenString: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshTokenString) {
      throw AppError.unauthorized('Refresh token is required');
    }

    // Find the token record in MongoDB
    const tokenRecord = await RefreshTokenModel.findOne({ token: refreshTokenString });

    if (!tokenRecord) {
      throw AppError.unauthorized('Invalid session');
    }

    // Replay Attack Detection: If a revoked token is reused, check if it's a legitimate race condition
    if (tokenRecord.isRevoked) {
      const GRACE_PERIOD_MS = 10000; // 10-second grace period for network retries / race conditions
      const isWithinGracePeriod =
        tokenRecord.replacedByToken &&
        tokenRecord.updatedAt &&
        Date.now() - tokenRecord.updatedAt.getTime() < GRACE_PERIOD_MS;

      if (isWithinGracePeriod) {
        // Find successor token to return the already issued valid credentials
        const successorRecord = await RefreshTokenModel.findOne({ token: tokenRecord.replacedByToken });
        if (successorRecord && !successorRecord.isRevoked && successorRecord.expiresAt > new Date()) {
          if (successorRecord.userId) {
            const user = await UserModel.findById(successorRecord.userId);
            if (user && user.isActive) {
              const accessToken = signUserToken({
                sub: user._id.toString(),
                email: user.email,
                role: 'user',
              });
              logger.info({ userId: user._id }, 'Legitimate concurrent refresh handled gracefully within grace period.');
              return {
                accessToken,
                refreshToken: successorRecord.token,
              };
            }
          }
        }
      }

      // Actual Replay Attack detected (outside grace period or invalid successor)
      if (tokenRecord.userId) {
        await RefreshTokenModel.updateMany({ userId: tokenRecord.userId }, { isRevoked: true });
        logger.warn({ userId: tokenRecord.userId }, 'Replay attack detected! Revoked all active user refresh tokens.');
      } else if (tokenRecord.adminId) {
        await RefreshTokenModel.updateMany({ adminId: tokenRecord.adminId }, { isRevoked: true });
        logger.warn({ adminId: tokenRecord.adminId }, 'Replay attack detected! Revoked all active admin refresh tokens.');
      }
      throw AppError.unauthorized('Session compromised. Please log in again.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Session has expired. Please log in again.');
    }

    // Generate rotated token string
    const newRefreshTokenString = crypto.randomBytes(32).toString('hex');

    // Option A: Atomic single-rotation check
    const updatedRecord = await RefreshTokenModel.findOneAndUpdate(
      { _id: tokenRecord._id, isRevoked: false },
      { $set: { isRevoked: true, replacedByToken: newRefreshTokenString } },
      { new: true }
    );

    // If another request beat this one to the rotation, recover and return the successor record
    if (!updatedRecord) {
      const reFetchedRecord = await RefreshTokenModel.findById(tokenRecord._id);
      if (reFetchedRecord && reFetchedRecord.isRevoked && reFetchedRecord.replacedByToken) {
        const successorRecord = await RefreshTokenModel.findOne({ token: reFetchedRecord.replacedByToken });
        if (successorRecord && !successorRecord.isRevoked && successorRecord.expiresAt > new Date()) {
          if (successorRecord.userId) {
            const user = await UserModel.findById(successorRecord.userId);
            if (user && user.isActive) {
              const accessToken = signUserToken({
                sub: user._id.toString(),
                email: user.email,
                role: 'user',
              });
              logger.info({ userId: user._id }, 'Concurrent refresh race resolved atomically.');
              return {
                accessToken,
                refreshToken: successorRecord.token,
              };
            }
          }
        }
      }
      throw AppError.unauthorized('Session compromised. Please log in again.');
    }

    let accessToken = '';
    let newRecord = null;

    if (tokenRecord.userId) {
      // User Refresh Flow
      const user = await UserModel.findById(tokenRecord.userId);
      if (!user || !user.isActive) {
        throw AppError.unauthorized('User is inactive or no longer exists');
      }

      accessToken = signUserToken({
        sub: user._id.toString(),
        email: user.email,
        role: 'user',
      });

      newRecord = await RefreshTokenModel.create({
        userId: user._id,
        token: newRefreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
      });
    } else if (tokenRecord.adminId) {
      // Admin Refresh Flow strictly isolated
      throw AppError.unauthorized('Direct user refresh not allowed for admin token chains');
    } else {
      throw AppError.unauthorized('Malformed refresh token record');
    }

    return {
      accessToken,
      refreshToken: newRecord.token,
    };
  }

  /**
   * Revokes a session upon logout.
   */
  static async revokeSession(refreshTokenString: string): Promise<void> {
    if (refreshTokenString) {
      await RefreshTokenModel.updateOne({ token: refreshTokenString }, { isRevoked: true });
    }
  }

  /**
   * Helper to issue access and refresh tokens for user/admin.
   */
  private static async issueTokens(
    id: string,
    email: string,
    role: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Access Token (Short-lived JWT)
    const accessToken = signUserToken({
      sub: id,
      email,
      role,
    });

    // 2. Refresh Token (Long-lived random string)
    const refreshTokenString = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days session

    await RefreshTokenModel.create({
      userId: new Types.ObjectId(id),
      token: refreshTokenString,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenString };
  }

  /**
   * Scans bookings and automatically links unmatched guest bookings to the user profile safely.
   */
  private static async linkBookingsToUser(email: string, userId: string): Promise<void> {
    try {
      // Strictly prevent multiple parallel processes or race conditions from linking the same booking twice
      const result = await Booking.updateMany(
        { guestEmail: email, userId: { $exists: false } },
        { $set: { userId: new Types.ObjectId(userId) } }
      );
      if (result.modifiedCount > 0) {
        logger.info(
          { email, userId, count: result.modifiedCount },
          'Linked historical bookings to newly logged in user account.'
        );
      }
    } catch (err) {
      logger.error({ err, email, userId }, 'Failed to link historical guest bookings.');
    }
  }
}

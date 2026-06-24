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
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { magicLinkHtml } from '../../lib/email';
import { normalizeEmail } from '../../utils/email';
import { getRedis, isRedisConnected } from '../../config/redis';
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

    const normalizedEmail = normalizeEmail(email);
    logger.info({ email: normalizedEmail }, "OTP passcode requested");

    // Cooldown verification (Redis-first with DB fallback)
    const cooldownKey = `mad:otp:cooldown:${normalizedEmail}`;
    const isRedisActive = isRedisConnected();
    let isLocked = false;
    let retryAfter = 60;

    if (isRedisActive) {
      try {
        const redis = getRedis();
        // Atomic EX NX acquisition
        const lockResult = await redis.set(cooldownKey, '1', 'EX', 60, 'NX');
        isLocked = lockResult !== 'OK';
        if (isLocked) {
          const ttl = await redis.ttl(cooldownKey);
          retryAfter = ttl > 0 ? ttl : 60;
        }
      } catch (err) {
        logger.error({ err, email: normalizedEmail }, 'Redis cooldown lock set failed. Falling back to MongoDB.');
      }
    }

    // Fallback: If Redis is offline, check MongoDB.
    // Or if Redis is active and we failed to acquire the lock.
    if (!isRedisActive || isLocked) {
      if (!isRedisActive) {
        const existing = await MagicTokenModel.findOne({ email: normalizedEmail });
        if (existing) {
          const elapsed = Math.floor((Date.now() - existing.createdAt.getTime()) / 1000);
          if (elapsed < 60) {
            retryAfter = Math.max(0, 60 - elapsed);
            throw AppError.tooManyRequests('Please wait before requesting another code.', 'OTP_COOLDOWN_ACTIVE', retryAfter);
          }
        }
      } else {
        // Redis is active, but we are locked out
        throw AppError.tooManyRequests('Please wait before requesting another code.', 'OTP_COOLDOWN_ACTIVE', retryAfter);
      }
    }

    let token;
    try {
      // 1. Generate unique 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

      // 2. Hash the OTP for secure database storage
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      // 3. Delete existing and save MagicToken (atomic recreation)
      await MagicTokenModel.deleteOne({ email: normalizedEmail });

      token = await MagicTokenModel.create({
        email: normalizedEmail,
        otp: otpHash,
        firstName: registrationData?.firstName,
        lastName: registrationData?.lastName,
        mobileNumber: registrationData?.mobileNumber,
        expiresAt,
      });
      logger.info({ email: normalizedEmail, tokenId: token._id }, "OTP login session upserted");


      // 4. Compile HTML Template
      const html = await magicLinkHtml({
        email: normalizedEmail,
        otpCode: otp, // Plaintext OTP is sent securely ONLY in the email!
      });

      const jobId = `magic-${normalizedEmail}-${token._id.toString()}`;
      logger.info({ email: normalizedEmail, jobId }, "Email job queued");

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

      // 5. Enqueue Email Dispatch Job with exponential BullMQ retries
      await QueueService.enqueue(getQueueName('notification-queue'), 'email-dispatch', {
        to: normalizedEmail,
        subject: 'Sign In to MAD Entertainment',
        html,
        notificationType: NotificationType.OTP,
      }, jobId);

      logger.info({ email: normalizedEmail }, 'OTP verification email queued successfully.');
    } catch (err: any) {
      // Check for MongoDB unique index violation (E11000)
      const isDuplicateKey = err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');

      // Failure Handling / Rollback: Release Redis lock if lock was successfully acquired
      if (isRedisActive && !isLocked && !isDuplicateKey) {
        try {
          const redis = getRedis();
          await redis.del(cooldownKey);
          logger.info({ email: normalizedEmail }, 'Redis cooldown lock rolled back due to write/enqueue failure.');
        } catch (delErr) {
          logger.error({ delErr, email: normalizedEmail }, 'Failed to delete Redis cooldown lock during rollback.');
        }
      }

      if (isDuplicateKey) {
        throw AppError.tooManyRequests('Please wait before requesting another code.', 'OTP_COOLDOWN_ACTIVE', 60);
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
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!otp || !email) {
      throw AppError.badRequest('Verification code and email are required');
    }

    // OTP Verification Mode
    const normalizedEmail = normalizeEmail(email);
    const cleanOtp = otp.trim().replace(/\s/g, '');
    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const magicRecord = await MagicTokenModel.findOne({
      email: normalizedEmail,
      otp: otpHash, // Match using the secure SHA-256 hash
    });

    if (!magicRecord || magicRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired login passcode');
    }

    const userEmail = magicRecord.email;

    // 1. Find or create the user in MongoDB
    let user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      try {
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
      } catch (err: any) {
        if (err && err.code === 11000) {
          logger.info({ email: userEmail }, 'Concurrent email registration race collision caught, fetching existing user.');
          user = await UserModel.findOne({ email: userEmail });
          if (!user) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    } else if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated.');
    }

    user.lastLogin = new Date();
    await user.save();

    // 2. Clear the used token immediately (one-time use enforced)
    await MagicTokenModel.deleteOne({ _id: magicRecord._id });

    // 3. Link past guest bookings automatically
    await this.linkBookingsToUser(userEmail, user._id.toString());
    await this.hydrateUserProfile(user._id.toString(), userEmail);

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

    // Find or create User sequentially to prevent collision and E11000 errors
    let user = await UserModel.findOne({ googleId });

    if (user) {
      if (!user.isActive) {
        throw AppError.forbidden('Your account has been deactivated.');
      }
      // If email has changed, check if the new email is already occupied by a different account
      if (user.email !== userEmail) {
        const emailCollision = await UserModel.findOne({ email: userEmail });
        if (emailCollision) {
          logger.warn(
            { userId: user._id, currentEmail: user.email, googleEmail: userEmail, collisionUserId: emailCollision._id },
            'Google email update skipped due to collision with another existing account.'
          );
        } else {
          user.email = userEmail;
          logger.info({ userId: user._id, oldEmail: user.email, newEmail: userEmail }, 'User email updated to Google verified email.');
        }
      }
    } else {
      // Find exclusively by verified email second
      user = await UserModel.findOne({ email: userEmail });
      if (user) {
        if (!user.isActive) {
          throw AppError.forbidden('Your account has been deactivated.');
        }
        // Link Google ID to existing account securely
        user.googleId = googleId;
        logger.info({ userId: user._id, email: userEmail }, 'Linked Google login to existing email account.');
      } else {
        // Create a completely new user
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
            logger.info({ email: userEmail, googleId }, 'Concurrent Google registration race collision caught, fetching existing user.');
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

    // Keep profile info updated from Google login safely (never overwrite existing values)
    let profileModified = false;
    if (!user.picture && picture) { user.picture = picture; profileModified = true; }
    if (!user.name && name) { user.name = name; profileModified = true; }
    if (given_name && (!user.firstName || user.firstName.trim() === '')) { user.firstName = given_name; profileModified = true; }
    if (family_name && (!user.lastName || user.lastName.trim() === '')) { user.lastName = family_name; profileModified = true; }
    if (profileModified) {
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    // Link past bookings
    await this.linkBookingsToUser(userEmail, user._id.toString());
    await this.hydrateUserProfile(user._id.toString(), userEmail);

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
        { 
          $set: { userId: new Types.ObjectId(userId) }
        }
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

  /**
   * Safe profile hydration from historical guest bookings.
   * Enforces "Never Overwrite" safeguards, smart data-quality booking selection heuristics,
   * and strict normalized email matching rules.
   */
  public static async hydrateUserProfile(userId: string, email: string): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user || !user.isActive) return;

      // 1. Guard check: only proceed if at least one field is currently blank
      const needsFirstName = !user.firstName || user.firstName.trim() === '';
      const needsLastName = !user.lastName || user.lastName.trim() === '';
      const needsMobile = !user.mobileNumber || user.mobileNumber.trim() === '';

      if (!needsFirstName && !needsLastName && !needsMobile) {
        return; // Profile is already complete; skip database operations
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 2. Query Priority 1: Confirmed completed bookings containing usable data
      let sourceBooking = await Booking.findOne({
        guestEmail: normalizedEmail,
        status: 'confirmed',
        $or: [
          { firstName: { $ne: null, $gt: "" } },
          { lastName: { $ne: null, $gt: "" } },
          { guestPhone: { $ne: null, $gt: "" } }
        ]
      }).sort({ createdAt: -1 });

      // 3. Query Priority 2 (Fallback): Any booking containing usable data
      if (!sourceBooking) {
        sourceBooking = await Booking.findOne({
          guestEmail: normalizedEmail,
          $or: [
            { firstName: { $ne: null, $gt: "" } },
            { lastName: { $ne: null, $gt: "" } },
            { guestPhone: { $ne: null, $gt: "" } }
          ]
        }).sort({ createdAt: -1 });
      }

      if (!sourceBooking) return; // Priority 3: No valid data found

      // 4. Safe sync application (Never Overwrite)
      let isModified = false;

      if (needsFirstName && sourceBooking.firstName && sourceBooking.firstName.trim() !== '') {
        user.firstName = sourceBooking.firstName.trim();
        isModified = true;
      }

      if (needsLastName && sourceBooking.lastName && sourceBooking.lastName.trim() !== '') {
        user.lastName = sourceBooking.lastName.trim();
        isModified = true;
      }

      if (needsMobile && sourceBooking.guestPhone && sourceBooking.guestPhone.trim() !== '') {
        user.mobileNumber = sourceBooking.guestPhone.trim();
        isModified = true;
      }

      // 5. Re-compile display name if fields were updated and display name is currently blank
      if (isModified && (!user.name || user.name.trim() === '')) {
        user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      if (isModified) {
        await user.save();
        logger.info({ userId, email: normalizedEmail }, "User profile safely hydrated from historical booking details.");
      }
    } catch (err) {
      logger.error({ err, userId, email }, "Failed to hydrate user profile from guest bookings.");
    }
  }
}

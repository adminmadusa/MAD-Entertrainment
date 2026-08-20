import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../middleware/error.middleware';
import { RefreshTokenModel } from '../../models/refresh-token.schema';
import { UserModel } from '../../models/user.schema';
import { signUserToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';

export class AuthSessionService {
  /**
   * Helper to issue access and refresh tokens for user/admin.
   */
  static async issueTokens(
    id: string,
    email: string,
    role: string
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    // 1. Access Token (Short-lived JWT)
    const accessToken = signUserToken({
      sub: id,
      email,
      role,
    });

    // 2. Refresh Token (Long-lived random string)
    const refreshTokenString = crypto.randomBytes(32).toString('hex');
    // 3. CSRF Token (bound to refresh session, rotated on every refresh)
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days session

    await RefreshTokenModel.create({
      userId: new Types.ObjectId(id),
      token: refreshTokenString,
      csrfToken,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenString, csrfToken };
  }

  /**
   * Refreshes JWT session implementing secure Refresh Token Rotation (RTR).
   */
  static async refreshSession(
    refreshTokenString: string,
    providedCsrfToken: string
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    if (typeof refreshTokenString !== 'string' || !refreshTokenString.trim()) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const sanitizedToken = refreshTokenString.trim();
    const tokenRecord = await RefreshTokenModel.findOne({ token: sanitizedToken });

    if (!tokenRecord) {
      throw AppError.unauthorized('Invalid session');
    }

    // Replay Attack Detection: If a revoked token is reused, check if it's a legitimate race condition
    if (tokenRecord.isRevoked) {
      const GRACE_PERIOD_MS = 10000;
      const isWithinGracePeriod =
        tokenRecord.replacedByToken &&
        tokenRecord.updatedAt &&
        Date.now() - tokenRecord.updatedAt.getTime() < GRACE_PERIOD_MS;

      if (isWithinGracePeriod) {
        const successorRecord = await RefreshTokenModel.findOne({
          token: tokenRecord.replacedByToken,
        });
        if (
          successorRecord &&
          !successorRecord.isRevoked &&
          successorRecord.expiresAt > new Date()
        ) {
          if (successorRecord.userId) {
            const user = await UserModel.findById(successorRecord.userId);
            if (user && user.isActive) {
              const accessToken = signUserToken({
                sub: user._id.toString(),
                email: user.email,
                role: 'user',
              });
              logger.info(
                { userId: user._id },
                'Legitimate concurrent refresh handled gracefully within grace period.'
              );
              return {
                accessToken,
                refreshToken: successorRecord.token,
                csrfToken: successorRecord.csrfToken,
              };
            }
          }
        }
      }

      // Replay Attack detected
      if (tokenRecord.userId) {
        await RefreshTokenModel.updateMany({ userId: tokenRecord.userId }, { isRevoked: true });
        logger.warn(
          { userId: tokenRecord.userId },
          'Replay attack detected! Revoked all active user refresh tokens.'
        );
      } else if (tokenRecord.adminId) {
        await RefreshTokenModel.updateMany({ adminId: tokenRecord.adminId }, { isRevoked: true });
        logger.warn(
          { adminId: tokenRecord.adminId },
          'Replay attack detected! Revoked all active admin refresh tokens.'
        );
      }
      throw AppError.unauthorized('Session compromised. Please log in again.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Session has expired. Please log in again.');
    }

    const newRefreshTokenString = crypto.randomBytes(32).toString('hex');

    const updatedRecord = await RefreshTokenModel.findOneAndUpdate(
      { _id: tokenRecord._id, isRevoked: false },
      { $set: { isRevoked: true, replacedByToken: newRefreshTokenString } },
      { new: true }
    );

    if (!updatedRecord) {
      const reFetchedRecord = await RefreshTokenModel.findById(tokenRecord._id);
      if (reFetchedRecord && reFetchedRecord.isRevoked && reFetchedRecord.replacedByToken) {
        const successorRecord = await RefreshTokenModel.findOne({
          token: reFetchedRecord.replacedByToken,
        });
        if (
          successorRecord &&
          !successorRecord.isRevoked &&
          successorRecord.expiresAt > new Date()
        ) {
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
                csrfToken: successorRecord.csrfToken,
              };
            }
          }
        }
      }
      throw AppError.unauthorized('Session compromised. Please log in again.');
    }

    if (!providedCsrfToken || providedCsrfToken !== tokenRecord.csrfToken) {
      throw AppError.unauthorized('CSRF_TOKEN_INVALID');
    }

    if (tokenRecord.userId) {
      const user = await UserModel.findById(tokenRecord.userId);
      if (!user || !user.isActive) {
        throw AppError.unauthorized('User is inactive or no longer exists');
      }

      const accessToken = signUserToken({
        sub: user._id.toString(),
        email: user.email,
        role: 'user',
      });

      const newCsrfToken = crypto.randomBytes(32).toString('hex');

      const newRecord = await RefreshTokenModel.create({
        userId: user._id,
        token: newRefreshTokenString,
        csrfToken: newCsrfToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken,
        refreshToken: newRecord.token,
        csrfToken: newRecord.csrfToken,
      };
    } else if (tokenRecord.adminId) {
      throw AppError.unauthorized('Direct user refresh not allowed for admin token chains');
    } else {
      throw AppError.unauthorized('Malformed refresh token record');
    }
  }

  /**
   * Revokes a session upon logout.
   */
  static async revokeSession(refreshTokenString: string): Promise<void> {
    if (typeof refreshTokenString !== 'string' || !refreshTokenString.trim()) {
      return;
    }
    const sanitizedToken = refreshTokenString.trim();
    await RefreshTokenModel.updateOne({ token: sanitizedToken }, { isRevoked: true });
  }
}

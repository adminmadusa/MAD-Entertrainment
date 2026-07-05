import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Suppression } from '../../models/suppression.schema';
import { logger } from '../../utils/logger';

export class MarketingController {
  /**
   * Handles user unsubscribe requests.
   * GET /api/marketing/unsubscribe?email=...&token=...
   */
  static async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, token } = req.query;

      if (!email || !token) {
        throw AppError.badRequest('Email and token query parameters are required');
      }

      const emailStr = String(email).trim();
      const tokenStr = String(token).trim();

      const secret = getEnv().MARKETING_UNSUBSCRIBE_SECRET;
      if (!secret) {
        logger.error('MARKETING_UNSUBSCRIBE_SECRET environment variable is missing.');
        throw new AppError('Server configuration error', 500);
      }

      // Check validation against lowercased and raw email formats to be robust
      const normalizedEmail = emailStr.toLowerCase();
      const expectedTokenNormalized = crypto
        .createHash('sha256')
        .update(normalizedEmail + secret)
        .digest('hex');

      const expectedTokenRaw = crypto
        .createHash('sha256')
        .update(emailStr + secret)
        .digest('hex');

      if (tokenStr !== expectedTokenNormalized && tokenStr !== expectedTokenRaw) {
        throw AppError.badRequest('Invalid unsubscribe token');
      }

      // Upsert email into the Suppression collection
      await Suppression.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            email: normalizedEmail,
            source: 'unsubscribe',
            reason: 'Unsubscribed via public link',
          },
        },
        { upsert: true, new: true }
      );

      logger.info({ email: normalizedEmail }, 'Successfully processed opt-out unsubscribe request.');

      res.status(200).json({
        success: true,
        message: 'You have been successfully unsubscribed from marketing emails.',
      });
    } catch (err) {
      next(err);
    }
  }
}

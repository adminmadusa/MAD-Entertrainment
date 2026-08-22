import crypto from 'crypto';

import { NotificationType } from '@mad/shared';

import { getEnv } from '../config/env';
import { getQueueName } from '../config/queue.config';
import { AppError } from '../middleware/error.middleware';
import { Booking } from '../models/booking.schema';
import { Suppression } from '../models/suppression.schema';
import { logger } from '../utils/logger';
import { QueueService } from './queue.service';

export class MarketingService {
  /**
   * Enqueues marketing campaign emails for all consented users.
   */
  static async sendCampaign(subject: string, html: string): Promise<{ queued: number }> {
    if (!subject || !html) {
      throw AppError.badRequest('Subject and html fields are required');
    }

    // 1. Query Booking collection for consented users, populating User reference
    const bookings = await Booking.find({
      $or: [
        { keepUpdated: true },
        { sendBestEvents: true },
      ],
    })
      .select('guestEmail userId')
      .populate('userId', 'email');

    // 2. Extract recipient emails (both guestEmail and userId -> User.email)
    const rawEmails: string[] = [];
    for (const b of bookings) {
      if (b.guestEmail?.trim()) {
        rawEmails.push(b.guestEmail.trim());
      }
      if (b.userId && (b.userId as any).email?.trim()) {
        rawEmails.push((b.userId as any).email.trim());
      }
    }

    // 3. Deduplicate emails (case-insensitive deduplication)
    const uniqueEmails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase())));

    if (uniqueEmails.length === 0) {
      return { queued: 0 };
    }

    // 4. Query Suppression collection and filter out suppressed emails
    const suppressedDocs = await Suppression.find({
      email: { $in: uniqueEmails },
    }).select('email');

    const suppressedEmails = new Set(suppressedDocs.map((d) => d.email.toLowerCase()));
    const targetEmails = uniqueEmails.filter((email) => !suppressedEmails.has(email));

    const recipientCount = targetEmails.length;

    if (recipientCount > 0) {
      const timestamp = Date.now();
      const queueName = getQueueName('marketing-queue');
      const secret = getEnv().MARKETING_UNSUBSCRIBE_SECRET || 'marketing-default-secret';
      const webUrl = getEnv().FRONTEND_URL || 'https://www.madentertainments.net';

      // 5. Enqueue one job per recipient onto marketing-queue
      for (const email of targetEmails) {
        const token = crypto
          .createHash('sha256')
          .update(email.toLowerCase() + secret)
          .digest('hex');
        const unsubscribeUrl = `${webUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;

        const jobId = `mkt-${timestamp}-${email}`;
        await QueueService.enqueue(
          queueName,
          'email-dispatch',
          {
            to: email,
            subject,
            html,
            notificationType: NotificationType.MARKETING,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          },
          jobId
        );
      }

      logger.info({ recipientCount, queueName }, 'Enqueued marketing campaign emails successfully');
    }

    return { queued: recipientCount };
  }

  /**
   * Processes unsubscribe requests and persists suppression record.
   */
  static async unsubscribe(email: string, token: string): Promise<void> {
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

    // Validate token against normalized and raw email
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
  }
}

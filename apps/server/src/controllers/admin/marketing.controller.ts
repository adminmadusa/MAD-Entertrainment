import { Request, Response, NextFunction } from 'express';

import { NotificationType } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Suppression } from '../../models/suppression.schema';
import { QueueService } from '../../services/queue.service';
import { logger } from '../../utils/logger';

export class MarketingController {
  /**
   * Triggers a marketing bulk email campaign.
   * POST /api/admin/marketing/send
   */
  static async sendCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subject, html } = req.body;

      if (!subject || !html) {
        throw AppError.badRequest('Subject and html fields are required in request body');
      }

      // A. Query Booking collection for consented users, populating User reference
      const bookings = await Booking.find({
        $or: [
          { keepUpdated: true },
          { sendBestEvents: true }
        ]
      })
        .select('guestEmail userId')
        .populate('userId', 'email');

      // B. Extract recipient emails (both guestEmail and userId -> User.email)
      const rawEmails: string[] = [];
      for (const b of bookings) {
        if (b.guestEmail?.trim()) {
          rawEmails.push(b.guestEmail.trim());
        }
        if (b.userId && (b.userId as any).email?.trim()) {
          rawEmails.push((b.userId as any).email.trim());
        }
      }

      // C. Deduplicate emails (case-insensitive deduplication)
      const uniqueEmails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase())));

      if (uniqueEmails.length === 0) {
        res.status(200).json({
          success: true,
          queued: 0
        });
        return;
      }

      // D. Query Suppression collection and filter out suppressed emails
      const suppressedDocs = await Suppression.find({
        email: { $in: uniqueEmails }
      }).select('email');

      const suppressedEmails = new Set(suppressedDocs.map((d) => d.email.toLowerCase()));
      const targetEmails = uniqueEmails.filter((email) => !suppressedEmails.has(email));

      const recipientCount = targetEmails.length;

      if (recipientCount > 0) {
        const timestamp = Date.now();
        const queueName = getQueueName('marketing-queue');

        // E. Enqueue one job per recipient onto marketing-queue
        for (const email of targetEmails) {
          const jobId = `mkt-${timestamp}-${email}`;
          await QueueService.enqueue(
            queueName,
            'email-dispatch',
            {
              to: email,
              subject,
              html,
              notificationType: NotificationType.MARKETING
            },
            jobId
          );
        }

        logger.info({ recipientCount, queueName }, 'Enqueued marketing campaign emails successfully');
      }

      // F. Return success response
      res.status(200).json({
        success: true,
        queued: recipientCount
      });
    } catch (err) {
      next(err);
    }
  }
}

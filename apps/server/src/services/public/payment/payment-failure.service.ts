import { ClientSession } from 'mongoose';
import { BookingStatus, NotificationType, PaymentStatus } from '@mad/shared';
import { getEnv } from '../../../config/env';
import { getQueueName } from '../../../config/queue.config';
import { paymentFailureHtml } from '../../../lib/email';
import { IBooking } from '../../../models/booking.schema';
import { Event } from '../../../models/event.schema';
import { Notification } from '../../../models/notification.schema';
import { IPayment } from '../../../models/payment.schema';
import { Refund } from '../../../models/refund.schema';
import { logger } from '../../../utils/logger';
import { createNotificationSafe } from '../../notification.service';
import { QueueService } from '../../queue.service';
import { PaymentInventoryService } from '../payment-inventory.service';

export class PaymentFailureService {
  static async triggerRefundRequest(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    session?: ClientSession,
    origin: 'manual' | 'auto_recovery' = 'manual',
    recoveryReason?:
      | 'AMOUNT_MISMATCH'
      | 'BOOKING_REFERENCE_MISMATCH'
      | 'BOOKING_ID_MISMATCH'
      | 'CURRENCY_MISMATCH'
      | 'PAYMENT_VALIDATION_FAILURE'
      | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ): Promise<void> {
    const idempotencyKey = `auto-refund-${payment._id}`;

    const existingRefund = await Refund.findOne({
      paymentId: payment._id,
      status: { $in: ['requested', 'processing', 'completed'] },
    }).session(session || null);

    if (!existingRefund) {
      try {
        await Refund.create(
          [
            {
              bookingId: booking._id,
              paymentId: payment._id,
              amount: booking.totalAmount,
              currency: booking.currency || 'USD',
              reason: reason || 'LATE_PAYMENT_RECOVERY_REJECTED',
              status: 'requested',
              idempotencyKey,
              origin,
              recoveryReason,
            },
          ],
          { session }
        );
        logger.info(
          {
            bookingId: booking._id,
            paymentId: payment._id,
            amount: booking.totalAmount,
            reason,
            idempotencyKey,
            origin,
            recoveryReason,
          },
          'Created automatic Refund request record due to validation mismatch / recovery'
        );
      } catch (err: any) {
        const isDuplicateKey =
          err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');
        if (isDuplicateKey) {
          logger.warn(
            { paymentId: payment._id, idempotencyKey },
            'Duplicate refund request creation race detected. Handled idempotently.'
          );
        } else {
          throw err;
        }
      }
    }
  }

  static async failPaymentAndReleaseInventory(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    origin?: 'manual' | 'auto_recovery',
    recoveryReason?:
      | 'AMOUNT_MISMATCH'
      | 'BOOKING_REFERENCE_MISMATCH'
      | 'BOOKING_ID_MISMATCH'
      | 'CURRENCY_MISMATCH'
      | 'PAYMENT_VALIDATION_FAILURE'
      | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ) {
    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

    if (origin === 'auto_recovery') {
      await PaymentFailureService.triggerRefundRequest(
        booking,
        payment,
        reason,
        undefined,
        origin,
        recoveryReason
      ).catch(() => {});
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      logger.info(
        {
          bookingId: booking._id,
          bookingStatus: booking.status,
          paymentId: payment._id,
        },
        'Skipping booking failure transition and inventory release for already-processed booking'
      );
      return;
    }

    await PaymentInventoryService.releaseInventoryForFailedPayment(booking, payment, reason);

    if (booking.guestEmail) {
      try {
        const existingNotification = await Notification.findOne({
          jobId: `payfail-${payment._id}`,
        });

        if (!existingNotification) {
          const event = await Event.findById(booking.eventId);
          const emailBody = await paymentFailureHtml({
            customerName: booking.guestName,
            eventTitle: event?.title || 'MAD Event',
            bookingReference: booking.bookingId,
            retryUrl: `${getEnv().FRONTEND_URL || 'http://localhost:3000'}/checkout/${booking.bookingId}`,
          });

          const jobId = `payfail-${payment._id}`;

          await createNotificationSafe({
            jobId,
            status: 'queued',
            queuedAt: new Date(),
            type: NotificationType.PAYMENT_FAILED,
            channel: 'email',
            recipient: booking.guestEmail,
            subject: `Payment Failed for ${event?.title || 'MAD Event'}`,
            isSent: false,
            retryCount: 0,
            bookingId: booking._id,
            eventId: event?._id,
          });

          await QueueService.enqueue(
            getQueueName('notification-queue'),
            'email-dispatch',
            {
              to: booking.guestEmail,
              subject: `Payment Failed for ${event?.title || 'MAD Event'}`,
              html: emailBody,
              notificationType: NotificationType.PAYMENT_FAILED,
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
            },
            jobId
          );

          logger.info(
            {
              emailType: 'PAYMENT_FAILED',
              recipient: booking.guestEmail,
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
              timestamp: new Date().toISOString(),
              success: true,
            },
            'Payment failure email queued successfully.'
          );
        } else {
          logger.info(
            { bookingId: booking._id, paymentId: payment._id },
            'Payment failure email already queued or sent; skipping duplicate.'
          );
        }
      } catch (err) {
        logger.error(
          {
            err,
            emailType: 'PAYMENT_FAILED',
            recipient: booking.guestEmail,
            bookingId: booking._id.toString(),
            eventId: booking.eventId.toString(),
            timestamp: new Date().toISOString(),
            success: false,
          },
          'Failed to queue payment failure email gracefully.'
        );
      }
    }
  }
}

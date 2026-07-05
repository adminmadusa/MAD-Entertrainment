import crypto from 'crypto';

import { BookingStatus, PaymentStatus, ReservationStatus, NotificationType } from '@mad/shared';

import { getEnv } from '../config/env';
import { getQueueName } from '../config/queue.config';
import { emitToAdmin, emitToEvent } from '../config/socket';
import { fullRefundHtml, partialRefundHtml, eventCancellationHtml } from '../lib/email';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Notification } from '../models/notification.schema';
import { Payment } from '../models/payment.schema';
import { Refund } from '../models/refund.schema';
import { Reservation } from '../models/reservation.schema';
import { Ticket } from '../models/ticket.schema';
import { auditLog } from '../utils/audit';
import { runWithContext, getTraceContext } from '../utils/context';
import { logger } from '../utils/logger';

import { createNotificationSafe } from './notification.service';
import { PaymentRefundService } from './public/payment-refund.service';
import { PaymentService } from './public/payment.service';
import { QueueService } from './queue.service';
import { SeatConsistencyService } from './consistency/seat-consistency.service';
import { BookingConsistencyService, UNTICKETED_BOOKING_WINDOW_MS } from './consistency/booking-consistency.service';
import { NotificationConsistencyService } from './consistency/notification-consistency.service';
import { ReservationService } from './reservation.service';




export interface ConsistencyReport {
  generatedAt: string;
  counts: {
    activeReservations: number;
    expiredReservations: number;
    redisLocks: number;
    awaitingPaymentBookings: number;
    orphanPayments: number;
  };
  drift: {
    staleSeatReservations: number;
    phantomRedisLocks: number;
    eventInventoryMismatches: number;
    unticketedConfirmedBookings: number;
    stuckNotifications: number;
    orphanedConfirmedDeliveries: number;
    paidPaymentMismatches?: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
    eventInventoryMismatchesRepaired?: number;
    logicallyExpiredBookings?: number;
    reEnqueuedUnticketedBookings?: number;
    resetStuckNotifications?: number;
    reEnqueuedOrphanedDeliveries?: number;
    repairedPaidPaymentMismatches?: number;
  };
}


export class ConsistencyService {




  private static async countPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).select('bookingId').lean();

    let count = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId).select('status').lean();
        if (!booking || booking.status !== BookingStatus.CONFIRMED) {
          count++;
        }
      } catch (error) {
        logger.warn({ paymentId: payment._id, error }, 'watchdog: failed to count paid payment mismatch');
      }
    }
    return count;
  }

  private static async repairPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).limit(50);

    let successCount = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId);

        // Case C: Booking already FAILED, CANCELLED, or otherwise unrecoverable (including missing booking)
        if (!booking || booking.status === BookingStatus.FAILED || booking.status === BookingStatus.CANCELLED) {
          logger.warn(
            { paymentId: payment._id, bookingId: payment.bookingId, bookingStatus: booking?.status },
            'Watchdog: Booking is missing or in an unrecoverable status. Failing payment and triggering refund.'
          );

          payment.status = PaymentStatus.FAILED;
          payment.failedAt = new Date();
          payment.failureReason = 'BOOKING_UNRECOVERABLE';
          await payment.save();

          if (booking) {
            await PaymentRefundService.triggerRefundRequest(booking, payment, 'BOOKING_UNRECOVERABLE');
          } else {
            // Create refund request manually since booking is missing
            const idempotencyKey = `auto-refund-${payment._id}`;
            const existingRefund = await Refund.findOne({
              paymentId: payment._id,
              status: { $in: ['requested', 'processing', 'completed'] }
            });
            if (!existingRefund) {
              await Refund.create([{
                bookingId: payment.bookingId,
                paymentId: payment._id,
                amount: payment.amount,
                currency: payment.currency || 'INR',
                reason: 'BOOKING_UNRECOVERABLE',
                status: 'requested',
                idempotencyKey,
              }]);
            }
          }
          successCount++;
          continue;
        }

        // Already confirmed (no repair needed)
        if (booking.status === BookingStatus.CONFIRMED) {
          continue;
        }

        // Case A: Booking status is AWAITING_PAYMENT, EXPIRING, EXPIRED
        if (
          booking.status === BookingStatus.AWAITING_PAYMENT ||
          booking.status === BookingStatus.EXPIRING ||
          booking.status === BookingStatus.EXPIRED
        ) {
          logger.info(
            { paymentId: payment._id, bookingId: booking._id, bookingStatus: booking.status },
            'Watchdog: Attempting recovery for paid payment with unconfirmed booking.'
          );

          try {
            const confirmResult = await (PaymentService as any).confirmBooking(booking, payment);

            const updatedBooking = await Booking.findById(booking._id).select('status').lean();
            if (updatedBooking?.status === BookingStatus.CONFIRMED) {
              logger.info(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Successfully recovered booking to CONFIRMED status.'
              );
              successCount++;
            } else {
              // Case B: Recovery fails or Capacity unavailable or Late recovery rejected
              logger.warn(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Booking confirmation did not transition to CONFIRMED. Failing payment and triggering refund.'
              );

              payment.status = PaymentStatus.FAILED;
              payment.failedAt = new Date();
              payment.failureReason = payment.failureReason || 'LATE_PAYMENT_RECOVERY_REJECTED';
              await payment.save();
              await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
              successCount++;
            }
          } catch (confirmError: any) {
            logger.error(
              { paymentId: payment._id, bookingId: booking._id, error: confirmError },
              'Watchdog: Error during booking confirmation recovery. Failing payment and triggering refund.'
            );

            payment.status = PaymentStatus.FAILED;
            payment.failedAt = new Date();
            payment.failureReason = confirmError.message || 'LATE_PAYMENT_RECOVERY_ERROR';
            await payment.save();
            await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
            successCount++;
          }
        }
      } catch (error) {
        logger.error({ paymentId: payment._id, error }, 'Watchdog: Failed to process paid payment mismatch');
      }
    }
    return successCount;
  }


  private static async countStuckProcessingRefunds(): Promise<number> {
    return await Refund.countDocuments({
      status: 'processing',
      updatedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) }
    });
  }

  private static async countOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).select('_id bookingId').lean();

    let count = 0;
    for (const refund of completedRefunds) {
      const hasNotification = await Notification.exists({
        bookingId: refund.bookingId,
        jobId: { $regex: `^refund-${refund._id}` }
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  private static async countOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).select('_id').lean();

    let count = 0;
    for (const booking of cancelledBookings) {
      const hasNotification = await Notification.exists({
        bookingId: booking._id,
        type: NotificationType.EVENT_CANCELLED
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  private static async repairStuckProcessingRefunds(): Promise<number> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    const stuckRefunds = await Refund.find({
      status: 'processing',
      updatedAt: { $lte: threshold }
    }).limit(100);

    let resetCount = 0;
    for (const refund of stuckRefunds) {
      try {
        const updateResult = await Refund.updateOne(
          { _id: refund._id, status: 'processing' },
          { $set: { status: 'requested' } }
        );
        if (updateResult.modifiedCount > 0) {
          resetCount++;
          auditLog({
            action: 'REFUND_PROCESSING_TIMEOUT_RESET',
            actor: { type: 'admin', id: 'system' },
            status: 'success',
            metadata: {
              refundId: refund._id.toString(),
              paymentId: refund.paymentId.toString(),
              bookingId: refund.bookingId.toString(),
              amount: refund.amount,
            },
            description: `Reset stuck processing refund ${refund._id} back to requested due to 15-minute lease expiry.`,
          });
          logger.warn({ refundId: refund._id }, 'Watchdog: Reverted stuck processing refund back to requested status.');
        }
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to reset stuck processing refund.');
      }
    }
    return resetCount;
  }

  private static async repairOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const refund of completedRefunds) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: refund.bookingId,
          jobId: { $regex: `^refund-${refund._id}` }
        });
        if (hasNotification) {
          continue;
        }

        const booking = await Booking.findById(refund.bookingId).populate('eventId');
        if (!booking || !booking.guestEmail) {
          continue;
        }

        const event = booking.eventId as any;
        const totalAmount = booking.totalAmount;

        const allCompleted = await Refund.find({
          paymentId: refund.paymentId,
          status: 'completed'
        });
        const totalRefunded = allCompleted.reduce((sum, r) => sum + r.amount, 0);
        const payment = await Payment.findById(refund.paymentId);
        const isFullRefund = payment ? totalRefunded === payment.amount : false;

        let emailHtml = '';
        let subject = '';
        let notificationType: NotificationType;

        if (isFullRefund) {
          const formattedRefundDate = new Date(refund.processedAt || new Date()).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          emailHtml = await fullRefundHtml({
            customerName: booking.guestName,
            bookingReference: booking.bookingId,
            eventTitle: event?.title || 'MAD Event',
            refundAmount: refund.amount,
            refundDate: formattedRefundDate,
            settlementTimeline: '5-7 business days',
            currency: booking.currency || 'INR',
          });
          subject = `Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.FULL_REFUND;
        } else {
          emailHtml = await partialRefundHtml({
            customerName: booking.guestName,
            bookingReference: booking.bookingId,
            originalAmount: totalAmount,
            refundAmount: refund.amount,
            remainingAmount: Math.max(0, totalAmount - totalRefunded),
            reason: refund.reason || 'Tier adjustment refund',
            currency: booking.currency || 'INR',
          });
          subject = `Partial Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.PARTIAL_REFUND;
        }

        const jobId = `refund-${refund._id}-retry`;

        await createNotificationSafe([{
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: notificationType,
          channel: 'email',
          recipient: booking.guestEmail,
          subject,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: event?._id
        }]);

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject,
            html: emailHtml,
            notificationType,
            bookingId: booking._id.toString(),
            eventId: event?._id?.toString() || booking.eventId.toString() || '',
          },
          jobId
        );

        recoveredCount++;
        logger.info({ refundId: refund._id }, 'Watchdog successfully recovered and enqueued orphaned refund notification.');
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to repair orphaned refund notification.');
      }
    }
    return recoveredCount;
  }

  private static async repairOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const booking of cancelledBookings) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: booking._id,
          type: NotificationType.EVENT_CANCELLED
        });
        if (hasNotification) {
          continue;
        }

        const event = await Event.findById(booking.eventId);
        if (!event) {
          continue;
        }

        const formattedDate = new Date(
          event.startDate || booking.createdAt
        ).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const emailBody = await eventCancellationHtml({
          customerName: booking.guestName,
          eventTitle: event.title || 'MAD Event',
          eventDate: formattedDate,
          venueName: event.venue || 'MAD Venue',
          bookingReference: booking.bookingId,
        });

        const jobId = `cancellation-${booking.bookingId}-retry`;

        await createNotificationSafe([{
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: NotificationType.EVENT_CANCELLED,
          channel: 'email',
          recipient: booking.guestEmail,
          subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: event._id,
        }]);

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
            html: emailBody,
            notificationType: NotificationType.EVENT_CANCELLED,
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
          },
          jobId
        );

        recoveredCount++;
        logger.info({ bookingId: booking._id }, 'Watchdog successfully recovered and enqueued orphaned cancellation notification.');
      } catch (error) {
        logger.error({ bookingId: booking._id, error }, 'Watchdog: Failed to repair orphaned cancellation notification.');
      }
    }
    return recoveredCount;
  }

  static async runRepairCycle(): Promise<ConsistencyReport> {
    const correlationId = `repair-cycle-${crypto.randomUUID().slice(0, 8)}`;
    return runWithContext({ correlationId }, async () => {
      const startTime = Date.now();
      const [
        expiredReservations,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
        repairedPaidPaymentMismatches,
        repairedStuckProcessingRefunds,
        repairedOrphanedRefundNotifications,
        repairedOrphanedCancellationNotifications,
      ] = await Promise.all([
        ReservationService.expireReservations(),
        SeatConsistencyService.cleanupPhantomRedisLocks(),
        SeatConsistencyService.repairStaleSeatReservations(),
        SeatConsistencyService.repairEventInventoryMismatches(),
        BookingConsistencyService.expireStaleBookings(),
        BookingConsistencyService.repairUnticketedConfirmedBookings(),
        NotificationConsistencyService.repairStuckNotifications(),
        NotificationConsistencyService.repairOrphanedConfirmedDeliveries(),
        ConsistencyService.repairPaidPaymentMismatches(),
        ConsistencyService.repairStuckProcessingRefunds(),
        ConsistencyService.repairOrphanedRefundNotifications(),
        ConsistencyService.repairOrphanedCancellationNotifications(),
      ]);

      const report = await this.generateReport();
      report.repairs = {
        expiredReservations: expiredReservations.length,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
        repairedPaidPaymentMismatches,
        repairedStuckProcessingRefunds,
        repairedOrphanedRefundNotifications,
        repairedOrphanedCancellationNotifications,
      } as any;

      const durationMs = Date.now() - startTime;

      const hasRepairs = expiredReservations.length > 0 ||
        phantomRedisLocks > 0 ||
        staleSeatReservations > 0 ||
        eventInventoryMismatchesRepaired > 0 ||
        logicallyExpiredBookings > 0 ||
        reEnqueuedUnticketedBookings > 0 ||
        resetStuckNotifications > 0 ||
        reEnqueuedOrphanedDeliveries > 0 ||
        repairedPaidPaymentMismatches > 0 ||
        repairedStuckProcessingRefunds > 0 ||
        repairedOrphanedRefundNotifications > 0 ||
        repairedOrphanedCancellationNotifications > 0;

      const context = getTraceContext();
      const isManual = !!(context?.userId || context?.sessionId);

      if (hasRepairs || isManual) {
        auditLog({
          action: 'CONSISTENCY_REPAIR_CYCLE',
          status: 'success',
          metadata: {
            durationMs,
            repairs: report.repairs,
            drift: report.drift,
            counts: report.counts,
          },
          description: `Consistency repair cycle finished in ${durationMs}ms with ${expiredReservations.length} expired reservations, ${phantomRedisLocks} phantom locks, ${staleSeatReservations} stale seats, ${eventInventoryMismatchesRepaired} inventory mismatches, ${resetStuckNotifications} stuck notifications, ${reEnqueuedOrphanedDeliveries} orphaned deliveries, ${repairedPaidPaymentMismatches} paid payment mismatches, ${repairedStuckProcessingRefunds} stuck refunds, ${repairedOrphanedRefundNotifications} orphaned refund emails, and ${repairedOrphanedCancellationNotifications} orphaned cancellation emails repaired.`,
        });
      }

      if (hasRepairs) {
        logger.warn({ report }, 'Consistency repair cycle completed with repairs');
        emitToAdmin('inventory', 'consistency:repaired', report);
        for (const [eventId, reservations] of ReservationService.groupByEvent(expiredReservations).entries()) {
          emitToEvent(eventId, 'inventory:sync-required', {
            eventId,
            reservationIds: reservations.map((reservation) => reservation.reservationId),
          });
        }
      }

      return report;
    });
  }

  static async generateReport(): Promise<ConsistencyReport> {
    const now = new Date();
    const [
      activeReservations,
      expiredReservations,
      redisLocks,
      awaitingPaymentBookings,
      orphanPayments,
      eventInventoryMismatches,
      unticketedConfirmedBookings,
      stuckNotifications,
      orphanedConfirmedDeliveries,
      paidPaymentMismatches,
      stuckProcessingRefunds,
      orphanedRefundNotifications,
      orphanedCancellationNotifications,
    ] = await Promise.all([
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] } }),
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }, expiresAt: { $lte: now } }),
      SeatConsistencyService.countRedisLocks(),
      Booking.countDocuments({ status: BookingStatus.AWAITING_PAYMENT }),
      Payment.countDocuments({ status: PaymentStatus.PENDING, bookingId: { $exists: false } }),
      SeatConsistencyService.countEventInventoryMismatches(),
      BookingConsistencyService.countUnticketedConfirmedBookings(),
      NotificationConsistencyService.countStuckNotifications(),
      NotificationConsistencyService.countOrphanedConfirmedDeliveries(),
      ConsistencyService.countPaidPaymentMismatches(),
      ConsistencyService.countStuckProcessingRefunds(),
      ConsistencyService.countOrphanedRefundNotifications(),
      ConsistencyService.countOrphanedCancellationNotifications(),
    ]);

    const staleSeatReservations = await Reservation.countDocuments({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    });

    return {
      generatedAt: now.toISOString(),
      counts: {
        activeReservations,
        expiredReservations,
        redisLocks,
        awaitingPaymentBookings,
        orphanPayments,
      },
      drift: {
        staleSeatReservations,
        phantomRedisLocks: 0,
        eventInventoryMismatches,
        unticketedConfirmedBookings,
        stuckNotifications,
        orphanedConfirmedDeliveries,
        paidPaymentMismatches,
        stuckProcessingRefunds,
        orphanedRefundNotifications,
        orphanedCancellationNotifications,
      } as any,
    };
  }
}

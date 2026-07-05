import crypto from 'crypto';

import { BookingStatus, PaymentStatus, ReservationStatus, NotificationType } from '@mad/shared';

import { getEnv } from '../config/env';
import { getQueueName } from '../config/queue.config';
import { emitToAdmin, emitToEvent } from '../config/socket';

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
import { RefundConsistencyService } from './consistency/refund-consistency.service';
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
        RefundConsistencyService.repairStuckProcessingRefunds(),
        RefundConsistencyService.repairOrphanedRefundNotifications(),
        RefundConsistencyService.repairOrphanedCancellationNotifications(),
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
      RefundConsistencyService.countStuckProcessingRefunds(),
      RefundConsistencyService.countOrphanedRefundNotifications(),
      RefundConsistencyService.countOrphanedCancellationNotifications(),
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

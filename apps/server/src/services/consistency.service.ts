import crypto from 'crypto';

import { BookingStatus, PaymentStatus, ReservationStatus } from '@mad/shared';

import { emitToAdmin, emitToEvent } from '../config/socket';
import { Booking } from '../models/booking.schema';
import { Payment } from '../models/payment.schema';
import { Reservation } from '../models/reservation.schema';
import { auditLog } from '../utils/audit';
import { runWithContext, getTraceContext } from '../utils/context';
import { logger } from '../utils/logger';
import { BookingConsistencyService } from './consistency/booking-consistency.service';
import { NotificationConsistencyService } from './consistency/notification-consistency.service';
import { PaymentConsistencyService } from './consistency/payment-consistency.service';
import { RefundConsistencyService } from './consistency/refund-consistency.service';
import { SeatConsistencyService } from './consistency/seat-consistency.service';
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
        PaymentConsistencyService.repairPaidPaymentMismatches(),
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
      PaymentConsistencyService.countPaidPaymentMismatches(),
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

import crypto from "crypto";

import { emitToAdmin, emitToEvent } from "../config/socket";
import { auditLog } from "../utils/audit";
import { runWithContext, getTraceContext } from "../utils/context";
import { logger } from "../utils/logger";
import { BookingConsistencyService } from "./consistency/booking-consistency.service";
import { ConsistencyReportService } from "./consistency/consistency-report.service";
import type {
  ConsistencyReport,
  ConsistencyRepairOptions,
} from "./consistency/consistency.types";
import { NotificationConsistencyService } from "./consistency/notification-consistency.service";
import { PaymentConsistencyService } from "./consistency/payment-consistency.service";
import { RefundConsistencyService } from "./consistency/refund-consistency.service";
import { SeatConsistencyService } from "./consistency/seat-consistency.service";
import { ReservationService } from "./reservation.service";

export type { ConsistencyReport, ConsistencyRepairOptions };

export class ConsistencyService {
  static async runFastExpirationCycle(): Promise<{
    expiredReservations: number;
    phantomRedisLocks: number;
    logicallyExpiredBookings: number;
  }> {
    const [expiredReservations, phantomRedisLocks, logicallyExpiredBookings] =
      await Promise.all([
        ReservationService.expireReservations(),
        SeatConsistencyService.cleanupPhantomRedisLocks(),
        BookingConsistencyService.expireStaleBookings(),
      ]);

    if (expiredReservations.length > 0) {
      for (const [eventId, reservations] of ReservationService.groupByEvent(
        expiredReservations,
      ).entries()) {
        emitToEvent(eventId, "inventory:sync-required", {
          eventId,
          reservationIds: reservations.map((r) => r.reservationId),
        });
      }
    }

    return {
      expiredReservations: expiredReservations.length,
      phantomRedisLocks,
      logicallyExpiredBookings,
    };
  }

  static async runStandardReconciliationCycle(): Promise<{
    repairedPaidPaymentMismatches: number;
    repairedStuckProcessingRefunds: number;
    repairedOrphanedRefundNotifications: number;
    repairedOrphanedCancellationNotifications: number;
    eventInventoryMismatchesRepaired: number;
    staleSeatReservations: number;
    reEnqueuedUnticketedBookings: number;
    resetStuckNotifications: number;
    reEnqueuedOrphanedDeliveries: number;
  }> {
    const [
      repairedPaidPaymentMismatches,
      repairedStuckProcessingRefunds,
      repairedOrphanedRefundNotifications,
      repairedOrphanedCancellationNotifications,
      eventInventoryMismatchesRepaired,
      staleSeatReservations,
      reEnqueuedUnticketedBookings,
      resetStuckNotifications,
      reEnqueuedOrphanedDeliveries,
    ] = await Promise.all([
      PaymentConsistencyService.repairPaidPaymentMismatches({ level: 1 }),
      RefundConsistencyService.repairStuckProcessingRefunds(),
      RefundConsistencyService.repairOrphanedRefundNotifications({
        window: "recent",
      }),
      RefundConsistencyService.repairOrphanedCancellationNotifications({
        window: "recent",
      }),
      SeatConsistencyService.repairEventInventoryMismatches(),
      SeatConsistencyService.repairStaleSeatReservations(),
      BookingConsistencyService.repairUnticketedConfirmedBookings(),
      NotificationConsistencyService.repairStuckNotifications(),
      NotificationConsistencyService.repairOrphanedConfirmedDeliveries(),
    ]);

    return {
      repairedPaidPaymentMismatches,
      repairedStuckProcessingRefunds,
      repairedOrphanedRefundNotifications,
      repairedOrphanedCancellationNotifications,
      eventInventoryMismatchesRepaired,
      staleSeatReservations,
      reEnqueuedUnticketedBookings,
      resetStuckNotifications,
      reEnqueuedOrphanedDeliveries,
    };
  }

  static async runHistoricalCatchUpCycle(): Promise<{
    repairedPaidPaymentMismatches: number;
    repairedOrphanedRefundNotifications: number;
    repairedOrphanedCancellationNotifications: number;
  }> {
    const [
      repairedPaidPaymentMismatches,
      repairedOrphanedRefundNotifications,
      repairedOrphanedCancellationNotifications,
    ] = await Promise.all([
      PaymentConsistencyService.repairPaidPaymentMismatches({ level: 2 }),
      RefundConsistencyService.repairOrphanedRefundNotifications({
        window: "durable",
      }),
      RefundConsistencyService.repairOrphanedCancellationNotifications({
        window: "durable",
      }),
    ]);

    return {
      repairedPaidPaymentMismatches,
      repairedOrphanedRefundNotifications,
      repairedOrphanedCancellationNotifications,
    };
  }

  static async runRepairCycle(
    options: ConsistencyRepairOptions = {},
  ): Promise<ConsistencyReport> {
    const correlationId = `repair-cycle-${crypto.randomUUID().slice(0, 8)}`;
    return runWithContext({ correlationId }, async () => {
      const startTime = Date.now();
      const [fast, standard] = await Promise.all([
        this.runFastExpirationCycle(),
        this.runStandardReconciliationCycle(),
      ]);

      const repairs = {
        expiredReservations: fast.expiredReservations,
        phantomRedisLocks: fast.phantomRedisLocks,
        staleSeatReservations: standard.staleSeatReservations,
        eventInventoryMismatchesRepaired:
          standard.eventInventoryMismatchesRepaired,
        logicallyExpiredBookings: fast.logicallyExpiredBookings,
        reEnqueuedUnticketedBookings: standard.reEnqueuedUnticketedBookings,
        resetStuckNotifications: standard.resetStuckNotifications,
        reEnqueuedOrphanedDeliveries: standard.reEnqueuedOrphanedDeliveries,
        repairedPaidPaymentMismatches: standard.repairedPaidPaymentMismatches,
        repairedStuckProcessingRefunds: standard.repairedStuckProcessingRefunds,
        repairedOrphanedRefundNotifications:
          standard.repairedOrphanedRefundNotifications,
        repairedOrphanedCancellationNotifications:
          standard.repairedOrphanedCancellationNotifications,
      };

      const durationMs = Date.now() - startTime;
      const report: ConsistencyReport = options.includeReport
        ? { ...(await this.generateReport()), repairs }
        : { generatedAt: new Date().toISOString(), repairs };

      const hasRepairs = Object.values(repairs).some(
        (count) => (count || 0) > 0,
      );
      const isManual = !!getTraceContext()?.userId;

      if (hasRepairs || isManual) {
        auditLog({
          action: "CONSISTENCY_REPAIR_CYCLE",
          status: "success",
          metadata: {
            durationMs,
            repairs: report.repairs,
            drift: report.drift,
            counts: report.counts,
          },
          description: `Consistency repair cycle finished in ${durationMs}ms.`,
        });
      }

      if (hasRepairs) {
        logger.warn(
          { report },
          "Consistency repair cycle completed with repairs",
        );
        emitToAdmin("inventory", "consistency:repaired", report);
      }

      return report;
    });
  }

  static async generateReport(): Promise<ConsistencyReport> {
    return await ConsistencyReportService.generateReport();
  }
}

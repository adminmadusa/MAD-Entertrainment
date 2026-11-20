import { BookingStatus, PaymentStatus, ReservationStatus } from "@mad/shared";

import { Booking } from "../../models/booking.schema";
import { Payment } from "../../models/payment.schema";
import { Reservation } from "../../models/reservation.schema";
import { BookingConsistencyService } from "./booking-consistency.service";
import type { ConsistencyReport } from "./consistency.types";
import { NotificationConsistencyService } from "./notification-consistency.service";
import { PaymentConsistencyService } from "./payment-consistency.service";
import { RefundConsistencyService } from "./refund-consistency.service";
import { SeatConsistencyService } from "./seat-consistency.service";

export class ConsistencyReportService {
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
      unknownTimestampPayments,
      stuckProcessingRefunds,
      orphanedRefundNotifications,
      orphanedCancellationNotifications,
    ] = await Promise.all([
      Reservation.countDocuments({
        status: {
          $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT],
        },
      }),
      Reservation.countDocuments({
        status: {
          $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT],
        },
        expiresAt: { $lte: now },
      }),
      SeatConsistencyService.countRedisLocks(),
      Booking.countDocuments({ status: BookingStatus.AWAITING_PAYMENT }),
      Payment.countDocuments({
        status: PaymentStatus.PENDING,
        bookingId: { $exists: false },
      }),
      SeatConsistencyService.countEventInventoryMismatches(),
      BookingConsistencyService.countUnticketedConfirmedBookings(),
      NotificationConsistencyService.countStuckNotifications(),
      NotificationConsistencyService.countOrphanedConfirmedDeliveries(),
      PaymentConsistencyService.countPaidPaymentMismatches(),
      PaymentConsistencyService.countUnknownTimestampPayments(),
      RefundConsistencyService.countStuckProcessingRefunds(),
      RefundConsistencyService.countOrphanedRefundNotifications(),
      RefundConsistencyService.countOrphanedCancellationNotifications(),
    ]);

    const staleSeatReservations = await Reservation.countDocuments({
      status: {
        $in: [
          ReservationStatus.EXPIRED,
          ReservationStatus.FAILED,
          ReservationStatus.CANCELLED,
        ],
      },
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
        unknownTimestampPayments,
        exhaustedPaymentRetries:
          PaymentConsistencyService.countExhaustedPaymentRetries(),
        stuckProcessingRefunds,
        orphanedRefundNotifications,
        orphanedCancellationNotifications,
      } as any,
    };
  }
}

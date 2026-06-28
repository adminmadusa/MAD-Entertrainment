/**
 * PaymentInventoryService
 *
 * Extracted from PaymentService and PaymentRefundService as part of ARCH-001 Phase 4.
 *
 * Centralizes all direct database operations on capacity and layouts during
 * the payment confirmation and failure workflows.
 *
 * Operations:
 *   - validateLateRecoveryCapacity      — validations for expired/late booking recoveries
 *   - allocateSeats                     — SeatLayout status update to BOOKED (transaction-aware)
 *   - allocateEventCapacity             — Event soldCount increments and reservedCount decrements
 *   - releaseInventoryForFailedPayment  — release reservations and unlock seats upon payment failure
 *
 * Governance: ARCH-001 Phase 4 — strictly payment-related. Admin booking logic is untouched.
 */

import { ClientSession } from 'mongoose';
import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { ReservationService } from '../reservation.service';
import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { logger } from '../../utils/logger';

export class PaymentInventoryService {
  // ─── Late Recovery Capacity Validation ──────────────────────────────────────

  /**
   * Validates general capacity, tier capacity, and seat status during late recovery.
   * Throws errors if limits are exceeded.
   */
  static async validateLateRecoveryCapacity(
    booking: IBooking,
    event: any,
    allSeatIds: string[],
    session: ClientSession
  ): Promise<void> {
    // 1. General capacity check
    if (event.soldCount + event.reservedCount + booking.totalTickets > event.totalCapacity) {
      throw new Error('EVENT_EXPIRED_DURING_CONFIRMATION');
    }

    // 2. Tier capacity check
    for (const bookedTicket of booking.tickets) {
      const tierConfig = event.ticketTiers.find((t: any) => t.tier === bookedTicket.tier);
      if (!tierConfig) {
        throw new Error('EVENT_EXPIRED_DURING_CONFIRMATION');
      }

      // Fetch active reservations count for this specific tier
      const activeTierAgg = await Reservation.aggregate([
        {
          $match: {
            eventId: event._id,
            tier: bookedTicket.tier,
            status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }
          }
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]).session(session);
      const tierReserved = activeTierAgg[0]?.total ?? 0;

      if (tierConfig.soldCount + tierReserved + bookedTicket.quantity * (tierConfig.groupSize || 1) > tierConfig.totalCapacity) {
        throw new Error('EVENT_EXPIRED_DURING_CONFIRMATION');
      }
    }

    // 3. Seats status check
    if (event.bookingMode === 'seat_based' && allSeatIds.length > 0) {
      const layoutQuery = SeatLayout.findOne({
        eventId: event._id,
        seats: {
          $elemMatch: {
            seatId: { $in: allSeatIds },
            status: { $ne: SeatStatus.AVAILABLE }
          }
        }
      }).session(session);
      const layout = await (layoutQuery && typeof layoutQuery.lean === 'function' ? layoutQuery.lean() : layoutQuery);
      if (layout) {
        throw new Error('SEAT_ALLOCATION_FAILED');
      }
    }
  }

  // ─── Seat Allocation ────────────────────────────────────────────────────────

  /**
   * Atomic seat status transition (LOCKED/AVAILABLE -> BOOKED) in SeatLayout.
   * Throws SEAT_ALLOCATION_FAILED if modifiedCount mismatch occurs.
   */
  static async allocateSeats(
    booking: IBooking,
    event: any,
    allSeatIds: string[],
    session: ClientSession
  ): Promise<void> {
    if (event.bookingMode === 'seat_based' && allSeatIds.length > 0) {
      const seatUpdateResult = await SeatLayout.updateOne(
        { eventId: event._id },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.BOOKED,
            'seats.$[seat].bookedByBookingId': booking._id.toString()
          },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
          },
          $inc: {
            'seats.$[seat].seatVersion': 1,
          },
        },
        {
          arrayFilters: [
            {
              'seat.seatId': { $in: allSeatIds },
              $or: [
                { 'seat.bookedByBookingId': booking._id.toString() },
                { 'seat.status': SeatStatus.AVAILABLE }
              ]
            },
          ],
          session,
        }
      );

      if (seatUpdateResult.modifiedCount !== allSeatIds.length) {
        throw new Error('SEAT_ALLOCATION_FAILED');
      }
    }
  }

  // ─── Event Capacity Allocation ──────────────────────────────────────────────

  /**
   * Atomically increments soldCount and decrements reservedCount on the Event.
   * Throws EVENT_CAPACITY_ALLOCATION_FAILED if updated document is not returned.
   */
  static async allocateEventCapacity(
    booking: IBooking,
    event: any,
    isLateRecovery: boolean,
    session: ClientSession
  ): Promise<any> {
    const eventQuery: any = { _id: event._id };
    const incUpdate: Record<string, number> = {
      soldCount: booking.totalTickets,
      eventVersion: 1,
    };

    for (const bookedTicket of booking.tickets) {
      const tierIndex = event.ticketTiers.findIndex((t: any) => t.tier === bookedTicket.tier);
      if (tierIndex !== -1) {
        const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
        incUpdate[`ticketTiers.${tierIndex}.soldCount`] = bookedTicket.quantity * groupSize;
      }
    }

    if (isLateRecovery) {
      eventQuery.$expr = {
        $lte: [
          { $add: ['$soldCount', '$reservedCount', booking.totalTickets] },
          '$totalCapacity'
        ]
      };

      for (const bookedTicket of booking.tickets) {
        const tierIndex = event.ticketTiers.findIndex((t: any) => t.tier === bookedTicket.tier);
        if (tierIndex !== -1) {
          const activeTierAgg = await Reservation.aggregate([
            {
              $match: {
                eventId: event._id,
                tier: bookedTicket.tier,
                status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }
              }
            },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
          ]).session(session);
          const tierReserved = activeTierAgg[0]?.total ?? 0;

          const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
          eventQuery[`ticketTiers.${tierIndex}.soldCount`] = {
            $lte: event.ticketTiers[tierIndex].totalCapacity - tierReserved - bookedTicket.quantity * groupSize
          };
        }
      }
    } else {
      incUpdate.reservedCount = -booking.totalTickets;
    }

    const updatedEvent = await Event.findOneAndUpdate(
      eventQuery,
      { $inc: incUpdate },
      { new: true, session }
    );

    if (!updatedEvent) {
      throw new Error('EVENT_CAPACITY_ALLOCATION_FAILED');
    }

    return updatedEvent;
  }

  // ─── Payment Failure Seat & Reservation Release ────────────────────────────

  /**
   * Releases seat layout locks, transitions reservations to FAILED, releases capacity,
   * and emits socket events to clients and admins.
   */
  static async releaseInventoryForFailedPayment(
    booking: IBooking,
    payment: IPayment,
    reason: string
  ): Promise<void> {
    booking.status = BookingStatus.FAILED;
    booking.bookingVersion += 1;
    await booking.save();

    const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
      paymentReference: payment.gatewayPaymentId ?? payment.gatewayOrderId,
      paymentId: payment._id as any,
      reason,
      correlationId: booking.bookingId,
    });
    await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

    const event = await Event.findById(booking.eventId);
    const releasedSeatIds: string[] = [];

    if (event && event.bookingMode === 'seat_based') {
      const allSeatIds = booking.tickets.flatMap((ticket) => ticket.seats || []).map((seat) => seat.seatId);
      if (allSeatIds.length > 0) {
        await SeatLayout.updateOne(
          { eventId: event._id },
          {
            $set: {
              'seats.$[seat].status': SeatStatus.AVAILABLE,
            },
            $unset: {
              'seats.$[seat].lockedBy': '',
              'seats.$[seat].lockedAt': '',
              'seats.$[seat].bookedByBookingId': '',
              'seats.$[seat].reservationId': '',
            },
            $inc: {
              'seats.$[seat].seatVersion': 1,
            },
          },
          {
            arrayFilters: [
              {
                'seat.seatId': { $in: allSeatIds },
                'seat.status': SeatStatus.LOCKED,
                'seat.bookedByBookingId': booking._id.toString(),
              },
            ],
          }
        );
        releasedSeatIds.push(...allSeatIds);
      }
    }

    if (event && releasedSeatIds.length > 0) {
      PaymentInventoryService.safeEmit(
        'seat:unlocked',
        () => emitToEvent(event._id.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }, booking.bookingId),
        { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: releasedSeatIds }
      );
    }

    PaymentInventoryService.safeEmit(
      'booking:updated',
      () => emitToBooking(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    PaymentInventoryService.safeEmit(
      'admin booking:updated',
      () => emitToAdmin('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
  }

  // ─── Socket Utility ─────────────────────────────────────────────────────────

  private static safeEmit(label: string, emit: () => void, data: Record<string, unknown>) {
    try {
      emit();
    } catch (err) {
      logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
    }
  }
}

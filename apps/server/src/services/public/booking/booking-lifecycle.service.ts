import { ClientSession, Types } from 'mongoose';

import {
  BookingStatus,
  ReservationStatus,
  SeatStatus,
  PaymentStatus,
} from '@mad/shared';

import { AppError } from '../../../middleware/error.middleware';
import { Booking } from '../../../models/booking.schema';
import { Coupon } from '../../../models/coupon.schema';
import { Event } from '../../../models/event.schema';
import { Payment } from '../../../models/payment.schema';
import { SeatLayout } from '../../../models/seat-layout.schema';
import { Ticket } from '../../../models/ticket.schema';
import { logger } from '../../../utils/logger';
import { runInTransaction } from '../../../utils/transaction';
import { ReservationService } from '../../reservation.service';
import {
  BookingSideEffectsService,
  CancelBookingPostCommitPayload,
} from './booking-side-effects.service';
import { cancelSpecificTicketsHelper } from './booking-ticket-cancellation.helper';

export type { CancelBookingPostCommitPayload };

export class BookingLifecycleService {
  static executeCancelBookingSideEffects =
    BookingSideEffectsService.executeCancelBookingSideEffects;
  static executeExpireBookingSideEffects =
    BookingSideEffectsService.executeExpireBookingSideEffects;

  static async cancelBooking(
    id: string,
    reason?: string,
    externalSession?: ClientSession,
    targetStatus: BookingStatus = BookingStatus.CANCELLED,
    actor?: { id: string; role: string }
  ): Promise<any> {
    const execute = async (session: ClientSession | undefined) => {
      const booking = await Booking.findById(id).session(session || null);
      if (!booking) {
        throw AppError.notFound('Booking not found');
      }

      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.FAILED ||
        booking.status === BookingStatus.REFUNDED
      ) {
        throw AppError.badRequest(`Booking is already in a terminal state: ${booking.status}`);
      }

      if (actor && actor.role !== 'super_admin') {
        const scannedTickets = await Ticket.find({
          bookingId: booking._id,
          scannedAt: { $ne: null },
        }).session(session || null);
        if ((scannedTickets as any[]).length > 0) {
          throw AppError.badRequest(
            'Cancellation blocked: Booking contains checked-in tickets. Only super_admin can cancel bookings with checked-in tickets.'
          );
        }
      }

      const previousStatus = booking.status;

      // 1. Update Booking Status
      booking.status = targetStatus;
      booking.cancellationReason =
        reason ||
        (targetStatus === BookingStatus.REFUNDED
          ? 'Admin Refund Processed'
          : 'Admin cancelled');
      booking.cancelledAt = new Date();
      booking.bookingVersion += 1;
      if (booking.expiresAt) {
        booking.expiresAt = undefined;
      }
      await booking.save({ session });

      // Decrement Coupon usedCount only if the booking was confirmed/redeemed
      if (
        booking.couponId &&
        (previousStatus === BookingStatus.CONFIRMED || booking.confirmedAt)
      ) {
        try {
          await Coupon.updateOne(
            { _id: booking.couponId, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { session }
          );
        } catch (err) {
          logger.warn(
            { err, bookingId: booking._id, couponId: booking.couponId },
            'cancelBooking: Failed to decrement coupon usedCount (possibly coupon was deleted)'
          );
        }
      }

      // 1.5 Sync Payment Status if cancelled
      if (booking.paymentId && targetStatus === BookingStatus.CANCELLED) {
        await Payment.findByIdAndUpdate(
          booking.paymentId,
          { status: PaymentStatus.CANCELLED },
          { session }
        );
      }

      // 2. Transition corresponding reservations
      const targetReservationStatus =
        targetStatus === BookingStatus.REFUNDED
          ? ReservationStatus.REFUNDED
          : ReservationStatus.CANCELLED;

      const transitioned = await ReservationService.transitionForBooking(
        booking._id,
        targetReservationStatus,
        {
          reason:
            reason ||
            (targetStatus === BookingStatus.REFUNDED
              ? 'Admin Refund Processed'
              : 'Admin cancelled'),
          correlationId: booking.bookingId,
        },
        session
      );

      // 3. Update Event Statistics based on status
      const event = await Event.findById(booking.eventId).session(session || null);
      if (event) {
        if (previousStatus === BookingStatus.CONFIRMED) {
          const decUpdate: Record<string, number> = {
            soldCount: -booking.totalTickets,
            eventVersion: 1,
          };

          for (const bookedTicket of booking.tickets) {
            const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
            if (tierIndex !== -1) {
              const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
              decUpdate[`ticketTiers.${tierIndex}.soldCount`] =
                -bookedTicket.quantity * groupSize;
            }
          }

          const nextSoldCount = Math.max(0, (event.soldCount || 0) - booking.totalTickets);
          const shouldBeSoldOut =
            event.totalCapacity > 0 && nextSoldCount >= event.totalCapacity;

          await Event.findOneAndUpdate(
            { _id: booking.eventId },
            { $inc: decUpdate, $set: { isSoldOut: shouldBeSoldOut } },
            { new: true, session }
          );
        } else if (previousStatus === BookingStatus.AWAITING_PAYMENT) {
          await ReservationService.releaseCapacityForTerminalReservations(transitioned, session);
        }
      }

      // 4. Release Seat Layout if seat-based event
      const releasedSeatIds: string[] = [];
      if (event && event.bookingMode === 'seat_based') {
        const allSeatIds = booking.tickets
          .flatMap((ticket) => ticket.seats || [])
          .map((seat) => seat.seatId);
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
                  $or: [
                    { 'seat.bookedByBookingId': booking._id.toString() },
                    { 'seat.reservationId': { $in: booking.reservationIds || [] } },
                  ],
                },
              ],
              session,
            }
          );
          releasedSeatIds.push(...allSeatIds);
        }
      }

      // 5. Void corresponding active tickets
      await Ticket.updateMany(
        { bookingId: booking._id, status: 'active' },
        { $set: { status: 'voided' } },
        { session }
      );

      const postCommitPayload: CancelBookingPostCommitPayload = {
        bookingId: booking._id.toString(),
        bookingRef: booking.bookingId,
        bookingStatus: booking.status,
        bookingVersion: booking.bookingVersion,
        eventId: event?._id?.toString() || booking.eventId.toString(),
        eventTitle: event?.title || 'MAD Event',
        eventVenue: event?.venue || 'MAD Venue',
        eventStartDate: event?.startDate,
        guestEmail: booking.guestEmail,
        guestName: booking.guestName,
        bookingCreatedAt: booking.createdAt,
        reason: booking.cancellationReason || '',
        releasedSeatIds,
        actorId: actor?.id,
        shouldSendCancellationEmail:
          targetStatus === BookingStatus.CANCELLED && !!booking.guestEmail,
      };

      return { booking, postCommitPayload };
    };

    if (externalSession) {
      return execute(externalSession);
    }

    const result = await runInTransaction(execute);
    if (result) {
      await BookingSideEffectsService.executeCancelBookingSideEffects(result.postCommitPayload);
      return result.booking;
    }
    return null;
  }

  static async expireBooking(
    id: string,
    reason?: string,
    externalSession?: ClientSession
  ): Promise<any> {
    const execute = async (session: ClientSession | undefined) => {
      const booking = await Booking.findById(id).session(session || null);
      if (!booking) {
        throw AppError.notFound('Booking not found');
      }

      if (booking.status === BookingStatus.EXPIRED) {
        return { booking, releasedSeatIds: [], wasAlreadyExpired: true };
      }

      if (
        booking.status !== BookingStatus.AWAITING_PAYMENT &&
        booking.status !== BookingStatus.EXPIRING &&
        booking.status !== BookingStatus.PENDING
      ) {
        throw AppError.badRequest(`Cannot expire booking in status: ${booking.status}`);
      }

      const previousStatus = booking.status;

      booking.status = BookingStatus.EXPIRED;
      booking.cancellationReason = reason || 'Reservation expired';
      booking.cancelledAt = new Date();
      booking.bookingVersion += 1;
      if (booking.expiresAt) {
        booking.expiresAt = undefined;
      }
      await booking.save({ session });

      const transitioned = await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.EXPIRED,
        {
          reason: reason || 'Reservation expired',
          correlationId: booking.bookingId,
        },
        session
      );

      const event = await Event.findById(booking.eventId).session(session || null);
      if (event) {
        if (
          previousStatus === BookingStatus.AWAITING_PAYMENT ||
          previousStatus === BookingStatus.EXPIRING ||
          previousStatus === BookingStatus.PENDING
        ) {
          await ReservationService.releaseCapacityForTerminalReservations(transitioned, session);
        }
      }

      const releasedSeatIds: string[] = [];
      if (event && event.bookingMode === 'seat_based') {
        const allSeatIds = booking.tickets
          .flatMap((ticket) => ticket.seats || [])
          .map((seat) => seat.seatId);
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
                  $or: [
                    { 'seat.bookedByBookingId': booking._id.toString() },
                    { 'seat.reservationId': { $in: booking.reservationIds || [] } },
                  ],
                },
              ],
              session,
            }
          );
          releasedSeatIds.push(...allSeatIds);
        }
      }

      return { booking, releasedSeatIds };
    };

    if (externalSession) {
      const res = await execute(externalSession);
      return res.wasAlreadyExpired ? null : res.booking;
    }

    const result = await runInTransaction(execute);
    if (result) {
      await BookingSideEffectsService.executeExpireBookingSideEffects(
        result.booking,
        result.releasedSeatIds,
        result.wasAlreadyExpired
      );
      return result.wasAlreadyExpired ? null : result.booking;
    }
    return null;
  }

  static async cancelSpecificTickets(
    bookingId: string | Types.ObjectId,
    ticketIds: string[],
    actor: { id: string; role: string },
    session?: ClientSession
  ) {
    return cancelSpecificTicketsHelper(bookingId, ticketIds, actor, session);
  }
}

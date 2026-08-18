import { ClientSession, Types } from 'mongoose';

import { BookingStatus, ReservationStatus, SeatStatus, PaymentStatus, NotificationType } from '@mad/shared';

import { getQueueName } from '../../../config/queue.config';
import { emitToAdmin, emitToEvent, emitToBooking } from '../../../config/socket';
import { eventCancellationHtml } from '../../../lib/email';
import { AppError } from '../../../middleware/error.middleware';
import { Booking } from '../../../models/booking.schema';
import { Coupon } from '../../../models/coupon.schema';
import { Event } from '../../../models/event.schema';
import { Notification } from '../../../models/notification.schema';
import { Payment } from '../../../models/payment.schema';
import { SeatLayout } from '../../../models/seat-layout.schema';
import { Ticket } from '../../../models/ticket.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { runInTransaction } from '../../../utils/transaction';
import { CacheService } from '../../cache.service';
import { createNotificationSafe } from '../../notification.service';
import { QueueService } from '../../queue.service';
import { ReservationService } from '../../reservation.service';

export interface CancelBookingPostCommitPayload {
  bookingId: string;
  bookingRef: string;
  bookingStatus: string;
  bookingVersion: number;
  eventId: string;
  eventTitle: string;
  eventVenue: string;
  eventStartDate: Date | string | undefined;
  guestEmail: string;
  guestName: string;
  bookingCreatedAt: Date | string;
  reason: string;
  releasedSeatIds: string[];
  shouldSendCancellationEmail: boolean;
  actorId?: string;
}

export class BookingLifecycleService {
  static async executeCancelBookingSideEffects(payload: CancelBookingPostCommitPayload) {
    const actions = [
      // 1. Cache Service Deletion
      async () => {
        await CacheService.delPattern('events:*');
      },
      // 2. Real-time updates via WebSockets (Seat unlocked)
      async () => {
        if (payload.releasedSeatIds && payload.releasedSeatIds.length > 0) {
          emitToEvent(payload.eventId, 'seat:unlocked', { seatIds: payload.releasedSeatIds }, payload.bookingRef);
        }
      },
      // 3. Emit update to Booking socket
      async () => {
        emitToBooking(
          payload.bookingId,
          'booking:updated',
          { bookingId: payload.bookingId, status: payload.bookingStatus, bookingVersion: payload.bookingVersion },
          payload.bookingRef
        );
      },
      // 4. Emit update to Admin socket
      async () => {
        emitToAdmin(
          'bookings',
          'booking:updated',
          { bookingId: payload.bookingId, status: payload.bookingStatus, bookingVersion: payload.bookingVersion },
          payload.bookingRef
        );
      },
      // 5. Audit Logging
      async () => {
        auditLog({
          action: payload.bookingStatus === BookingStatus.REFUNDED ? 'BOOKING_REFUNDED' : 'BOOKING_CANCELLED',
          actor: { type: 'admin', id: payload.actorId || 'system' },
          status: 'success',
          metadata: {
            bookingId: payload.bookingId,
            bookingReference: payload.bookingRef,
            eventId: payload.eventId,
            reason: payload.reason,
            releasedSeatIds: payload.releasedSeatIds,
          },
          description: payload.bookingStatus === BookingStatus.REFUNDED
            ? `Refunded booking ${payload.bookingRef} and released associated capacity/seats`
            : `Cancelled booking ${payload.bookingRef} and released associated capacity/seats`,
        });
      },
      // 6. Asynchronous, exception-safe Event Cancellation Email Trigger
      async () => {
        if (payload.shouldSendCancellationEmail) {
          const existingNotification = await Notification.findOne({
            type: NotificationType.EVENT_CANCELLED,
            bookingId: payload.bookingId
          });

          if (!existingNotification) {
            const formattedDate = new Date(
              payload.eventStartDate || payload.bookingCreatedAt
            ).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            const emailBody = await eventCancellationHtml({
              customerName: payload.guestName,
              eventTitle: payload.eventTitle || 'MAD Event',
              eventDate: formattedDate,
              venueName: payload.eventVenue || 'MAD Venue',
              bookingReference: payload.bookingRef,
            });

            const jobId = `cancellation-${payload.bookingRef}-${Date.now()}`;

            await createNotificationSafe([{
              jobId,
              status: 'queued',
              queuedAt: new Date(),
              type: NotificationType.EVENT_CANCELLED,
              channel: 'email',
              recipient: payload.guestEmail,
              subject: `Event Cancelled: ${payload.eventTitle || 'MAD Event'}`,
              isSent: false,
              retryCount: 0,
              bookingId: payload.bookingId,
              eventId: payload.eventId
            }]);

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: payload.guestEmail,
                subject: `Event Cancelled: ${payload.eventTitle || 'MAD Event'}`,
                html: emailBody,
                notificationType: NotificationType.EVENT_CANCELLED,
                bookingId: payload.bookingId,
                eventId: payload.eventId,
              },
              jobId
            );

            logger.info({
              emailType: 'EVENT_CANCELLED',
              recipient: payload.guestEmail,
              bookingId: payload.bookingId,
              eventId: payload.eventId,
              timestamp: new Date().toISOString(),
              success: true
            }, 'Event cancellation email queued successfully.');
          } else {
            logger.info({ bookingId: payload.bookingId }, 'Event cancellation email already queued or sent; skipping duplicate.');
          }
        }
      }
    ];

    for (const action of actions) {
      try {
        await action();
      } catch (err: any) {
        logger.error({ err }, 'Error executing booking cancel post-commit side effect');
      }
    }
  }

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
        const scannedTickets = await Ticket.find({ bookingId: booking._id, scannedAt: { $ne: null } }).session(session || null);
        if ((scannedTickets as any[]).length > 0) {
          throw AppError.badRequest('Cancellation blocked: Booking contains checked-in tickets. Only super_admin can cancel bookings with checked-in tickets.');
        }
      }

      const previousStatus = booking.status;

      // 1. Update Booking Status
      booking.status = targetStatus;
      booking.cancellationReason = reason || (targetStatus === BookingStatus.REFUNDED ? 'Admin Refund Processed' : 'Admin cancelled');
      booking.cancelledAt = new Date();
      booking.bookingVersion += 1;
      if (booking.expiresAt) {
        booking.expiresAt = undefined;
      }
      await booking.save({ session });

      // Decrement Coupon usedCount only if the booking was confirmed/redeemed
      if (booking.couponId && (previousStatus === BookingStatus.CONFIRMED || booking.confirmedAt)) {
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
      const targetReservationStatus = targetStatus === BookingStatus.REFUNDED
        ? ReservationStatus.REFUNDED
        : ReservationStatus.CANCELLED;

      const transitioned = await ReservationService.transitionForBooking(
        booking._id,
        targetReservationStatus,
        {
          reason: reason || (targetStatus === BookingStatus.REFUNDED ? 'Admin Refund Processed' : 'Admin cancelled'),
          correlationId: booking.bookingId,
        },
        session
      );

      // 3. Update Event Statistics based on status
      const event = await Event.findById(booking.eventId).session(session || null);
      if (event) {
        if (previousStatus === BookingStatus.CONFIRMED) {
          // Decrease soldCount properties
          const decUpdate: Record<string, number> = {
            soldCount: -booking.totalTickets,
            eventVersion: 1,
          };

          for (const bookedTicket of booking.tickets) {
            const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
            if (tierIndex !== -1) {
              const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
              decUpdate[`ticketTiers.${tierIndex}.soldCount`] = -bookedTicket.quantity * groupSize;
            }
          }

          const nextSoldCount = Math.max(0, (event.soldCount || 0) - booking.totalTickets);
          const shouldBeSoldOut = event.totalCapacity > 0 && nextSoldCount >= event.totalCapacity;

          await Event.findOneAndUpdate(
            { _id: booking.eventId },
            { $inc: decUpdate, $set: { isSoldOut: shouldBeSoldOut } },
            { new: true, session }
          );
        } else if (previousStatus === BookingStatus.AWAITING_PAYMENT) {
          // Decrement reservedCount since it was never confirmed
          await ReservationService.releaseCapacityForTerminalReservations(transitioned, session);
        }
      }

      // 4. Release Seat Layout if seat-based event
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
                  $or: [
                    { 'seat.bookedByBookingId': booking._id.toString() },
                    { 'seat.reservationId': { $in: booking.reservationIds || [] } }
                  ]
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
        shouldSendCancellationEmail: targetStatus === BookingStatus.CANCELLED && !!booking.guestEmail,
      };

      return { booking, postCommitPayload };
    };

    if (externalSession) {
      return execute(externalSession);
    }

    const result = await runInTransaction(execute);
    if (result) {
      await this.executeCancelBookingSideEffects(result.postCommitPayload);
      return result.booking;
    }
    return null;
  }

  static async executeExpireBookingSideEffects(booking: any, releasedSeatIds: string[], wasAlreadyExpired?: boolean) {
    if (wasAlreadyExpired) return;
    try {
      if (releasedSeatIds && releasedSeatIds.length > 0) {
        emitToEvent(booking.eventId.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }, booking.bookingId);
      }

      emitToBooking(
        booking._id.toString(),
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );

      emitToAdmin(
        'bookings',
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );

      auditLog({
        action: 'BOOKING_EXPIRED',
        actor: { type: 'system', id: 'system' },
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          eventId: booking.eventId.toString(),
          releasedSeatIds,
        },
        description: `Expired booking ${booking.bookingId} due to payment timeout and released associated capacity/seats`,
      });
    } catch (err: any) {
      logger.error({ err }, 'Error executing booking expire post-commit side effects');
    }
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

      // 1. Update Booking Status
      booking.status = BookingStatus.EXPIRED;
      booking.cancellationReason = reason || 'Reservation expired';
      booking.cancelledAt = new Date();
      booking.bookingVersion += 1;
      if (booking.expiresAt) {
        booking.expiresAt = undefined;
      }
      await booking.save({ session });

      // Note: Coupon usedCount is NOT decremented here because pending/unconfirmed bookings never increment usedCount.

      // 2. Transition corresponding reservations to EXPIRED
      const transitioned = await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.EXPIRED,
        {
          reason: reason || 'Reservation expired',
          correlationId: booking.bookingId,
        },
        session
      );

      // 3. Update Event Statistics (Decrement reservedCount since it was never confirmed)
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

      // 4. Release Seat Layout if seat-based event
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
                  $or: [
                    { 'seat.bookedByBookingId': booking._id.toString() },
                    { 'seat.reservationId': { $in: booking.reservationIds || [] } }
                  ]
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
      await this.executeExpireBookingSideEffects(result.booking, result.releasedSeatIds, result.wasAlreadyExpired);
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
    const booking = await Booking.findById(bookingId).session(session || null);
    if (!booking) throw AppError.notFound('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw AppError.badRequest(`Booking is already in a terminal state: ${booking.status}`);
    }

    const ticketsToCancel = await Ticket.find({ _id: { $in: ticketIds }, bookingId: booking._id, status: 'active' }).session(session || null);
    if (ticketsToCancel.length === 0) {
      return { booking, postCommitPayload: null };
    }

    if (actor && actor.role !== 'super_admin') {
      const scannedTickets = ticketsToCancel.filter((t: any) => t.scannedAt !== null);
      if (scannedTickets.length > 0) {
        throw AppError.badRequest('Cancellation blocked: Selected tickets are checked-in. Only super_admin can cancel checked-in tickets.');
      }
    }

    // 1. Void tickets
    await Ticket.updateMany(
      { _id: { $in: ticketsToCancel.map(t => t._id) } },
      { $set: { status: 'voided', updatedAt: new Date() } },
      { session }
    );

    // 2. Update Event statistics
    const event = await Event.findById(booking.eventId).session(session || null);
    if (event) {
      const decUpdate: Record<string, number> = {
        soldCount: -ticketsToCancel.length,
        eventVersion: 1,
      };

      for (const t of ticketsToCancel) {
        const tierIndex = event.ticketTiers.findIndex(tier => tier.tier === t.tier);
        if (tierIndex !== -1) {
          const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
          decUpdate[`ticketTiers.${tierIndex}.soldCount`] = -(1 * groupSize);
        }
      }

      const nextSoldCount = Math.max(0, (event.soldCount || 0) - ticketsToCancel.length);
      const shouldBeSoldOut = event.totalCapacity > 0 && nextSoldCount >= event.totalCapacity;

      await Event.findOneAndUpdate(
        { _id: booking.eventId },
        { $inc: decUpdate, $set: { isSoldOut: shouldBeSoldOut } },
        { new: true, session }
      );
    }

    // 3. Release Seats
    if (event && event.bookingMode === 'seat_based') {
      const allSeatIds = ticketsToCancel.map(t => t.seatId).filter(Boolean);
      if (allSeatIds.length > 0) {

        await SeatLayout.updateOne(
          { eventId: event._id },
          {
            $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
            $unset: {
              'seats.$[seat].lockedBy': '',
              'seats.$[seat].lockedAt': '',
              'seats.$[seat].bookedByBookingId': '',
              'seats.$[seat].reservationId': '',
            },
            $inc: { 'seats.$[seat].seatVersion': 1 },
          },
          {
            arrayFilters: [
              {
                'seat.seatId': { $in: allSeatIds },
                $or: [
                  { 'seat.bookedByBookingId': booking._id.toString() },
                  { 'seat.reservationId': { $in: booking.reservationIds || [] } }
                ]
              },
            ],
            session,
          }
        );
      }
    }

    return { booking, postCommitPayload: null };
  }

}

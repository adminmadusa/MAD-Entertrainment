import { Types } from 'mongoose';

import {
  BookingStatus,
  BookingMode,
  ReservationStatus,
  SeatStatus,
  deriveBookingEligibility,
} from '@mad/shared';

import { getRedis } from '../../../config/redis';
import { emitToAdmin, emitToEvent } from '../../../config/socket';
import { AppError } from '../../../middleware/error.middleware';
import { Booking, IBooking } from '../../../models/booking.schema';
import { Event } from '../../../models/event.schema';
import { IReservation } from '../../../models/reservation.schema';
import { SeatLayout } from '../../../models/seat-layout.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { runInTransaction } from '../../../utils/transaction';
import { ReservationService } from '../../reservation.service';
import { BookingAccessService } from './booking-access.service';
import {
  generateSelectionFingerprint,
  calculateBookingPricing,
} from './booking-calculation.utils';
import { expirePreviousBookingForSession } from './booking-expiration.helper';
import type { CreateBookingRequest, SaveCheckoutRequest } from './booking.types';

export class BookingCreationService {
  static generateSelectionFingerprint = generateSelectionFingerprint;

  static async createBooking(
    data: CreateBookingRequest,
    sessionId: string | undefined,
    userId?: string
  ): Promise<IBooking> {
    const event = await Event.findById(data.eventId);
    if (!event || event.status !== 'published' || event.isDeleted === true) {
      throw AppError.notFound('Event not found or not published');
    }

    if (event.isSoldOut) {
      throw AppError.badRequest('Event is sold out');
    }

    const eligibility = deriveBookingEligibility(event as any);
    if (!eligibility.bookingAllowed) {
      throw AppError.badRequest(
        `This event is no longer available for booking. Reason: ${eligibility.bookingReason}`
      );
    }

    // Consolidate ticket quantities and seat selection arrays by tier without mutating request DTO
    const consolidatedMap = new Map<string, (typeof data.tickets)[0]>();
    for (const ticketReq of data.tickets) {
      const existing = consolidatedMap.get(ticketReq.tier);
      if (existing) {
        existing.quantity += ticketReq.quantity;
        if (ticketReq.seats) {
          existing.seats = [...(existing.seats || []), ...ticketReq.seats];
        }
      } else {
        consolidatedMap.set(ticketReq.tier, {
          tier: ticketReq.tier,
          quantity: ticketReq.quantity,
          seats: ticketReq.seats ? [...ticketReq.seats] : undefined,
        });
      }
    }
    const consolidatedTickets = Array.from(consolidatedMap.values());

    const requestFingerprint = generateSelectionFingerprint({
      ...data,
      tickets: consolidatedTickets,
    });

    const query: any = {
      eventId: event._id,
      status: BookingStatus.AWAITING_PAYMENT,
    };
    if (userId) {
      query.userId = new Types.ObjectId(userId);
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      throw AppError.unauthorized('Authentication required');
    }

    const existingBooking = await Booking.findOne(query);

    if (existingBooking) {
      if (existingBooking.selectionFingerprint === requestFingerprint) {
        logger.info(
          { bookingId: existingBooking._id, eventId: data.eventId, userId, sessionId },
          'Identical retry detected, reusing existing booking.'
        );
        (existingBooking as any).isReused = true;
        return existingBooking;
      } else {
        await expirePreviousBookingForSession(existingBooking, event, {
          eventId: data.eventId,
          userId,
          sessionId,
        });
      }
    }

    const {
      finalTickets,
      subtotal,
      convenienceFee,
      gst,
      discount,
      totalAmount,
      totalTicketsCount,
      couponId,
      countryConfig,
    } = await calculateBookingPricing({
      event,
      consolidatedTickets,
      couponCode: data.couponCode,
    });

    // Seat lock validation (for seat-based events)
    if (event.bookingMode === BookingMode.SEAT_BASED) {
      const allSeatReqs = consolidatedTickets.flatMap((t) => t.seats || []);
      if (allSeatReqs.length !== totalTicketsCount) {
        throw AppError.badRequest(
          'Seat selection is required and must match total tickets count for seat-based events'
        );
      }

      const redis = getRedis();
      const seatLayout = await SeatLayout.findOne({ eventId: event._id })
        .select('seats.seatId seats.status')
        .lean();
      if (!seatLayout) {
        throw AppError.badRequest('Seat layout configuration missing for this event');
      }

      for (const seatReq of allSeatReqs) {
        const dbSeat = seatLayout.seats.find((s) => s.seatId === seatReq.seatId);
        if (!dbSeat) {
          throw AppError.badRequest(`Seat ID "${seatReq.seatId}" does not exist in event layout`);
        }

        if (dbSeat.status !== SeatStatus.AVAILABLE) {
          throw AppError.badRequest(`Seat ID "${seatReq.seatId}" is no longer available`);
        }

        const redisLockVal = await redis.get(
          `mad:lock:event:${event._id}:seat:${seatReq.seatId}`
        );
        if (!redisLockVal || redisLockVal !== sessionId) {
          throw AppError.badRequest(
            `Seat ID "${seatReq.seatId}" is not locked by your session. Please lock seats again.`
          );
        }
      }
    }

    const logicalExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const booking = new Booking({
      eventId: event._id,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      sessionId,
      tickets: finalTickets,
      totalTickets: totalTicketsCount,
      subtotal,
      convenienceFee,
      gst,
      discount,
      totalAmount,
      currency: event.currency || countryConfig.currency,
      countryCode: event.countryCode || countryConfig.countryCode,
      taxLabel: event.taxLabel || countryConfig.taxLabel,
      taxPercentage:
        event.taxPercentage !== undefined ? event.taxPercentage : countryConfig.defaultTax,
      locale: event.locale || countryConfig.locale,
      couponCode: data.couponCode ? data.couponCode.toUpperCase() : undefined,
      couponId,
      status: BookingStatus.AWAITING_PAYMENT,
      expiresAt,
      logicalExpiresAt,
      selectionFingerprint: requestFingerprint,
    });

    let txResult;
    try {
      txResult = await runInTransaction(async (session) => {
        await booking.save({ session });

        const reservations: IReservation[] = [];
        const postCommitCallbacks: Array<() => Promise<void>> = [];
        try {
          for (const ticketReq of consolidatedTickets) {
            const tierConfig = event.ticketTiers.find((t: any) => t.tier === ticketReq.tier);
            const groupSize = tierConfig?.groupSize || 1;
            const { reservations: allocated, postCommit } =
              await ReservationService.reserveForBooking(
                {
                  eventId: event._id as Types.ObjectId,
                  bookingMode: event.bookingMode,
                  tier: ticketReq.tier as any,
                  quantity: ticketReq.quantity * groupSize,
                  seats: ticketReq.seats?.map((seat) => ({
                    seatId: seat.seatId,
                    section: seat.section,
                  })),
                  sessionId: sessionId ?? booking._id.toString(),
                  userId,
                  bookingId: booking._id as Types.ObjectId,
                  bookingReference: booking.bookingId,
                  correlationId: booking.bookingId,
                  expiresAt: logicalExpiresAt,
                },
                session
              );
            reservations.push(...allocated);
            postCommitCallbacks.push(postCommit);
          }
        } catch (err) {
          if (!session) {
            booking.status = BookingStatus.FAILED;
            booking.bookingVersion += 1;
            await booking.save().catch(() => {});
            if (reservations.length > 0) {
              const failedReservations = await ReservationService.transitionForBooking(
                booking._id,
                ReservationStatus.FAILED,
                {
                  reason: 'booking-reservation-allocation-failed',
                  correlationId: booking.bookingId,
                }
              );
              await ReservationService.releaseCapacityForTerminalReservations(failedReservations);
            }
          }
          logger.warn(
            { err, bookingId: booking._id, eventId: event._id },
            'Booking failed during reservation allocation'
          );
          throw err;
        }

        booking.reservationIds = reservations.map((reservation) => reservation.reservationId);
        booking.bookingVersion += 1;
        await booking.save({ session });

        let allSeatIds: string[] = [];
        let reservationBySeat = new Map<string, string>();

        if (event.bookingMode === BookingMode.SEAT_BASED) {
          allSeatIds = consolidatedTickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
          reservationBySeat = new Map(
            reservations
              .filter((reservation) => reservation.seatId)
              .map((reservation) => [reservation.seatId, reservation.reservationId])
          );
          const result = await SeatLayout.updateOne(
            { eventId: event._id },
            {
              $set: {
                'seats.$[seat].status': SeatStatus.LOCKED,
                'seats.$[seat].lockedBy': sessionId,
                'seats.$[seat].lockedAt': new Date(),
                'seats.$[seat].bookedByBookingId': booking._id.toString(),
              },
              $inc: {
                'seats.$[seat].seatVersion': 1,
              },
            },
            {
              arrayFilters: [
                {
                  'seat.seatId': { $in: allSeatIds },
                  'seat.status': SeatStatus.AVAILABLE,
                },
              ],
              session,
            }
          );

          if (result.modifiedCount !== allSeatIds.length) {
            throw AppError.conflict(
              'Some of the selected seats were locked by another user. Please choose different seats.'
            );
          }

          for (const [seatId, reservationId] of reservationBySeat.entries()) {
            await SeatLayout.updateOne(
              { eventId: event._id, 'seats.seatId': seatId },
              { $set: { 'seats.$.reservationId': reservationId } },
              { session }
            );
          }
        }

        return {
          reservations,
          allSeatIds,
          reservationBySeat,
          postCommitCallbacks,
        };
      });
    } catch (err: any) {
      if (
        err.code === 11000 &&
        (err.message.includes('idx_session_event_awaiting_payment') ||
          err.message.includes('idx_user_event_awaiting_payment'))
      ) {
        logger.info(
          { sessionId, userId, eventId: event._id },
          'Concurrent booking checkout collision detected, resolving winner.'
        );
        const winningBooking = await Booking.findOne(query);
        if (winningBooking) {
          if (winningBooking.selectionFingerprint === requestFingerprint) {
            (winningBooking as any).isReused = true;
            return winningBooking;
          }
        }

        const conflictErr = AppError.conflict(
          'A concurrent booking checkout is already in progress with a different selection. Please refresh your cart and try again.'
        );
        conflictErr.code = 'CONCURRENT_BOOKING_ATTEMPT';
        throw conflictErr;
      }
      throw err;
    }

    const { allSeatIds, postCommitCallbacks } = txResult;

    if (event.bookingMode === BookingMode.SEAT_BASED) {
      const redis = getRedis();
      for (const seatId of allSeatIds) {
        const lockKey = `mad:lock:event:${event._id}:seat:${seatId}`;
        try {
          const lockOwner = await redis.get(lockKey);
          if (lockOwner === sessionId) {
            await redis.del(lockKey);
          }
        } catch (err) {
          logger.warn(
            { err, seatId, bookingId: booking._id },
            'Redis connection error during lock release'
          );
        }
      }

      try {
        emitToEvent(
          event._id.toString(),
          'seat:reserved',
          {
            eventId: event._id.toString(),
            bookingId: booking._id.toString(),
            seatIds: allSeatIds,
          },
          booking.bookingId
        );
      } catch (err) {
        logger.debug(
          { err, eventId: event._id, bookingId: booking._id },
          'Socket emit skipped for seat reservation'
        );
      }
      logger.info(
        { eventId: event._id, bookingId: booking._id, seatIds: allSeatIds },
        'Seat inventory reserved for checkout'
      );
    }

    for (const postCommit of postCommitCallbacks) {
      try {
        await postCommit();
      } catch (err) {
        logger.debug(
          { err, bookingId: booking._id },
          'Reservation post-commit callback failed (non-fatal)'
        );
      }
    }

    try {
      emitToAdmin(
        'bookings',
        'booking:created',
        {
          bookingId: booking._id.toString(),
          eventId: event._id.toString(),
          status: booking.status,
          reservationIds: booking.reservationIds,
          bookingVersion: booking.bookingVersion,
        },
        booking.bookingId
      );
    } catch (err) {
      logger.debug(
        { err, bookingId: booking._id },
        'Admin socket emit skipped for booking creation'
      );
    }

    auditLog({
      action: 'BOOKING_CREATED',
      actor: userId ? { type: 'user', id: userId } : { type: 'guest', id: sessionId },
      status: 'success',
      metadata: {
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingId,
        eventId: event._id.toString(),
        totalTickets: booking.totalTickets,
        totalAmount: booking.totalAmount,
      },
      description: `Created booking ${booking.bookingId} for event ${event.title} in status AWAITING_PAYMENT`,
    });

    return booking;
  }

  static async saveCheckoutDetails(
    bookingId: string,
    data: SaveCheckoutRequest,
    sessionId: string | undefined,
    userId: string | undefined
  ): Promise<IBooking> {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    BookingAccessService.assertBookingAccess(booking, { userId, sessionId }, 'ActiveCheckout');

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest('Booking details can only be updated while awaiting payment');
    }

    booking.firstName = data.firstName;
    booking.lastName = data.lastName;
    booking.guestName = `${data.firstName} ${data.lastName}`.trim();
    booking.guestEmail = data.guestEmail.toLowerCase().trim();
    booking.guestPhone = data.guestPhone.trim();
    booking.keepUpdated = !!data.keepUpdated;
    booking.sendBestEvents = !!data.sendBestEvents;

    booking.bookingVersion += 1;
    await booking.save();

    try {
      emitToAdmin(
        'bookings',
        'booking:updated',
        {
          bookingId: booking._id.toString(),
          eventId: booking.eventId.toString(),
          status: booking.status,
          bookingVersion: booking.bookingVersion,
        },
        booking.bookingId
      );
    } catch (err) {
      logger.debug(
        { err, bookingId: booking._id },
        'Admin socket emit skipped for booking update'
      );
    }

    return booking;
  }
}

import crypto from 'crypto';
import { BookingStatus, BookingMode, ReservationStatus, SeatStatus } from '@mad/shared';
import { Types } from 'mongoose';

import { emitToAdmin, emitToEvent } from '../../config/socket';
import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { IReservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { ReservationService } from '../reservation.service';
import { runInTransaction } from '../../utils/transaction';

export class PublicBookingService {
  static generateSelectionFingerprint(data: {
    eventId: string;
    tickets: {
      tier: string;
      quantity: number;
      seats?: { seatId: string }[];
    }[];
    couponCode?: string;
  }): string {
    const normalizedCoupon = data.couponCode ? data.couponCode.toUpperCase().trim() : '';
    const normalizedTickets = data.tickets.map((t) => {
      const sortedSeats = t.seats
        ? t.seats.map((s) => s.seatId).filter(Boolean).sort()
        : [];
      return {
        tier: t.tier,
        quantity: t.quantity,
        seats: sortedSeats,
      };
    }).sort((a, b) => a.tier.localeCompare(b.tier));

    const rawSelection = {
      eventId: data.eventId,
      tickets: normalizedTickets,
      couponCode: normalizedCoupon,
    };

    const jsonStr = JSON.stringify(rawSelection);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  static async createBooking(
    data: {
      eventId: string;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      tickets: {
        tier: string;
        quantity: number;
        seats?: {
          seatId: string;
          row: string;
          number: number;
          section?: string;
        }[];
      }[];
      couponCode?: string;
    },
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

    // Generate the fingerprint for the current request selection
    const requestFingerprint = PublicBookingService.generateSelectionFingerprint(data);

    // Look for an existing AWAITING_PAYMENT booking for this event and session/user
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
      // Compute fingerprint if missing (for legacy bookings)
      const existingFingerprint = existingBooking.selectionFingerprint || 
        PublicBookingService.generateSelectionFingerprint({
          eventId: existingBooking.eventId.toString(),
          tickets: existingBooking.tickets.map((t: any) => ({
            tier: t.tier,
            quantity: t.quantity,
            seats: t.seats || [],
          })),
          couponCode: existingBooking.couponCode,
        });

      if (existingFingerprint === requestFingerprint) {
        logger.info({ bookingId: existingBooking._id, eventId: data.eventId, userId, sessionId }, 'Identical retry detected, reusing existing booking.');
        if (!existingBooking.selectionFingerprint) {
          existingBooking.selectionFingerprint = existingFingerprint;
          await existingBooking.save().catch(() => {});
        }
        (existingBooking as any).isReused = true;
        return existingBooking;
      } else {
        logger.info({ bookingId: existingBooking._id, eventId: data.eventId, userId, sessionId }, 'Sequential selection change detected. Expiring old booking.');
        existingBooking.status = BookingStatus.EXPIRED;
        existingBooking.cancellationReason = 'booking-modified-during-checkout';
        existingBooking.cancelledAt = new Date();
        existingBooking.bookingVersion += 1;
        await existingBooking.save();

        const failedReservations = await ReservationService.transitionForBooking(
          existingBooking._id,
          ReservationStatus.FAILED,
          {
            reason: 'booking-modified-during-checkout',
            correlationId: existingBooking.bookingId,
          }
        );
        await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

        if (event.bookingMode === BookingMode.SEAT_BASED) {
          const oldSeatIds = existingBooking.tickets
            .flatMap((t: any) => t.seats || [])
            .map((s: any) => s.seatId);
          if (oldSeatIds.length > 0) {
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
                    'seat.seatId': { $in: oldSeatIds },
                    'seat.bookedByBookingId': existingBooking._id.toString(),
                  },
                ],
              }
            );
          }
        }

        try {
          emitToAdmin('bookings', 'booking:updated', {
            bookingId: existingBooking._id.toString(),
            eventId: event._id.toString(),
            status: existingBooking.status,
            bookingVersion: existingBooking.bookingVersion,
          }, existingBooking.bookingId);
        } catch (err) {
          logger.debug({ err, bookingId: existingBooking._id }, 'Admin socket emit skipped for booking modification expiration');
        }
      }
    }

    let subtotal = 0;
    let totalTicketsCount = 0;
    let totalGst = 0;
    const finalTickets: any[] = [];

    // Validate Tiers and Quantities
    for (const ticketReq of data.tickets) {
      const tierConfig = event.ticketTiers.find((t) => t.tier === ticketReq.tier && t.isActive);
      if (!tierConfig) {
        throw AppError.badRequest(`Ticket tier "${ticketReq.tier}" is invalid or inactive`);
      }

      // Check availability window
      if (tierConfig.availabilityWindow?.startDate && tierConfig.availabilityWindow?.endDate) {
        const now = new Date();
        if (now < new Date(tierConfig.availabilityWindow.startDate) || now > new Date(tierConfig.availabilityWindow.endDate)) {
          throw AppError.badRequest(`Ticket tier "${tierConfig.name}" is not currently available for purchase`);
        }
      }

      // Check min per booking
      if (tierConfig.minPerBooking && ticketReq.quantity < tierConfig.minPerBooking) {
        throw AppError.badRequest(`Minimum ${tierConfig.minPerBooking} tickets required for tier "${tierConfig.name}"`);
      }

      // Check max per booking
      if (tierConfig.maxPerBooking && ticketReq.quantity > tierConfig.maxPerBooking) {
        throw AppError.badRequest(`Maximum ${tierConfig.maxPerBooking} tickets allowed for tier "${tierConfig.name}"`);
      }

      // Check tier capacity based on group size (1 package of Friends Pack consumes 4 capacity)
      const groupSize = tierConfig.groupSize || 1;
      const capacityConsumed = ticketReq.quantity * groupSize;
      if (tierConfig.soldCount + capacityConsumed > tierConfig.totalCapacity) {
        throw AppError.badRequest(`Requested quantity for tier "${tierConfig.name}" exceeds remaining capacity`);
      }

      // Subtotal after tier discount
      const tierPriceAfterDiscount = Math.max(0, tierConfig.price - (tierConfig.discount || 0));
      const tierSubtotal = tierPriceAfterDiscount * ticketReq.quantity;

      // Calculate Tier-specific GST
      const tierTaxPercent = tierConfig.taxPercent ?? 18;
      const tierGst = Math.round((tierSubtotal * tierTaxPercent) / 100);

      subtotal += tierSubtotal;
      totalGst += tierGst;
      totalTicketsCount += ticketReq.quantity;

      finalTickets.push({
        tier: ticketReq.tier,
        tierName: tierConfig.name,
        quantity: ticketReq.quantity,
        pricePerTicket: tierConfig.price,
        subtotal: tierSubtotal,
        seats: ticketReq.seats || [],
      });
    }

    if (totalTicketsCount <= 0) {
      throw AppError.badRequest('Must book at least 1 ticket');
    }

    // Seat lock validation (for seat-based events)
    if (event.bookingMode === BookingMode.SEAT_BASED) {
      const allSeatReqs = data.tickets.flatMap((t) => t.seats || []);
      if (allSeatReqs.length !== totalTicketsCount) {
        throw AppError.badRequest('Seat selection is required and must match total tickets count for seat-based events');
      }

      const redis = getRedis();
      const seatLayout = await SeatLayout.findOne({ eventId: event._id }).select('seats.seatId seats.status').lean();
      if (!seatLayout) {
        throw AppError.badRequest('Seat layout configuration missing for this event');
      }

      // Verify each seat is available in DB and locked by this session in Redis
      for (const seatReq of allSeatReqs) {
        const dbSeat = seatLayout.seats.find((s) => s.seatId === seatReq.seatId);
        if (!dbSeat) {
          throw AppError.badRequest(`Seat ID "${seatReq.seatId}" does not exist in event layout`);
        }

        if (dbSeat.status !== SeatStatus.AVAILABLE) {
          throw AppError.badRequest(`Seat ID "${seatReq.seatId}" is no longer available`);
        }

        // Verify Redis lock
        const redisLockVal = await redis.get(`mad:lock:event:${event._id}:seat:${seatReq.seatId}`);
        if (!redisLockVal || redisLockVal !== sessionId) {
          throw AppError.badRequest(`Seat ID "${seatReq.seatId}" is not locked by your session. Please lock seats again.`);
        }
      }
    }

    // Pricing calculations (₹30 per ticket convenience fee, 18% GST on convenience fee + subtotal GST)
    const convenienceFee = 30 * totalTicketsCount;
    const convenienceFeeGst = Math.round((convenienceFee * 18) / 100);
    const gst = totalGst + convenienceFeeGst;

    // Apply Coupon
    let discount = 0;
    let couponId: Types.ObjectId | undefined;
    if (data.couponCode) {
      const coupon = await Coupon.findOne({ code: data.couponCode.toUpperCase() });
      if (!coupon || !coupon.isActive) {
        throw AppError.badRequest('Coupon is invalid or inactive');
      }

      const now = new Date();
      if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
        throw AppError.badRequest('Coupon validity has expired');
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        throw AppError.badRequest('Coupon usage limit reached');
      }

      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        throw AppError.badRequest(`Minimum subtotal order amount of ₹${coupon.minOrderAmount} is required for this coupon`);
      }

      // Scope checks
      if (coupon.applicableEventIds && coupon.applicableEventIds.length > 0) {
        const hasEvent = coupon.applicableEventIds.some((id: any) => id.toString() === event._id.toString());
        if (!hasEvent) {
          throw AppError.badRequest('Coupon is not applicable to this event');
        }
      }

      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        if (!coupon.applicableCategories.includes(event.category)) {
          throw AppError.badRequest('Coupon is not applicable to this category of events');
        }
      }

      if (coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.discountValue;
      }

      if (discount > subtotal) {
        discount = subtotal; // discount can't exceed subtotal ticket cost
      }

      couponId = coupon._id as Types.ObjectId;
    }

    const totalAmount = Math.max(0, subtotal + convenienceFee + gst - discount);

    // Expiry in 10 minutes (logical reservation window)
    const logicalExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Deferred physical TTL cleanup (30 days) to allow webhook recoveries
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create pending booking
    const booking = new Booking({
      eventId: event._id,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      // CRITICAL-01: sessionId stored so ownership check in booking controller
      // can verify the caller is the same session that created this booking.
      sessionId,
      tickets: finalTickets,
      totalTickets: totalTicketsCount,
      subtotal,
      convenienceFee,
      gst,
      discount,
      totalAmount,
      currency: 'INR',
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
          for (const ticketReq of data.tickets) {
            const { reservations: allocated, postCommit } = await ReservationService.reserveForBooking({
              eventId: event._id as Types.ObjectId,
              bookingMode: event.bookingMode,
              tier: ticketReq.tier as any,
              quantity: ticketReq.quantity,
              seats: ticketReq.seats?.map((seat) => ({ seatId: seat.seatId, section: seat.section })),
              sessionId: sessionId ?? booking._id.toString(),
              userId,
              bookingId: booking._id as Types.ObjectId,
              bookingReference: booking.bookingId,
              correlationId: booking.bookingId,
              expiresAt: logicalExpiresAt,
            }, session);
            reservations.push(...allocated);
            postCommitCallbacks.push(postCommit);
          }
        } catch (err) {
          if (!session) {
            booking.status = BookingStatus.FAILED;
            booking.bookingVersion += 1;
            await booking.save().catch(() => {});
            if (reservations.length > 0) {
              const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
                reason: 'booking-reservation-allocation-failed',
                correlationId: booking.bookingId,
              });
              await ReservationService.releaseCapacityForTerminalReservations(failedReservations);
            }
          }
          logger.warn({ err, bookingId: booking._id, eventId: event._id }, 'Booking failed during reservation allocation');
          throw err;
        }

        booking.reservationIds = reservations.map((reservation) => reservation.reservationId);
        booking.bookingVersion += 1;
        await booking.save({ session });

        let allSeatIds: string[] = [];
        let reservationBySeat = new Map<string, string>();

        // Update Seat statuses to LOCKED in MongoDB for the booking (to prevent other checkout threads booking it)
        if (event.bookingMode === BookingMode.SEAT_BASED) {
          allSeatIds = data.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
          reservationBySeat = new Map(
            reservations.filter((reservation) => reservation.seatId).map((reservation) => [reservation.seatId, reservation.reservationId])
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
            throw AppError.conflict('Some of the selected seats were locked by another user. Please choose different seats.');
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
          const winningFingerprint =
            winningBooking.selectionFingerprint ||
            PublicBookingService.generateSelectionFingerprint({
              eventId: winningBooking.eventId?.toString() || event._id.toString(),
              tickets: winningBooking.tickets.map((t: any) => ({
                tier: t.tier,
                quantity: t.quantity,
                seats: t.seats || [],
              })),
              couponCode: winningBooking.couponCode,
            });

          if (winningFingerprint === requestFingerprint) {
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

    const { reservations, allSeatIds, reservationBySeat, postCommitCallbacks } = txResult;

    // Side effects (Redis lock release, WebSocket emissions, Cache invalidation, and Audit logging) run strictly outside the transaction boundary.
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
          logger.warn({ err, seatId, bookingId: booking._id }, 'Redis connection error during lock release');
        }
      }

      try {
        emitToEvent(event._id.toString(), 'seat:reserved', {
          eventId: event._id.toString(),
          bookingId: booking._id.toString(),
          seatIds: allSeatIds,
        }, booking.bookingId);
      } catch (err) {
        logger.debug({ err, eventId: event._id, bookingId: booking._id }, 'Socket emit skipped for seat reservation');
      }
      logger.info({ eventId: event._id, bookingId: booking._id, seatIds: allSeatIds }, 'Seat inventory reserved for checkout');
    }

    // Invoke reservation post-commit callbacks (emit socket + invalidate cache), owned by ReservationService.
    for (const postCommit of postCommitCallbacks) {
      try {
        await postCommit();
      } catch (err) {
        logger.debug({ err, bookingId: booking._id }, 'Reservation post-commit callback failed (non-fatal)');
      }
    }

    try {
      emitToAdmin('bookings', 'booking:created', {
        bookingId: booking._id.toString(),
        eventId: event._id.toString(),
        status: booking.status,
        reservationIds: booking.reservationIds,
        bookingVersion: booking.bookingVersion,
      }, booking.bookingId);
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Admin socket emit skipped for booking creation');
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

  static async markReservationsPendingPayment(bookingId: string, paymentReference?: string, paymentId?: Types.ObjectId) {
    return ReservationService.transitionForBooking(bookingId, ReservationStatus.PENDING_PAYMENT, {
      paymentReference,
      paymentId,
      reason: 'payment-intent-created',
      correlationId: bookingId,
    });
  }

  static async getBookingByReference(bookingId: string) {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query)
      .populate('eventId')
      .populate('paymentId');

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const tickets = await Ticket.find({ bookingId: booking._id });

    const ticketsReady = tickets.length > 0 && tickets.length === booking.totalTickets;

    return { booking, tickets, ticketsReady };
  }

  static async getMyBookings(userId: string) {
    const bookings = await Booking.find({ userId: new Types.ObjectId(userId) })
      .populate('eventId')
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const tickets = await Ticket.find({ bookingId: { $in: bookingIds } });

    // Compute per-booking readiness for the caller
    const ticketsReadyMap = new Map<string, boolean>();
    for (const booking of bookings) {
      const bookingTickets = tickets.filter(
        (t) => t.bookingId?.toString() === booking._id.toString()
      );
      ticketsReadyMap.set(
        booking._id.toString(),
        bookingTickets.length > 0 && bookingTickets.length === booking.totalTickets
      );
    }

    return { bookings, tickets, ticketsReadyMap };
  }

  static async saveCheckoutDetails(
    bookingId: string,
    data: {
      firstName: string;
      lastName: string;
      guestEmail: string;
      guestPhone: string;
      keepUpdated?: boolean;
      sendBestEvents?: boolean;
    },
    sessionId: string | undefined,
    userId: string | undefined
  ): Promise<IBooking> {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    // Verify ownership
    const isUserOwner = !!booking.userId && !!userId && booking.userId.toString() === userId;
    const isGuestOwner = !!booking.sessionId && !!sessionId && booking.sessionId === sessionId;
    if (!isUserOwner && !isGuestOwner) {
      throw AppError.forbidden('You do not have access to this booking');
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest('Booking details can only be updated while awaiting payment');
    }

    // Update details
    booking.firstName = data.firstName;
    booking.lastName = data.lastName;
    booking.guestName = `${data.firstName} ${data.lastName}`.trim();
    booking.guestEmail = data.guestEmail.toLowerCase().trim();
    booking.guestPhone = data.guestPhone.trim();
    booking.keepUpdated = !!data.keepUpdated;
    booking.sendBestEvents = !!data.sendBestEvents;

    booking.bookingVersion += 1;
    await booking.save();

    // Emit socket event to notify admins
    try {
      emitToAdmin('bookings', 'booking:updated', {
        bookingId: booking._id.toString(),
        eventId: booking.eventId.toString(),
        status: booking.status,
        bookingVersion: booking.bookingVersion,
      }, booking.bookingId);
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Admin socket emit skipped for booking update');
    }

    return booking;
  }
}
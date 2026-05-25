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

export class PublicBookingService {
  static async createBooking(
    data: {
      eventId: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
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
    if (!event || event.status !== 'published') {
      throw AppError.notFound('Event not found or not published');
    }

    if (event.isSoldOut) {
      throw AppError.badRequest('Event is sold out');
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

    // Expiry in 10 minutes (matching the TTL index on expiresAt)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
    });

    await booking.save();

    let reservations: IReservation[] = [];
    try {
      for (const ticketReq of data.tickets) {
        const allocated = await ReservationService.reserveForBooking({
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
          expiresAt,
        });
        reservations.push(...allocated);
      }
    } catch (err) {
      booking.status = BookingStatus.FAILED;
      booking.bookingVersion += 1;
      await booking.save();
      if (reservations.length > 0) {
        const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
          reason: 'booking-reservation-allocation-failed',
          correlationId: booking.bookingId,
        });
        await ReservationService.releaseCapacityForTerminalReservations(failedReservations);
      }
      logger.warn({ err, bookingId: booking._id, eventId: event._id }, 'Booking failed during reservation allocation');
      throw err;
    }

    booking.reservationIds = reservations.map((reservation) => reservation.reservationId);
    booking.bookingVersion += 1;
    await booking.save();

    // Update Seat statuses to LOCKED in MongoDB for the booking (to prevent other checkout threads booking it)
    if (event.bookingMode === BookingMode.SEAT_BASED) {
      const allSeatIds = data.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
      const reservationBySeat = new Map(
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
        }
      );

      if (result.modifiedCount !== allSeatIds.length) {
        throw AppError.conflict('Some of the selected seats were locked by another user. Please choose different seats.');
      }

      for (const [seatId, reservationId] of reservationBySeat.entries()) {
        await SeatLayout.updateOne(
          { eventId: event._id, 'seats.seatId': seatId },
          { $set: { 'seats.$.reservationId': reservationId } }
        );
      }

      const redis = getRedis();
      for (const seatId of allSeatIds) {
        const lockKey = `mad:lock:event:${event._id}:seat:${seatId}`;
        const lockOwner = await redis.get(lockKey);
        if (lockOwner === sessionId) {
          await redis.del(lockKey);
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

    return { booking, tickets };
  }

  static async getMyBookings(userId: string) {
    const bookings = await Booking.find({ userId: new Types.ObjectId(userId) })
      .populate('eventId')
      .sort({ createdAt: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const tickets = await Ticket.find({ bookingId: { $in: bookingIds } });

    return { bookings, tickets };
  }
}
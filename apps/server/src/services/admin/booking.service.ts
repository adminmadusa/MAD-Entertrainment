import { BookingStatus, ReservationStatus, SeatStatus, InventoryState, PaymentStatus } from '@mad/shared';
import mongoose, { Types, ClientSession } from 'mongoose';

import { emitToAdmin, emitToEvent, emitToBooking } from '../../config/socket';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { UserModel } from '../../models/user.schema';
import { Ticket } from '../../models/ticket.schema';
import { AdminModel } from '../../models/admin.schema';
import { AuditLogModel } from '../../models/audit-log.schema';
import { Payment } from '../../models/payment.schema';
import { logger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { ReservationService } from '../reservation.service';
import { CacheService } from '../cache.service';
import { QueueService } from '../queue.service';
import { getQueueName } from '../../config/queue.config';
import { BookingsSummaryResponse } from '../../types/admin/booking.types';
import { Notification } from '../../models/notification.schema';
import { NotificationType } from '@mad/shared';
import { eventCancellationHtml } from '../../lib/email';

/**
 * Resilient transaction execution helper. Runs the callback inside a session
 * transaction if replica sets are supported by the deployment, otherwise falls
 * back gracefully to atomic non-transactional operations.
 */
export async function runInTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession().catch(() => null);
  if (!session) {
    return fn(undefined);
  }

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } catch (err: any) {
    if (
      err?.message?.includes('replica set') ||
      err?.message?.includes('Transaction') ||
      err?.codeName === 'CommandNotSupported'
    ) {
      logger.warn(
        { err },
        'MongoDB transactions are not supported on this deployment. Falling back to non-transactional execution.'
      );
      return fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
}

/**
 * Maps a Mongoose Booking document onto a safe Normalized AdminBooking DTO representation.
 */
/**
 * Maps a Mongoose Booking document onto a safe Normalized AdminBooking DTO representation with dynamic attendance.
 */
const mapBookingToAdminDTO = async (booking: any, preloadedTickets?: any[]) => {
  const isSeatBased = booking.tickets?.[0]?.seats?.length > 0;
  const mode = booking.eventId?.bookingMode || (isSeatBased ? 'seat_based' : 'general_admission');

  // Query actual individual ticket barcodes checked in
  const ticketsList = preloadedTickets || await Ticket.find({ bookingId: booking._id }).lean();
  const totalTickets = ticketsList.reduce((sum: number, t: any) => sum + (t.admits || 1), 0);
  const ticketsScanned = ticketsList
    .filter((t: any) => t.scannedAt !== undefined && t.scannedAt !== null)
    .reduce((sum: number, t: any) => sum + (t.admits || 1), 0);
  const ticketsRemaining = Math.max(0, totalTickets - ticketsScanned);

  let attendanceStatus = 'NOT_ATTENDED';
  if (ticketsScanned === totalTickets && totalTickets > 0) {
    attendanceStatus = 'FULLY_ATTENDED';
  } else if (ticketsScanned > 0) {
    attendanceStatus = 'PARTIALLY_ATTENDED';
  }

  const customerObj = {
    _id: booking.userId ? booking.userId.toString() : undefined,
    name: booking.guestName || '—',
    firstName: booking.firstName || (booking.guestName ? booking.guestName.split(' ')[0] : undefined) || '—',
    lastName: booking.lastName || (booking.guestName ? booking.guestName.split(' ').slice(1).join(' ') : undefined) || '—',
    email: booking.guestEmail || '—',
    phone: booking.guestPhone,
    keepUpdated: booking.keepUpdated ?? false,
    sendBestEvents: booking.sendBestEvents ?? false,
  };

  // Fetch associated AuditLog documents matching the booking
  const auditLogs = await AuditLogModel.find({
    $or: [
      { 'metadata.bookingId': booking._id.toString() },
      { 'metadata.bookingReference': booking.bookingId }
    ],
    action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] }
  }).sort({ createdAt: -1 }).lean();

  return {
    _id: booking._id.toString(),
    bookingId: booking.bookingId,
    status: booking.status,
    totalAmount: booking.totalAmount,
    currency: booking.currency || 'INR',
    mode,
    eventId: booking.eventId ? {
      _id: booking.eventId._id.toString(),
      title: booking.eventId.title || '—',
      startDate: booking.eventId.startDate,
      coverImage: booking.eventId.bannerImage ? { url: booking.eventId.bannerImage.url } : undefined,
    } : null,
    userId: booking.userId ? customerObj : null,
    guestInfo: !booking.userId ? customerObj : undefined,
    tickets: Array.isArray(booking.tickets) ? booking.tickets.map((t: any) => ({
      tierName: t.tierName || '—',
      quantity: t.quantity || 0,
      price: t.pricePerTicket || 0,
    })) : [],
    createdAt: booking.createdAt ? booking.createdAt.toISOString() : new Date().toISOString(),
    cancellationReason: booking.cancellationReason,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : undefined,
    
    // Attendance details
    totalTickets,
    ticketsScanned,
    ticketsRemaining,
    attendanceStatus,

    // Audit logs & individual tickets without raw QR payloads
    auditHistory: auditLogs.map((log: any) => ({
      action: log.action,
      actor: log.actor?.id || 'system',
      status: log.status,
      timestamp: log.createdAt.toISOString(),
      metadata: log.metadata || {},
      description: log.description,
    })),
    individualTickets: ticketsList.map((t: any) => ({
      ticketId: t.ticketId,
      status: t.status || 'active',
      createdAt: t.createdAt.toISOString(),
      replacedAt: t.replacedAt ? t.replacedAt.toISOString() : null,
      replacedByTicketId: t.replacedByTicketId || null,
      replacementReason: t.replacementReason || null,
    })),
  };
};

/**
 * Fetch paginated list of bookings with optional status and fuzzy reference/email filtering.
 */
export const getBookings = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  eventId?: string
) => {
  const skip = (page - 1) * limit;
  const filter: any = {};

  if (status) {
    filter.status = status;
  }

  if (eventId) {
    filter.eventId = eventId;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { bookingId: searchRegex },
      { guestEmail: searchRegex },
      { guestName: searchRegex },
    ];
  }

  const total = await Booking.countDocuments(filter);
  const bookings = await Booking.find(filter)
    .populate('eventId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const bookingIds = bookings.map((b) => b._id);
  const allTickets = await Ticket.find({ bookingId: { $in: bookingIds } }).lean();
  const ticketsByBookingId = allTickets.reduce((acc: Record<string, any[]>, ticket: any) => {
    const bId = ticket.bookingId.toString();
    if (!acc[bId]) acc[bId] = [];
    acc[bId].push(ticket);
    return acc;
  }, {});

  const mappedBookings = await Promise.all(
    bookings.map((b) => mapBookingToAdminDTO(b, ticketsByBookingId[b._id.toString()] || []))
  );

  return {
    data: mappedBookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Fetch single booking populated detailed DTO representation.
 */
export const getBookingById = async (id: string) => {
  const query = Types.ObjectId.isValid(id) ? { _id: id } : { bookingId: id };
  const booking = await Booking.findOne(query).populate('eventId');
  if (!booking) {
    return null;
  }
  return await mapBookingToAdminDTO(booking);
};

/**
 * Atomically cancel a booking, log reasons, transition reservations, and release inventory/seats.
 */
export const cancelBooking = async (
  id: string,
  reason?: string,
  externalSession?: ClientSession,
  targetStatus: BookingStatus = BookingStatus.CANCELLED
) => {
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
            decUpdate[`ticketTiers.${tierIndex}.soldCount`] = -bookedTicket.quantity;
          }
        }

        await Event.findOneAndUpdate(
          { _id: booking.eventId },
          { $inc: decUpdate, $set: { isSoldOut: false } },
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

    await CacheService.delPattern('events:*');

    // 5. Emit real-time updates via WebSockets
    if (event && releasedSeatIds.length > 0) {
      try {
        emitToEvent(event._id.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }, booking.bookingId);
      } catch (err) {
        logger.debug({ err, eventId: event._id }, 'Seat unlock emit skipped');
      }
    }

    try {
      emitToBooking(
        booking._id.toString(),
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Booking update emit skipped');
    }

    try {
      emitToAdmin(
        'bookings',
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Admin booking update emit skipped');
    }

    auditLog({
      action: targetStatus === BookingStatus.REFUNDED ? 'BOOKING_REFUNDED' : 'BOOKING_CANCELLED',
      actor: { type: 'admin', id: 'system' },
      status: 'success',
      metadata: {
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingId,
        eventId: event?._id.toString(),
        reason: reason || (targetStatus === BookingStatus.REFUNDED ? 'Admin Refund Processed' : 'Admin cancelled'),
        releasedSeatIds,
      },
      description: targetStatus === BookingStatus.REFUNDED
        ? `Refunded booking ${booking.bookingId} and released associated capacity/seats`
        : `Cancelled booking ${booking.bookingId} and released associated capacity/seats`,
    });

    // Asynchronous, exception-safe Event Cancellation Email Trigger
    if (targetStatus === BookingStatus.CANCELLED && booking.guestEmail) {
      try {
        const existingNotification = await Notification.findOne({
          type: NotificationType.EVENT_CANCELLED,
          bookingId: booking._id
        }).session(session || null);

        if (!existingNotification) {
          const formattedDate = new Date(
            event?.startDate || booking.createdAt
          ).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const emailBody = await eventCancellationHtml({
            customerName: booking.guestName,
            eventTitle: event?.title || 'MAD Event',
            eventDate: formattedDate,
            venueName: event?.venue || 'MAD Venue',
            bookingReference: booking.bookingId,
          });

          const jobId = `cancellation-${booking.bookingId}-${Date.now()}`;
          
          await Notification.create([{
            jobId,
            status: 'queued',
            queuedAt: new Date(),
            type: NotificationType.EVENT_CANCELLED,
            channel: 'email',
            recipient: booking.guestEmail,
            subject: `Event Cancelled: ${event?.title || 'MAD Event'}`,
            isSent: false,
            retryCount: 0,
            bookingId: booking._id,
            eventId: event?._id
          }], { session });

          await QueueService.enqueue(
            getQueueName('notification-queue'),
            'email-dispatch',
            {
              to: booking.guestEmail,
              subject: `Event Cancelled: ${event?.title || 'MAD Event'}`,
              html: emailBody,
              notificationType: NotificationType.EVENT_CANCELLED,
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
            },
            jobId
          );

          logger.info({
            emailType: 'EVENT_CANCELLED',
            recipient: booking.guestEmail,
            bookingId: booking._id.toString(),
            eventId: booking.eventId.toString(),
            timestamp: new Date().toISOString(),
            success: true
          }, 'Event cancellation email queued successfully.');
        } else {
          logger.info({ bookingId: booking._id }, 'Event cancellation email already queued or sent; skipping duplicate.');
        }
      } catch (err) {
        logger.error({
          err,
          emailType: 'EVENT_CANCELLED',
          recipient: booking.guestEmail,
          bookingId: booking._id.toString(),
          eventId: booking.eventId.toString(),
          timestamp: new Date().toISOString(),
          success: false
        }, 'Failed to queue event cancellation email gracefully.');
      }
    }

    return booking;
  };

  if (externalSession) {
    return execute(externalSession);
  }
  return runInTransaction(execute);
};

/**
 * Administrative method to correct a guest booking's email address and proactively link
 * to a user account if a matching email exists.
 */
export const correctBookingEmail = async (
  id: string,
  newEmail: string,
  reason: string,
  adminId: string
) => {
  return runInTransaction(async (session) => {
    const booking = await Booking.findById(id).session(session || null);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.userId) {
      throw AppError.forbidden('Authenticated bookings cannot have their email corrected');
    }

    const oldEmail = booking.guestEmail;
    const normalizedEmail = newEmail.trim().toLowerCase();

    // Check if user already exists
    const user = await UserModel.findOne({ email: normalizedEmail }).session(session || null);
    let proactivelyLinked = false;
    if (user) {
      booking.userId = user._id as Types.ObjectId;
      proactivelyLinked = true;
    }

    booking.guestEmail = normalizedEmail;
    booking.bookingVersion += 1;

    await booking.save({ session });

    // Void and replace active tickets
    const activeTickets = await Ticket.find({ bookingId: booking._id, status: 'active' }).session(session || null);

    for (const oldTicket of activeTickets) {
      const baseMatch = oldTicket.ticketId.match(/^(TKT-[A-Z0-9]+-\d+)(?:-R\d+)?$/);
      const baseTicketId = baseMatch ? baseMatch[1] : oldTicket.ticketId;

      const count = await Ticket.countDocuments({
        ticketId: { $regex: new RegExp(`^${baseTicketId}(?:-R\\d+)?$`) }
      }).session(session || null);

      let rev = count;
      let newTicketId = `${baseTicketId}-R${rev}`;
      while (await Ticket.exists({ ticketId: newTicketId }).session(session || null)) {
        rev++;
        newTicketId = `${baseTicketId}-R${rev}`;
      }

      // Mark old ticket as replaced
      oldTicket.status = 'replaced';
      oldTicket.replacedByTicketId = newTicketId;
      oldTicket.replacedAt = new Date();
      oldTicket.replacementReason = 'EMAIL_CORRECTION';
      await oldTicket.save({ session: session || undefined });

      // Create new active ticket
      const newTicket = new Ticket({
        ticketId: newTicketId,
        bookingId: booking._id,
        eventId: booking.eventId,
        tierName: oldTicket.tierName,
        tier: oldTicket.tier,
        admits: oldTicket.admits,
        seatId: oldTicket.seatId,
        row: oldTicket.row,
        seatNumber: oldTicket.seatNumber,
        section: oldTicket.section,
        qrCode: newTicketId,
        qrCodeImage: `/api/public/tickets/${newTicketId}/qr`,
        status: 'active',
      });
      await newTicket.save({ session: session || undefined });
    }

    // Emit real-time updates via WebSockets
    try {
      emitToBooking(
        booking._id.toString(),
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Booking update emit skipped');
    }

    try {
      emitToAdmin(
        'bookings',
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );
    } catch (err) {
      logger.debug({ err, bookingId: booking._id }, 'Admin booking update emit skipped');
    }

    // Fetch executing admin's email and name for descriptive log representation
    const admin = await AdminModel.findById(adminId).session(session || null);
    const adminDetails = admin ? `${admin.name} (${admin.email})` : adminId;

    auditLog({
      action: 'BOOKING_EMAIL_CORRECTED',
      actor: { type: 'admin', id: adminId },
      status: 'success',
      metadata: {
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingId,
        oldEmail,
        newEmail: normalizedEmail,
        reason,
        proactivelyLinked,
        adminDetails,
      },
      description: `Corrected booking ${booking.bookingId} email from ${oldEmail} to ${normalizedEmail} by ${adminDetails}${
        proactivelyLinked ? ' (proactively linked user account)' : ''
      }`,
    });

    return booking;
  });
};

/**
 * Administrative method to resend tickets for a confirmed booking.
 */
export const resendBookingTickets = async (id: string, adminId: string) => {
  const booking = await Booking.findById(id).populate('eventId');
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw AppError.badRequest(`Cannot resend tickets for a booking in status: ${booking.status}`);
  }

  const eventIdStr = (booking.eventId as any)._id?.toString() || booking.eventId.toString();

  await QueueService.enqueue(
    getQueueName('pdf-queue'),
    'pdf:generate',
    {
      bookingId: booking._id.toString(),
      eventId: eventIdStr,
      recipientEmail: booking.guestEmail,
      guestName: booking.guestName,
      isResend: true,
    },
    `pdf:generate:${booking._id}:admin-resend:${Date.now()}`
  );

  auditLog({
    action: 'BOOKING_TICKETS_RESENT',
    actor: { type: 'admin', id: adminId },
    status: 'success',
    metadata: {
      bookingId: booking._id.toString(),
      bookingReference: booking.bookingId,
      recipientEmail: booking.guestEmail,
    },
    description: `Resent tickets for booking ${booking.bookingId} to ${booking.guestEmail}`,
  });

  return booking;
};

/**
 * Fetch booking summary stats, optionally filtered by event ID.
 */
export const getBookingsSummary = async (eventId?: string): Promise<BookingsSummaryResponse> => {
  const cacheKey = eventId ? `bookings:summary:event:${eventId}` : 'bookings:summary:global';
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached as BookingsSummaryResponse;
  }

  const matchStage: any = {};
  if (eventId) {
    matchStage.eventId = new mongoose.Types.ObjectId(eventId);
  }

  const bookingAgg = await Booking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalTickets: { $sum: '$totalTickets' },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, '$totalAmount', 0]
          }
        },
        confirmed: {
          $sum: {
            $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, 1, 0]
          }
        },
        pending: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  [BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRING]
                ]
              },
              1,
              0
            ]
          }
        },
        cancelled: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.FAILED, BookingStatus.EXPIRED]
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const bookingStats = bookingAgg[0] || {
    totalBookings: 0,
    totalTickets: 0,
    revenue: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0
  };

  const ticketMatchStage: any = { scannedAt: { $ne: null } };
  if (eventId) {
    ticketMatchStage.eventId = new mongoose.Types.ObjectId(eventId);
  }

  const ticketAgg = await Ticket.aggregate([
    { $match: ticketMatchStage },
    {
      $group: {
        _id: null,
        checkedIn: { $sum: '$admits' }
      }
    }
  ]);

  const checkedIn = ticketAgg[0]?.checkedIn || 0;

  const result: BookingsSummaryResponse = {
    totalBookings: bookingStats.totalBookings,
    totalTickets: bookingStats.totalTickets,
    revenue: bookingStats.revenue,
    confirmed: bookingStats.confirmed,
    pending: bookingStats.pending,
    cancelled: bookingStats.cancelled,
    checkedIn
  };

  await CacheService.set(cacheKey, result, 60);

  return result;
};


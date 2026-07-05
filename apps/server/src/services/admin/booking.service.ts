import crypto from 'crypto';

import mongoose, { Types, ClientSession } from 'mongoose';

import { BookingStatus, ReservationStatus, SeatStatus, InventoryState, PaymentStatus, NotificationType } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { emitToAdmin, emitToEvent, emitToBooking } from '../../config/socket';
import { eventCancellationHtml } from '../../lib/email';
import { AppError } from '../../middleware/error.middleware';
import { AdminModel } from '../../models/admin.schema';
import { AuditLogModel } from '../../models/audit-log.schema';
import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import type { BookingsSummaryResponse } from '../../types/admin/booking.types';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { runInTransaction } from '../../utils/transaction';
import { CacheService } from '../cache.service';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';

/**
 * Maps a Mongoose Booking document onto a safe Normalized AdminBooking DTO representation.
 */
/**
 * Maps a Mongoose Booking document onto a safe Normalized AdminBooking DTO representation with dynamic attendance.
 */
const mapBookingToAdminDTO = (booking: any, ticketsList: any[], auditLogs: any[]) => {
  const isSeatBased = booking.tickets?.[0]?.seats?.length > 0;
  const mode = booking.eventId?.bookingMode || (isSeatBased ? 'seat_based' : 'general_admission');

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
 * Merges logs matching by bookingId and bookingReference, deduplicates by _id,
 * and preserves descending createdAt chronological sorting order.
 */
const getAuditLogsForBooking = (
  bookingId: string,
  bookingRef: string,
  logsByBookingId: Record<string, any[]>
): any[] => {
  const logs = [
    ...(logsByBookingId[bookingId] || []),
    ...(logsByBookingId[bookingRef] || [])
  ];

  // Deduplicate logs by immutable _id identifier
  const uniqueMap = new Map<string, any>();
  for (const log of logs) {
    if (log && log._id) {
      uniqueMap.set(log._id.toString(), log);
    }
  }

  const uniqueLogs = Array.from(uniqueMap.values());

  // Sort descending by createdAt
  uniqueLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return uniqueLogs;
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
  const bookingProjection = {
    _id: 1,
    bookingId: 1,
    status: 1,
    totalAmount: 1,
    currency: 1,
    eventId: 1,
    userId: 1,
    guestName: 1,
    firstName: 1,
    lastName: 1,
    guestEmail: 1,
    guestPhone: 1,
    keepUpdated: 1,
    sendBestEvents: 1,
    tickets: 1,
    createdAt: 1,
    cancellationReason: 1,
    cancelledAt: 1,
  };

  const bookings = await Booking.find(filter, bookingProjection)
    .populate({
      path: 'eventId',
      select: '_id title startDate bannerImage bookingMode'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const bookingIds = bookings.map((b) => b._id);
  const bookingReferences = bookings.map((b) => b.bookingId);

  const ticketProjection = {
    bookingId: 1,
    admits: 1,
    scannedAt: 1,
    ticketId: 1,
    status: 1,
    createdAt: 1,
    replacedAt: 1,
    replacedByTicketId: 1,
    replacementReason: 1,
  };
  const allTickets = await Ticket.find({ bookingId: { $in: bookingIds } }, ticketProjection).lean();
  const ticketsByBookingId = allTickets.reduce((acc: Record<string, any[]>, ticket: any) => {
    const bId = ticket.bookingId.toString();
    if (!acc[bId]) acc[bId] = [];
    acc[bId].push(ticket);
    return acc;
  }, {});

  const logProjection = {
    _id: 1,
    action: 1,
    actor: 1,
    status: 1,
    createdAt: 1,
    metadata: 1,
    description: 1,
  };
  // Bulk query AuditLog documents with .lean() to match original retrieval semantics
  const allLogs = await AuditLogModel.find({
    $or: [
      { 'metadata.bookingId': { $in: bookingIds.map(id => id.toString()) } },
      { 'metadata.bookingReference': { $in: bookingReferences } }
    ],
    action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] }
  }, logProjection).sort({ createdAt: -1 }).lean();

  const logsByBookingId = allLogs.reduce((acc: Record<string, any[]>, log: any) => {
    const bId = log.metadata?.bookingId?.toString();
    const bRef = log.metadata?.bookingReference;
    if (bId) {
      if (!acc[bId]) acc[bId] = [];
      acc[bId].push(log);
    }
    if (bRef) {
      if (!acc[bRef]) acc[bRef] = [];
      acc[bRef].push(log);
    }
    return acc;
  }, {});

  // Map synchronously since mapBookingToAdminDTO is pure
  const mappedBookings = bookings.map((b) => {
    const tickets = ticketsByBookingId[b._id.toString()] || [];
    const uniqueLogs = getAuditLogsForBooking(b._id.toString(), b.bookingId, logsByBookingId);
    return mapBookingToAdminDTO(b, tickets, uniqueLogs);
  });

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
  const bookingProjection = {
    _id: 1,
    bookingId: 1,
    status: 1,
    totalAmount: 1,
    currency: 1,
    eventId: 1,
    userId: 1,
    guestName: 1,
    firstName: 1,
    lastName: 1,
    guestEmail: 1,
    guestPhone: 1,
    keepUpdated: 1,
    sendBestEvents: 1,
    tickets: 1,
    createdAt: 1,
    cancellationReason: 1,
    cancelledAt: 1,
  };
  const booking = await Booking.findOne(query, bookingProjection)
    .populate({
      path: 'eventId',
      select: '_id title startDate bannerImage bookingMode'
    })
    .lean();

  if (!booking) {
    return null;
  }

  // Load tickets and audit logs as pre-requisite for the pure mapper
  const ticketProjection = {
    bookingId: 1,
    admits: 1,
    scannedAt: 1,
    ticketId: 1,
    status: 1,
    createdAt: 1,
    replacedAt: 1,
    replacedByTicketId: 1,
    replacementReason: 1,
  };
  const tickets = await Ticket.find({ bookingId: booking._id }, ticketProjection).lean();

  const logProjection = {
    _id: 1,
    action: 1,
    actor: 1,
    status: 1,
    createdAt: 1,
    metadata: 1,
    description: 1,
  };
  const auditLogs = await AuditLogModel.find({
    $or: [
      { 'metadata.bookingId': booking._id.toString() },
      { 'metadata.bookingReference': booking.bookingId }
    ],
    action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] }
  }, logProjection).sort({ createdAt: -1 }).lean();

  return mapBookingToAdminDTO(booking, tickets, auditLogs);
};

/**
 * Atomically cancel a booking, log reasons, transition reservations, and release inventory/seats.
 */
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

export const executeCancelBookingSideEffects = async (
  payload: CancelBookingPostCommitPayload
) => {
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
        // PRICING-003: Use real actor identity instead of hardcoded 'system'
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

          // Post-commit ordering constraint: createNotificationSafe must succeed before enqueuing email job.
          // If it fails, the error is thrown, caught by the wrapper, and QueueService.enqueue is skipped.
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
};

/**
 * Atomically cancel a booking, log reasons, transition reservations, and release inventory/seats.
 */
export const cancelBooking = async (
  id: string,
  reason?: string,
  externalSession?: ClientSession,
  targetStatus: BookingStatus = BookingStatus.CANCELLED,
  actor?: { id: string; role: string }
): Promise<any> => {
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

    // PRICING-003: Check-in protection — block cancellation if any ticket is scanned (super_admin and system/internal calls are exempt)
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

    // Decrement Coupon usedCount (F1)
    if (booking.couponId) {
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
      // PRICING-003: Carry actor identity into post-commit payload for audit log integrity
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
    await executeCancelBookingSideEffects(result.postCommitPayload);
    return result.booking;
  }
  return null;
};

/**
 * Atomically expire a pending booking, log reason, transition reservations, and release inventory/seats.
 * Does not trigger any customer notifications or cancel/refund-specific logic.
 */
export const expireBooking = async (
  id: string,
  reason?: string,
  externalSession?: ClientSession
): Promise<any> => {
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

    // Decrement Coupon usedCount (F1)
    if (booking.couponId) {
      try {
        await Coupon.updateOne(
          { _id: booking.couponId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
          { session }
        );
      } catch (err) {
        logger.warn(
          { err, bookingId: booking._id, couponId: booking.couponId },
          'expireBooking: Failed to decrement coupon usedCount (possibly coupon was deleted)'
        );
      }
    }

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

  const executePostCommitEffects = async (booking: any, releasedSeatIds: string[], wasAlreadyExpired?: boolean) => {
    if (wasAlreadyExpired) return;
    try {
      // Real-time updates via WebSockets (Seat unlocked)
      if (releasedSeatIds && releasedSeatIds.length > 0) {
        emitToEvent(booking.eventId.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }, booking.bookingId);
      }

      // Emit update to Booking socket
      emitToBooking(
        booking._id.toString(),
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );

      // Emit update to Admin socket
      emitToAdmin(
        'bookings',
        'booking:updated',
        { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion },
        booking.bookingId
      );

      // Audit Logging
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
  };

  if (externalSession) {
    const res = await execute(externalSession);
    return res.wasAlreadyExpired ? null : res.booking;
  }

  const result = await runInTransaction(execute);
  if (result) {
    await executePostCommitEffects(result.booking, result.releasedSeatIds, result.wasAlreadyExpired);
    return result.wasAlreadyExpired ? null : result.booking;
  }
  return null;
};


export const executeCorrectEmailSideEffects = async (payload: any) => {
  const actions = [
    async () => {
      emitToBooking(
        payload.bookingId,
        'booking:updated',
        { bookingId: payload.bookingId, status: payload.bookingStatus, bookingVersion: payload.bookingVersion },
        payload.bookingRef
      );
    },
    async () => {
      emitToAdmin(
        'bookings',
        'booking:updated',
        { bookingId: payload.bookingId, status: payload.bookingStatus, bookingVersion: payload.bookingVersion },
        payload.bookingRef
      );
    },
    async () => {
      auditLog({
        action: 'BOOKING_EMAIL_CORRECTED',
        actor: { type: 'admin', id: payload.adminId },
        status: 'success',
        metadata: {
          bookingId: payload.bookingId,
          bookingReference: payload.bookingRef,
          oldEmail: payload.oldEmail,
          newEmail: payload.newEmail,
          reason: payload.reason,
          proactivelyLinked: payload.proactivelyLinked,
          adminDetails: payload.adminDetails,
        },
        description: `Corrected booking ${payload.bookingRef} email from ${payload.oldEmail} to ${payload.newEmail} by ${payload.adminDetails}${
          payload.proactivelyLinked ? ' (proactively linked user account)' : ''
        }`,
      });
    }
  ];

  for (const action of actions) {
    try {
      await action();
    } catch (err: any) {
      logger.error({ err }, 'Error executing booking email correction post-commit side effect');
    }
  }
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
): Promise<any> => {
  // 1. Fetch admin details outside transaction to minimize transactional locks
  const admin = await AdminModel.findById(adminId).lean();
  const adminDetails = admin ? `${admin.name} (${admin.email})` : adminId;

  const result = await runInTransaction(async (session) => {
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

    // 2. Perform one bulk ticket read
    const allTickets = await Ticket.find({ bookingId: booking._id }).session(session || null).lean();
    const activeTickets = allTickets.filter(t => t.status === 'active');

    if (activeTickets.length > 0) {
      const maxRevisionMap = new Map<string, number>();

      // Calculate highest ticket revisions in memory
      for (const t of allTickets) {
        const baseMatch = t.ticketId.match(/^(TKT-[A-Z0-9]+-\d+)(?:-R(\d+))?$/);
        if (baseMatch) {
          const base = baseMatch[1];
          const rev = baseMatch[2] ? parseInt(baseMatch[2], 10) : 0;
          const currentMax = maxRevisionMap.get(base) ?? -1;
          if (rev > currentMax) {
            maxRevisionMap.set(base, rev);
          }
        }
      }

      const bulkUpdateOps = [];
      const newTickets = [];
      const now = new Date();

      for (const oldTicket of activeTickets) {
        const baseMatch = oldTicket.ticketId.match(/^(TKT-[A-Z0-9]+-\d+)(?:-R\d+)?$/);
        const baseTicketId = baseMatch ? baseMatch[1] : oldTicket.ticketId;

        const highestRev = maxRevisionMap.get(baseTicketId) ?? 0;
        const nextRev = highestRev + 1;
        const newTicketId = `${baseTicketId}-R${nextRev}`;
        maxRevisionMap.set(baseTicketId, nextRev);

        bulkUpdateOps.push({
          updateOne: {
            filter: { _id: oldTicket._id },
            update: {
              $set: {
                status: 'replaced' as const,
                replacedByTicketId: newTicketId,
                replacedAt: now,
                replacementReason: 'EMAIL_CORRECTION' as const,
                updatedAt: now
              }
            }
          }
        });

        newTickets.push({
          ticketId: newTicketId,
          bookingId: booking._id,
          eventId: oldTicket.eventId,
          tierName: oldTicket.tierName,
          tier: oldTicket.tier,
          admits: oldTicket.admits,
          seatId: oldTicket.seatId,
          row: oldTicket.row,
          seatNumber: oldTicket.seatNumber,
          section: oldTicket.section,
          qrCode: newTicketId,
          qrCodeImage: `/api/public/tickets/${newTicketId}/qr`,
          status: 'active' as const,
          assignmentStatus: 'unassigned' as const,
        });
      }

      // 3. Execute bulk status updates and verify result atomicity
      const bulkWriteResult = await Ticket.bulkWrite(bulkUpdateOps, { session });
      if (bulkWriteResult.modifiedCount !== activeTickets.length) {
        throw new Error(`Bulk write mismatch: expected ${activeTickets.length} modified tickets, got ${bulkWriteResult.modifiedCount}`);
      }

      // 4. Execute batch insertions and verify result atomicity
      const insertedTickets = await Ticket.insertMany(newTickets, { session });
      if (insertedTickets.length !== newTickets.length) {
        throw new Error(`Bulk insert mismatch: expected ${newTickets.length} inserted tickets, got ${insertedTickets.length}`);
      }
    }

    const postCommitPayload = {
      bookingId: booking._id.toString(),
      bookingRef: booking.bookingId,
      bookingStatus: booking.status,
      bookingVersion: booking.bookingVersion,
      adminId,
      oldEmail,
      newEmail: normalizedEmail,
      reason,
      proactivelyLinked,
      adminDetails,
    };

    return { booking, postCommitPayload };
  });

  if (result) {
    await executeCorrectEmailSideEffects(result.postCommitPayload);
    return result.booking;
  }
  return null;
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

  const resendId = crypto.randomUUID();

  await QueueService.enqueue(
    getQueueName('pdf-queue'),
    'pdf:generate',
    {
      bookingId: booking._id.toString(),
      eventId: eventIdStr,
      recipientEmail: booking.guestEmail,
      guestName: booking.guestName,
      isResend: true,
      resendId,
    },
    `pdf-generate-${booking._id}-admin-resend-${resendId}`
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
export const getBookingsSummary = async (eventId?: string): Promise<BookingsSummaryResponse & { grossRevenue: number; refundAmount: number; netRevenue: number }> => {
  const cacheKey = eventId ? `bookings:summary:event:${eventId}` : 'bookings:summary:global';
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached as any;
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
    confirmed: 0,
    pending: 0,
    cancelled: 0
  };

  // Gross Revenue aggregate using Payment record as source of truth
  const paymentAggPipeline: any[] = [
    {
      $match: {
        status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] }
      }
    },
    {
      $lookup: {
        from: 'bookings',
        localField: 'bookingId',
        foreignField: '_id',
        as: 'booking'
      }
    },
    { $unwind: '$booking' }
  ];

  if (eventId) {
    paymentAggPipeline.push({
      $match: {
        'booking.eventId': new mongoose.Types.ObjectId(eventId)
      }
    });
  }

  paymentAggPipeline.push({
    $group: {
      _id: null,
      totalGross: { $sum: '$amount' }
    }
  });

  const paymentAgg = await Payment.aggregate(paymentAggPipeline);
  const grossRevenue = paymentAgg[0]?.totalGross || 0;

  // Refund Amount aggregate using Refund record as source of truth
  const refundAggPipeline: any[] = [];
  if (eventId) {
    refundAggPipeline.push(
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $match: {
          'booking.eventId': new mongoose.Types.ObjectId(eventId),
          status: 'completed'
        }
      }
    );
  } else {
    refundAggPipeline.push({
      $match: { status: 'completed' }
    });
  }
  refundAggPipeline.push({
    $group: {
      _id: null,
      totalRefunded: { $sum: '$amount' }
    }
  });

  const refundAgg = await Refund.aggregate(refundAggPipeline);
  const refundAmount = refundAgg[0]?.totalRefunded || 0;

  const netRevenue = grossRevenue - refundAmount;

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

  const result = {
    totalBookings: bookingStats.totalBookings,
    totalTickets: bookingStats.totalTickets,
    grossRevenue,
    refundAmount,
    netRevenue,
    revenue: netRevenue, // Compatibility mapping
    confirmed: bookingStats.confirmed,
    pending: bookingStats.pending,
    cancelled: bookingStats.cancelled,
    checkedIn
  };

  await CacheService.set(cacheKey, result, 60);

  return result;
};

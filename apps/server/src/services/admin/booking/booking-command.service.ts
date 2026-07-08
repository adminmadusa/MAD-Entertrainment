import crypto from 'crypto';

import { Types, ClientSession } from 'mongoose';

import { BookingStatus } from '@mad/shared';

import { getQueueName } from '../../../config/queue.config';
import { emitToAdmin, emitToBooking } from '../../../config/socket';
import { AppError } from '../../../middleware/error.middleware';
import { AdminModel } from '../../../models/admin.schema';
import { Booking } from '../../../models/booking.schema';
import { Ticket } from '../../../models/ticket.schema';
import { UserModel } from '../../../models/user.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { runInTransaction } from '../../../utils/transaction';
import { BookingLifecycleService, CancelBookingPostCommitPayload } from '../../public/booking/booking-lifecycle.service';
import { QueueService } from '../../queue.service';

export { CancelBookingPostCommitPayload };

/**
 * Wrapper delegating to BookingLifecycleService for backwards compatibility.
 */
export const cancelBooking = async (
  id: string,
  reason?: string,
  externalSession?: ClientSession,
  targetStatus: BookingStatus = BookingStatus.CANCELLED,
  actor?: { id: string; role: string }
): Promise<any> => {
  return BookingLifecycleService.cancelBooking(id, reason, externalSession, targetStatus, actor);
};

/**
 * Wrapper delegating to BookingLifecycleService for backwards compatibility.
 */
export const expireBooking = async (
  id: string,
  reason?: string,
  externalSession?: ClientSession
): Promise<any> => {
  return BookingLifecycleService.expireBooking(id, reason, externalSession);
};

/**
 * Wrapper delegating to BookingLifecycleService for backwards compatibility.
 */
export const executeCancelBookingSideEffects = async (
  payload: CancelBookingPostCommitPayload
): Promise<void> => {
  return BookingLifecycleService.executeCancelBookingSideEffects(payload);
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

    const user = await UserModel.findOne({ email: normalizedEmail }).session(session || null);
    let proactivelyLinked = false;
    if (user) {
      booking.userId = user._id as Types.ObjectId;
      proactivelyLinked = true;
    }

    booking.guestEmail = normalizedEmail;
    booking.bookingVersion += 1;

    await booking.save({ session });

    const allTickets = await Ticket.find({ bookingId: booking._id }).session(session || null).lean();
    const activeTickets = allTickets.filter(t => t.status === 'active');

    if (activeTickets.length > 0) {
      const maxRevisionMap = new Map<string, number>();

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

      const bulkWriteResult = await Ticket.bulkWrite(bulkUpdateOps, { session });
      if (bulkWriteResult.modifiedCount !== activeTickets.length) {
        throw new Error(`Bulk write mismatch: expected ${activeTickets.length} modified tickets, got ${bulkWriteResult.modifiedCount}`);
      }

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

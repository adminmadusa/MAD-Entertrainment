import { Types } from 'mongoose';
import { Ticket, ITicket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';
import { AppError } from '../../middleware/error.middleware';
import { runInTransaction } from '../../utils/transaction';
import { auditLog } from '../../utils/audit';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { getQueueName } from '../../config/queue.config';
import { NotificationType, BookingStatus } from '@mad/shared';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Assigns or reassigns an unassigned/pending ticket to a guest attendee.
 * Restricted to the Purchaser (Booking Owner).
 */
export async function assignTicket(
  ticketId: string,
  purchaserId: string,
  attendeeEmail: string
): Promise<void> {
  const normalizedEmail = attendeeEmail.toLowerCase().trim();

  // 1. Fetch ticket and validate purchaser ownership
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) {
    throw AppError.notFound('Ticket');
  }

  if (ticket.status !== 'active') {
    throw AppError.badRequest('Ticket is not active');
  }

  if (ticket.assignmentStatus === 'claimed') {
    throw AppError.badRequest('Claimed tickets cannot be reassigned. Revoke it first.');
  }

  const booking = await Booking.findById(ticket.bookingId);
  if (!booking) {
    throw AppError.notFound('Booking');
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw AppError.badRequest('Cannot assign tickets for a non-confirmed booking.');
  }

  if (booking.userId?.toString() !== purchaserId) {
    throw AppError.forbidden('You do not own this booking');
  }

  // 2. Perform the update inside a transaction session
  const updatedTicket = await runInTransaction(async (session) => {
    const updated = await Ticket.findOneAndUpdate(
      {
        ticketId,
        status: 'active',
        assignmentStatus: { $in: ['unassigned', 'pending'] },
      },
      {
        $set: {
          assignmentStatus: 'pending',
          attendeeEmail: normalizedEmail,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw AppError.badRequest('Failed to assign ticket: ticket status changed concurrently.');
    }

    return updated;
  });

  auditLog({
    action: 'TICKET_REASSIGNED',
    status: 'success',
    description: `Ticket ${ticketId} assigned/reassigned to ${normalizedEmail}`,
    actor: { type: 'user', id: purchaserId },
    metadata: { ticketId, attendeeEmail: normalizedEmail, purchaserId },
  });

  // 3. Post-Commit: Queue Invitation Notification
  try {
    const frontendUrl = getEnv().FRONTEND_URL || 'http://localhost:3000';
    const claimLink = `${frontendUrl}/claim?ticketId=${ticketId}`;
    const subject = `Invitation to claim your ticket for ${booking.guestName || 'the event'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #a855f7;">You've Been Invited!</h2>
        <p>Hi,</p>
        <p>A ticket has been assigned to you. Click the link below to claim your ticket and access your entry QR code:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${claimLink}" style="background-color: #a855f7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Claim My Ticket</a>
        </p>
        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p><a href="${claimLink}">${claimLink}</a></p>
        <br/>
        <p>MAD Entertainment Team</p>
      </div>
    `;

    const jobId = `ticket-assign-${ticketId}-${Date.now()}`;
    await createNotificationSafe({
      jobId,
      status: 'queued',
      queuedAt: new Date(),
      type: NotificationType.BOOKING_CONFIRMED,
      channel: 'email',
      recipient: normalizedEmail,
      subject,
      isSent: false,
      retryCount: 0,
      bookingId: booking._id,
      eventId: ticket.eventId,
    });

    await QueueService.enqueue(
      getQueueName('notification-queue'),
      'email-dispatch',
      {
        to: normalizedEmail,
        subject,
        html,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        bookingId: booking._id.toString(),
        eventId: ticket.eventId.toString(),
      },
      jobId
    );
  } catch (err) {
    // Log failure but do not roll back the db transaction (already committed)
    logger.error({ err }, `Post-commit enqueue failed for assignment of ${ticketId}`);
  }
}

/**
 * Claims a pending ticket for the authenticated attendee.
 */
export async function claimTicket(
  ticketId: string,
  attendeeId: string,
  attendeeEmail: string
): Promise<void> {
  const normalizedEmail = attendeeEmail.toLowerCase().trim();

  // 1. Fetch ticket and pre-validate
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) {
    throw AppError.notFound('Ticket');
  }

  if (ticket.status !== 'active') {
    throw AppError.badRequest('Ticket is not active');
  }

  if (ticket.assignmentStatus !== 'pending') {
    throw AppError.badRequest('Ticket is not pending claim');
  }

  if (ticket.attendeeEmail?.toLowerCase().trim() !== normalizedEmail) {
    throw AppError.forbidden('Your email does not match the invitation email');
  }

  const booking = await Booking.findById(ticket.bookingId);
  if (!booking) {
    throw AppError.notFound('Booking');
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw AppError.badRequest('Cannot claim tickets for a non-confirmed booking.');
  }

  // 2. Perform the update inside a transaction session
  const updatedTicket = await runInTransaction(async (session) => {
    const updated = await Ticket.findOneAndUpdate(
      {
        ticketId,
        status: 'active',
        assignmentStatus: 'pending',
        attendeeEmail: normalizedEmail,
      },
      {
        $set: {
          assignmentStatus: 'claimed',
          attendeeUserId: new Types.ObjectId(attendeeId),
          claimedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw AppError.badRequest('Claim failed: ticket status changed concurrently.');
    }

    return updated;
  });

  auditLog({
    action: 'TICKET_CLAIMED',
    status: 'success',
    description: `Ticket ${ticketId} claimed by attendee ${normalizedEmail}`,
    actor: { type: 'user', id: attendeeId },
    metadata: { ticketId, attendeeUserId: attendeeId, attendeeEmail: normalizedEmail },
  });

  // 3. Post-Commit: Queue Confirmation Notification
  try {
    const frontendUrl = getEnv().FRONTEND_URL || 'http://localhost:3000';
    const ticketsLink = `${frontendUrl}/tickets`;
    const subject = 'Ticket Claim Confirmed!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #22c55e;">Claim Successful!</h2>
        <p>Hi,</p>
        <p>Your claim for ticket <strong>${ticketId}</strong> is confirmed. You can now view your entry QR code and ticket details on your dashboard:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${ticketsLink}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Tickets</a>
        </p>
        <br/>
        <p>MAD Entertainment Team</p>
      </div>
    `;

    const jobId = `ticket-claim-${ticketId}-${Date.now()}`;
    await createNotificationSafe({
      jobId,
      status: 'queued',
      queuedAt: new Date(),
      type: NotificationType.BOOKING_CONFIRMED,
      channel: 'email',
      recipient: normalizedEmail,
      subject,
      isSent: false,
      retryCount: 0,
      bookingId: booking._id,
      eventId: ticket.eventId,
    });

    await QueueService.enqueue(
      getQueueName('notification-queue'),
      'email-dispatch',
      {
        to: normalizedEmail,
        subject,
        html,
        notificationType: NotificationType.BOOKING_CONFIRMED,
        bookingId: booking._id.toString(),
        eventId: ticket.eventId.toString(),
      },
      jobId
    );
  } catch (err) {
    logger.error({ err }, `Post-commit enqueue failed for claim of ${ticketId}`);
  }
}

/**
 * Revokes a ticket assignment, either resetting to unassigned or reissuing a new ticket.
 */
export async function revokeTicket(
  ticketId: string,
  purchaserId: string
): Promise<void> {
  // 1. Fetch ticket and validate
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) {
    throw AppError.notFound('Ticket');
  }

  if (ticket.status !== 'active') {
    throw AppError.badRequest('Ticket is not active');
  }

  if (ticket.scannedAt) {
    throw AppError.badRequest('Scanned tickets cannot be revoked');
  }

  const booking = await Booking.findById(ticket.bookingId);
  if (!booking) {
    throw AppError.notFound('Booking');
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw AppError.badRequest('Cannot revoke tickets for a non-confirmed booking.');
  }

  if (booking.userId?.toString() !== purchaserId) {
    throw AppError.forbidden('You do not own this booking');
  }

  const previousStatus = ticket.assignmentStatus;
  const previousAttendeeEmail = ticket.attendeeEmail;

  // 2. Perform the update inside a transaction session
  const result = await runInTransaction(async (session) => {
    if (previousStatus === 'pending') {
      // Pending reset flow (idempotent reset to unassigned)
      const updated = await Ticket.findOneAndUpdate(
        { ticketId, status: 'active', assignmentStatus: 'pending' },
        {
          $set: {
            assignmentStatus: 'unassigned',
            attendeeEmail: undefined,
          },
        },
        { new: true, session }
      );

      if (!updated) {
        throw AppError.badRequest('Failed to revoke: ticket status changed concurrently.');
      }

      return { type: 'reset' as const, newTicketId: ticketId };
    } else if (previousStatus === 'claimed') {
      // Claimed void-and-reissue flow
      const baseMatch = ticket.ticketId.match(/^(TKT-[A-Z0-9]+-\d+)(?:-R\d+)?$/);
      const baseTicketId = baseMatch ? baseMatch[1] : ticket.ticketId;

      const count = await Ticket.countDocuments({
        ticketId: { $regex: new RegExp(`^${baseTicketId}(?:-R\\d+)?$`) },
      }).session(session || null);

      let rev = count;
      let newTicketId = `${baseTicketId}-R${rev}`;
      while (await Ticket.exists({ ticketId: newTicketId }).session(session || null)) {
        rev++;
        newTicketId = `${baseTicketId}-R${rev}`;
      }

      // Mark current ticket as replaced
      ticket.status = 'replaced';
      ticket.replacedByTicketId = newTicketId;
      ticket.replacedAt = new Date();
      ticket.replacementReason = 'ADMIN_REISSUE';
      await ticket.save({ session: session || undefined });

      // Create new unassigned active ticket
      const newTicket = new Ticket({
        ticketId: newTicketId,
        bookingId: booking._id,
        eventId: booking.eventId,
        tierName: ticket.tierName,
        tier: ticket.tier,
        admits: ticket.admits,
        seatId: ticket.seatId,
        row: ticket.row,
        seatNumber: ticket.seatNumber,
        section: ticket.section,
        qrCode: newTicketId,
        qrCodeImage: `/api/public/tickets/${newTicketId}/qr`,
        status: 'active',
        assignmentStatus: 'unassigned',
      });
      await newTicket.save({ session: session || undefined });

      return { type: 'reissue' as const, newTicketId };
    } else {
      throw AppError.badRequest('Ticket is already unassigned');
    }
  });

  if (result.type === 'reset') {
    auditLog({
      action: 'TICKET_REVOKED',
      status: 'success',
      description: `Ticket ${ticketId} reassignment pending invitation revoked`,
      actor: { type: 'user', id: purchaserId },
      metadata: { ticketId, purchaserId },
    });
  } else {
    auditLog({
      action: 'TICKET_REVOKED',
      status: 'success',
      description: `Ticket ${ticket.ticketId} revoked, voided, and replaced with ${result.newTicketId}`,
      actor: { type: 'user', id: purchaserId },
      metadata: { ticketId: ticket.ticketId, newTicketId: result.newTicketId, purchaserId },
    });
  }

  // 3. Post-Commit: Queue Notifications
  try {
    if (previousAttendeeEmail) {
      const subject = 'Ticket Invitation Cancelled';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #ef4444;">Ticket Assignment Cancelled</h2>
          <p>Hi,</p>
          <p>Your assignment/invitation for ticket <strong>${ticketId}</strong> has been cancelled by the ticket purchaser.</p>
          <p>This ticket QR code and entry credential is no longer valid.</p>
          <br/>
          <p>MAD Entertainment Team</p>
        </div>
      `;

      const jobId = `ticket-revoke-${ticketId}-${Date.now()}`;
      await createNotificationSafe({
        jobId,
        status: 'queued',
        queuedAt: new Date(),
        type: NotificationType.BOOKING_CONFIRMED,
        channel: 'email',
        recipient: previousAttendeeEmail,
        subject,
        isSent: false,
        retryCount: 0,
        bookingId: booking._id,
        eventId: ticket.eventId,
      });

      await QueueService.enqueue(
        getQueueName('notification-queue'),
        'email-dispatch',
        {
          to: previousAttendeeEmail,
          subject,
          html,
          notificationType: NotificationType.BOOKING_CONFIRMED,
          bookingId: booking._id.toString(),
          eventId: ticket.eventId.toString(),
        },
        jobId
      );
    }

    if (result.type === 'reissue') {
      const purchaserEmail = booking.guestEmail;
      if (purchaserEmail) {
        const subject = 'Ticket Reissue Confirmed';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #a855f7;">Ticket Reissued Successfully</h2>
            <p>Hi ${booking.guestName || 'there'},</p>
            <p>You have successfully revoked ticket <strong>${ticketId}</strong>.</p>
            <p>A new active ticket has been reissued to your booking with Ticket ID <strong>${result.newTicketId}</strong> and is currently unassigned.</p>
            <p>You can reassign it at any time from your dashboard.</p>
            <br/>
            <p>MAD Entertainment Team</p>
          </div>
        `;

        const jobId = `ticket-reissue-${result.newTicketId}-${Date.now()}`;
        await createNotificationSafe({
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: NotificationType.BOOKING_CONFIRMED,
          channel: 'email',
          recipient: purchaserEmail,
          subject,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: ticket.eventId,
        });

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: purchaserEmail,
            subject,
            html,
            notificationType: NotificationType.BOOKING_CONFIRMED,
            bookingId: booking._id.toString(),
            eventId: ticket.eventId.toString(),
          },
          jobId
        );
      }
    }
  } catch (err) {
    logger.error({ err }, `Post-commit enqueue failed for revocation of ${ticketId}`);
  }
}

/**
 * Retrieves all active tickets claimed by the logged-in attendee user.
 */
export async function getAttendeeTickets(userId: string): Promise<any[]> {
  const tickets = await Ticket.find({
    attendeeUserId: new Types.ObjectId(userId),
    status: 'active',
    assignmentStatus: 'claimed',
  }).populate('eventId');

  return tickets;
}

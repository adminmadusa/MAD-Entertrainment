import { NotificationType } from '@mad/shared';
import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { logger } from '../../utils/logger';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';

export async function sendTicketAssignmentEmail(params: {
  ticketId: string;
  normalizedEmail: string;
  booking: any;
  ticket: any;
}): Promise<void> {
  const { ticketId, normalizedEmail, booking, ticket } = params;
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
    logger.error({ err, ticketId }, 'Post-commit enqueue failed for assignment');
  }
}

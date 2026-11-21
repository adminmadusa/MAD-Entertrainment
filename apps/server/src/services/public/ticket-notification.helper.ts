import { NotificationType } from '@mad/shared';
import { getPublicWebUrl } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { ticketInvitationHtml } from '../../lib/email';
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
    const webUrl = getPublicWebUrl();
    const claimLink = `${webUrl}/claim?ticketId=${ticketId}`;
    const eventTitle = ticket.eventTitle || 'MAD Event';
    const subject = `Invitation to claim your ticket for ${ticket.eventTitle || booking.guestName || 'the event'}`;
    const html = await ticketInvitationHtml({
      recipientName: ticket.guestName || undefined,
      inviterName: booking.guestName || undefined,
      eventTitle,
      claimUrl: claimLink,
      tierName: ticket.tierName || ticket.tier || undefined,
    });

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

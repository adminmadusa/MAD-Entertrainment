import { Request, Response, NextFunction } from 'express';

import {
  magicLinkHtml,
  bookingConfirmationHtml,
  ticketDeliveryHtml,
  ticketInvitationHtml,
  fullRefundHtml,
  partialRefundHtml,
  paymentFailureHtml,
  eventCancellationHtml,
} from '../../lib/email';
import { AppError } from '../../middleware/error.middleware';
import { sendSuccess } from '../../utils/response';

export const AVAILABLE_TEMPLATES = [
  { id: 'magic_link', name: 'Login Passcode / OTP', category: 'Authentication' },
  { id: 'booking_confirmation', name: 'Booking Confirmation & Invoice', category: 'Transaction' },
  { id: 'ticket_delivery', name: 'Door-Entry Ticket Pass', category: 'Ticketing' },
  { id: 'ticket_invitation', name: 'Ticket Claim & Invitation', category: 'Ticketing' },
  { id: 'full_refund', name: '100% Full Refund Notice', category: 'Refunds' },
  { id: 'partial_refund', name: 'Partial Refund Breakdown', category: 'Refunds' },
  { id: 'payment_failure', name: 'Payment Failed & Recovery', category: 'Payment' },
  { id: 'event_cancellation', name: 'Event Cancellation Alert', category: 'Lifecycle' },
];

export async function listEmailTemplates(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, AVAILABLE_TEMPLATES, 'Email templates listed');
}

export async function previewEmailTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { templateId } = req.params;
    let html = '';
    let subject = '';

    switch (templateId) {
      case 'magic_link':
        subject = 'Sign in to MAD Entertainment';
        html = await magicLinkHtml({
          email: 'attendee@example.com',
          otpCode: '849201',
        });
        break;
      case 'booking_confirmation':
        subject = 'Your Ticket for MAD Summer Festival 2026 [MAD-2026-8899]';
        html = await bookingConfirmationHtml({
          customerName: 'Sarah Jenkins',
          customerEmail: 'sarah.jenkins@example.com',
          eventTitle: 'MAD Summer Festival 2026',
          bookingReference: 'MAD-2026-8899',
          eventDate: 'August 30, 2026',
          eventTime: '07:30 PM CST',
          venueName: 'MAD Arena, Austin, TX',
          venueAddress: '100 Entertainment Way, Austin, TX 78701',
          tickets: [
            { tierName: 'VIP Pass', quantity: 2, price: 150 },
            { tierName: 'General Admission', quantity: 1, price: 65 },
          ],
          subtotal: 365,
          convenienceFee: 6,
          taxLabel: 'Sales Tax',
          taxPercentage: 8.25,
          taxAmount: 30.61,
          discount: 25,
          couponCode: 'EARLYBIRD',
          totalAmount: 376.61,
          currency: 'USD',
          paymentGateway: 'Stripe',
          paymentTransactionId: 'pi_3MtwBwLkdIwHu7ix28a3tq50',
          paidAt: 'Aug 22, 2026, 09:30 AM',
          ticketUrl: 'https://www.madentertainments.net/tickets?ref=MAD-2026-8899',
          manageTicketsUrl: 'https://www.madentertainments.net/tickets',
          hasPdfAttachment: true,
        });
        break;
      case 'ticket_delivery':
        subject = 'Your Tickets — MAD Summer Festival 2026';
        html = await ticketDeliveryHtml({
          customerName: 'Sarah Jenkins',
          eventTitle: 'MAD Summer Festival 2026',
          eventDate: 'August 30, 2026',
          venue: 'MAD Arena, Austin, TX',
          bookingReference: 'MAD-2026-8899',
        });
        break;
      case 'ticket_invitation':
        subject = 'Invitation to claim your ticket for MAD Summer Festival 2026';
        html = await ticketInvitationHtml({
          recipientName: 'Alex Mercer',
          inviterName: 'Sarah Jenkins',
          eventTitle: 'MAD Summer Festival 2026',
          eventDate: 'August 30, 2026',
          venueName: 'MAD Arena, Austin, TX',
          claimUrl: 'https://www.madentertainments.net/claim?ticketId=tix_sample_9918',
          tierName: 'VIP Pass',
        });
        break;
      case 'full_refund':
        subject = 'Refund Completed — MAD-2026-8899';
        html = await fullRefundHtml({
          customerName: 'Sarah Jenkins',
          bookingReference: 'MAD-2026-8899',
          eventTitle: 'MAD Summer Festival 2026',
          refundAmount: 376.61,
          refundDate: 'August 22, 2026',
          settlementTimeline: '5-7 business days',
          currency: 'USD',
        });
        break;
      case 'partial_refund':
        subject = 'Partial Refund Completed — MAD-2026-8899';
        html = await partialRefundHtml({
          customerName: 'Sarah Jenkins',
          bookingReference: 'MAD-2026-8899',
          originalAmount: 376.61,
          refundAmount: 65.0,
          remainingAmount: 311.61,
          reason: 'Tier downgrade refund',
          currency: 'USD',
        });
        break;
      case 'payment_failure':
        subject = 'Payment Failed — MAD-2026-8899';
        html = await paymentFailureHtml({
          customerName: 'Sarah Jenkins',
          eventTitle: 'MAD Summer Festival 2026',
          bookingReference: 'MAD-2026-8899',
          retryUrl: 'https://www.madentertainments.net/checkout/MAD-2026-8899',
        });
        break;
      case 'event_cancellation':
        subject = 'Event Cancelled — MAD Summer Festival 2026';
        html = await eventCancellationHtml({
          customerName: 'Sarah Jenkins',
          eventTitle: 'MAD Summer Festival 2026',
          eventDate: 'August 30, 2026',
          venueName: 'MAD Arena, Austin, TX',
          bookingReference: 'MAD-2026-8899',
        });
        break;
      default:
        return next(AppError.notFound(`Template '${templateId}' not found`));
    }

    sendSuccess(res, { templateId, subject, html }, 'Template rendered successfully');
  } catch (err) {
    next(err);
  }
}

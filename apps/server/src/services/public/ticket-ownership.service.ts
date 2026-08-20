import crypto from 'crypto';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { PublicBookingService } from './booking.service';

// ─────────────────────────────────────────────
// Stateless HMAC QR Token Helpers
// Token format: <expiryTimestamp>.<signature>
// Signature: HMAC-SHA256(ticketId + ":" + expiryTimestamp, JWT_SESSION_SECRET)
// ─────────────────────────────────────────────

/**
 * Generates a stateless HMAC-signed query token for a ticketId.
 * The token is appended to qrCodeImage URLs so browser <img> requests
 * can be authenticated without Authorization headers.
 * TTL: 5 minutes from generation.
 */
export function generateTicketQrToken(ticketId: string): string {
  const env = getEnv();
  const expiryTimestamp = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
  const dataToSign = `${ticketId}:${expiryTimestamp}`;

  const signature = crypto
    .createHmac('sha256', env.JWT_SESSION_SECRET)
    .update(dataToSign)
    .digest('hex');

  return `${expiryTimestamp}.${signature}`;
}

/**
 * Constructs the full relative QR code image URL for a ticketId.
 * Generates a fresh 5-minute HMAC token and embeds it as a ?token= query param.
 * This is the single source of truth for the qrCodeImage URL format.
 */
export function buildQrCodeImageUrl(ticketId: string): string {
  const token = generateTicketQrToken(ticketId);
  return `/api/public/tickets/${ticketId}/qr?token=${token}`;
}

/**
 * Verifies a stateless HMAC-signed token for a ticketId.
 * Returns true only if the token is well-formed, not expired, and
 * the signature matches exactly (timing-safe comparison).
 * Returns false on any validation failure — never throws.
 */
export function verifyTicketQrToken(ticketId: string, token: string): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiryStr, signature] = parts;
  const expiryTimestamp = parseInt(expiryStr, 10);

  if (isNaN(expiryTimestamp) || expiryTimestamp < Date.now()) {
    return false;
  }

  try {
    const env = getEnv();
    const dataToSign = `${ticketId}:${expiryTimestamp}`;

    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SESSION_SECRET)
      .update(dataToSign)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Asserts that the requester is the purchaser (booking owner) of the given ticket.
 * Throws 404 if ticket/booking not found, 403 if user is not authorized.
 */
export async function assertPurchaserOwnsTicket(
  ticketId: string,
  userId: string
): Promise<void> {
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) {
    throw AppError.notFound('Ticket');
  }

  const booking = await Booking.findById(ticket.bookingId);
  if (!booking) {
    throw AppError.notFound('Booking');
  }

  const isOwner = booking.userId && booking.userId.toString() === userId;
  if (!isOwner) {
    throw AppError.forbidden('You do not have access to this ticket');
  }
}

/**
 * Asserts that the requester is the assigned attendee of the given ticket.
 * Throws 404 if ticket not found, 403 if user is not authorized.
 */
export async function assertAttendeeOwnsTicket(
  ticketId: string,
  userId: string
): Promise<void> {
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) {
    throw AppError.notFound('Ticket');
  }

  const isOwner = ticket.attendeeUserId && ticket.attendeeUserId.toString() === userId;
  if (!isOwner) {
    throw AppError.forbidden('You do not have access to this ticket');
  }
}

/**
 * Evaluates whether a user or session is authorized to view a ticket's QR code.
 * Rules:
 *   - Unassigned -> Purchaser only
 *   - Pending -> Nobody (False)
 *   - Claimed -> Assigned attendee only
 */
export async function canViewTicketQR(
  ticket: any,
  userId?: string,
  sessionId?: string
): Promise<boolean> {
  if (ticket.status !== 'active') {
    return false;
  }

  if (ticket.assignmentStatus === 'pending') {
    return false;
  }

  if (ticket.assignmentStatus === 'claimed') {
    return !!ticket.attendeeUserId && !!userId && ticket.attendeeUserId.toString() === userId;
  }

  if (ticket.assignmentStatus === 'unassigned') {
    let booking = ticket.bookingId;
    if (booking && typeof booking === 'object' && 'userId' in booking) {
      // already populated or partial object
    } else {
      booking = await Booking.findById(ticket.bookingId).lean();
    }

    if (!booking) {
      return false;
    }

    try {
      PublicBookingService.assertBookingAccess(booking, { userId, sessionId }, 'Fulfillment');
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Asserts that the requester or token is authorized to view a ticket's QR code.
 * Throws 403 if access is denied.
 */
export async function assertCanViewTicketQR(
  ticket: any,
  token?: string,
  userId?: string,
  sessionId?: string
): Promise<void> {
  if (token && verifyTicketQrToken(ticket.ticketId, token)) {
    return;
  }
  const isOwner = await canViewTicketQR(ticket, userId, sessionId);
  if (!isOwner) {
    throw AppError.forbidden('You do not have permission to view this QR code');
  }
}

/**
 * Evaluates whether a user has permission to download a ticket PDF based on their role.
 * Rules:
 *   - Purchaser PDF: Can download (with claimed masking applied during generation/serialization)
 *   - Attendee PDF: Can download only if ticket is claimed and assignee matches
 */
export async function canDownloadTicketPDF(
  ticket: any,
  role: 'purchaser' | 'attendee',
  userId?: string,
  sessionId?: string
): Promise<boolean> {
  if (ticket.status !== 'active') {
    return false;
  }

  if (role === 'attendee') {
    return (
      ticket.assignmentStatus === 'claimed' &&
      !!ticket.attendeeUserId &&
      !!userId &&
      ticket.attendeeUserId.toString() === userId
    );
  }

  if (role === 'purchaser') {
    let booking = ticket.bookingId;
    if (booking && typeof booking === 'object' && 'userId' in booking) {
      // populated
    } else {
      booking = await Booking.findById(ticket.bookingId).lean();
    }

    if (!booking) {
      return false;
    }

    try {
      PublicBookingService.assertBookingAccess(booking, { userId, sessionId }, 'Fulfillment');
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Validates whether the purchaser is permitted to view the QR code in a printed/downloaded PDF.
 */
export function canRenderPurchaserPDFQR(ticket: any): boolean {
  return ticket.assignmentStatus === 'unassigned';
}

/**
 * Validates whether the attendee is permitted to view the QR code in a printed/downloaded PDF.
 */
export function canRenderAttendeePDFQR(ticket: any, userId?: string): boolean {
  return (
    ticket.assignmentStatus === 'claimed' &&
    !!ticket.attendeeUserId &&
    !!userId &&
    ticket.attendeeUserId.toString() === userId
  );
}

/**
 * Retrieves the visibility state and appropriate message description for the purchaser PDF QR code.
 */
export function getPurchaserPDFTicketState(ticket: any): { canRenderQR: boolean; message?: string } {
  if (ticket.assignmentStatus === 'unassigned') {
    return { canRenderQR: true };
  }

  if (ticket.assignmentStatus === 'pending') {
    return {
      canRenderQR: false,
      message: 'Ticket Assigned\n\nThis ticket has been assigned and is awaiting attendee claim.\nQR access is unavailable.',
    };
  }

  if (ticket.assignmentStatus === 'claimed') {
    return {
      canRenderQR: false,
      message: 'Claimed By Attendee\n\nThis ticket has been claimed.\nOnly the attendee can access this QR code.',
    };
  }

  return { canRenderQR: false, message: 'Restricted Access\n\nQR access is unavailable.' };
}

import { Ticket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';
import { AppError } from '../../middleware/error.middleware';

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

    const isUserOwner = !!booking.userId && !!userId && booking.userId.toString() === userId;
    const isGuestOwner = !booking.userId && !!booking.sessionId && !!sessionId && booking.sessionId === sessionId;
    return !!(isUserOwner || isGuestOwner);
  }

  return false;
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
  userId?: string
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

    return !!booking.userId && !!userId && booking.userId.toString() === userId;
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

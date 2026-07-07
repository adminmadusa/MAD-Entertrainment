import { Types } from 'mongoose';

import { BookingStatus } from '@mad/shared';

import { AuditLogModel } from '../../models/audit-log.schema';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';

export interface ScanRequestPayload {
  ticketId: string;
  eventId: string;
  scannerId: string;
  requestId?: string;
  source?: 'camera' | 'manual' | 'hardware';
  offline?: boolean;
}

export type ValidationStatus = 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID' | 'EXPIRED' | 'WRONG_EVENT' | 'OFFLINE_QUEUED' | 'ERROR';

export interface ValidationResult {
  status: ValidationStatus;
  ticketId: string;
  tierName?: string;
  admits?: number;
  message?: string;
  scannedAt?: string;
  attendeeEmail?: string;
  guestName?: string;
}

export async function validateAndCheckInTicket(payload: ScanRequestPayload): Promise<ValidationResult> {
  const { ticketId, eventId, scannerId, requestId } = payload;

  // 1. Idempotency Check via Audit Logs
  if (requestId && typeof requestId === 'string') {
    const existingLog = await AuditLogModel.findOne({
      action: 'TICKET_SCAN',
      'metadata.requestId': { $eq: requestId },
      status: 'success',
    });
    if (existingLog) {
      return {
        status: 'SUCCESS',
        ticketId: existingLog.metadata?.ticketId,
        tierName: existingLog.metadata?.tierName,
        admits: existingLog.metadata?.admits,
        scannedAt: existingLog.metadata?.scannedAt || existingLog.createdAt.toISOString(),
        attendeeEmail: existingLog.metadata?.attendeeEmail,
        guestName: existingLog.metadata?.guestName,
        message: 'Replayed validation success (idempotent).',
      };
    }
  }

  // 2. Fetch Ticket
  if (typeof ticketId !== 'string') {
    return { status: 'INVALID', ticketId: String(ticketId), message: 'Invalid ticket reference: Ticket not found.' };
  }
  const ticket = await Ticket.findOne({ ticketId: { $eq: ticketId } });
  if (!ticket) {
    return { status: 'INVALID', ticketId, message: 'Invalid ticket reference: Ticket not found.' };
  }

  // 3. Event Validation
  if (String(ticket.eventId) !== String(eventId)) {
    return { status: 'WRONG_EVENT', ticketId, message: 'Validation failed: This ticket is registered for a different event.' };
  }

  // 4. Ticket Status Check
  const isEntryValid =
    ticket.status === 'active' &&
    (
      ticket.assignmentStatus === 'unassigned' ||
      ticket.assignmentStatus === 'claimed'
    );
  if (!isEntryValid) {
    return { status: 'INVALID', ticketId, message: 'Ticket is not valid for entry' };
  }

  // 5. Already Checked In
  if (ticket.scannedAt) {
    return {
      status: 'ALREADY_SCANNED',
      ticketId,
      message: `Ticket already used: Checked in at ${new Date(ticket.scannedAt).toLocaleTimeString('en-IN')} on ${new Date(ticket.scannedAt).toLocaleDateString('en-IN')}.`,
      scannedAt: ticket.scannedAt.toISOString(),
    };
  }

  // 6. Booking Check
  const booking = await Booking.findById(ticket.bookingId);
  if (!booking) {
    return { status: 'INVALID', ticketId, message: 'Invalid ticket reference: Associated booking not found.' };
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return {
      status: 'INVALID',
      ticketId,
      message: `Validation failed: Booking is ${booking.status.toUpperCase()}. Only confirmed bookings can be scanned.`,
    };
  }

  // 7. Atomic Check-in
  const updatedTicket = await Ticket.findOneAndUpdate(
    {
      _id: ticket._id,
      status: 'active',
      $or: [{ scannedAt: { $exists: false } }, { scannedAt: null }],
    },
    { $set: { scannedAt: new Date(), scannedById: new Types.ObjectId(scannerId) } },
    { new: true }
  );

  if (!updatedTicket) {
    const alreadyCheckedTicket = await Ticket.findById(ticket._id);
    return {
      status: 'ALREADY_SCANNED',
      ticketId,
      message: `Ticket already used: Checked in at ${alreadyCheckedTicket?.scannedAt ? new Date(alreadyCheckedTicket.scannedAt).toLocaleTimeString('en-IN') : 'an unknown time'} on ${alreadyCheckedTicket?.scannedAt ? new Date(alreadyCheckedTicket.scannedAt).toLocaleDateString('en-IN') : 'an unknown date'}.`,
      scannedAt: alreadyCheckedTicket?.scannedAt?.toISOString() || new Date().toISOString(),
    };
  }

  return {
    status: 'SUCCESS',
    ticketId: updatedTicket.ticketId,
    tierName: updatedTicket.tierName,
    admits: updatedTicket.admits || 1,
    scannedAt: updatedTicket.scannedAt?.toISOString(),
    attendeeEmail: updatedTicket.attendeeEmail,
    guestName: booking.guestName,
    message: 'Ticket scanned and verified successfully.',
  };
}

export async function getScannerStats(eventId: string) {
  const eventIdObj = new Types.ObjectId(eventId);

  const totalTickets = await Ticket.countDocuments({ eventId: eventIdObj, status: 'active' });
  const checkedIn = await Ticket.countDocuments({ eventId: eventIdObj, status: 'active', scannedAt: { $ne: null } });
  const remaining = Math.max(0, totalTickets - checkedIn);

  // Derived stats from AuditLogModel for 'TICKET_SCAN'
  const totalScans = await AuditLogModel.countDocuments({ action: 'TICKET_SCAN', 'metadata.eventId': String(eventId) });
  const successfulScans = await AuditLogModel.countDocuments({ action: 'TICKET_SCAN', 'metadata.eventId': String(eventId), status: 'success' });
  const duplicateScans = await AuditLogModel.countDocuments({ action: 'TICKET_SCAN', 'metadata.eventId': String(eventId), 'metadata.result': 'ALREADY_SCANNED' });
  const failedScans = await AuditLogModel.countDocuments({ action: 'TICKET_SCAN', 'metadata.eventId': String(eventId), status: 'failure', 'metadata.result': { $ne: 'ALREADY_SCANNED' } });
  const offlineSynced = await AuditLogModel.countDocuments({ action: 'TICKET_SCAN', 'metadata.eventId': String(eventId), 'metadata.offline': true, status: 'success' });

  const successRate = totalScans > 0 ? Number(((successfulScans / totalScans) * 100).toFixed(2)) : 0;

  const lastTicket = await Ticket.findOne({ eventId: eventIdObj, status: 'active', scannedAt: { $ne: null } })
    .sort({ scannedAt: -1 })
    .select('scannedAt');

  return {
    totalTickets,
    checkedIn,
    remaining,
    failedScans,
    duplicateScans,
    offlinePending: 0,
    offlineSynced,
    successRate,
    lastScanTime: lastTicket?.scannedAt ? lastTicket.scannedAt.toISOString() : null,
    averageScanTime: 0,
  };
}

export async function getScannerHistory(eventId: string, filters: {
  page?: number;
  limit?: number;
  status?: string;
  operator?: string;
  search?: string;
}) {
  const { page = 1, limit = 50, status, operator, search } = filters;
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {
    action: 'TICKET_SCAN',
    'metadata.eventId': String(eventId),
  };

  if (status) {
    if (status.toUpperCase() === 'SUCCESS') {
      query.status = 'success';
    } else {
      query.status = 'failure';
      if (status.toUpperCase() === 'ALREADY_SCANNED' || status.toUpperCase() === 'INVALID') {
        query['metadata.result'] = status.toUpperCase();
      }
    }
  }

  if (operator) {
    query['actor.id'] = operator;
  }

  if (search) {
    query.$or = [
      { 'metadata.ticketId': { $regex: search, $options: 'i' } },
      { 'metadata.guestName': { $regex: search, $options: 'i' } },
      { 'metadata.tierName': { $regex: search, $options: 'i' } },
    ];
  }

  const logs = await AuditLogModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLogModel.countDocuments(query);

  return {
    items: logs.map(log => ({
      id: log._id.toString(),
      ticketId: log.metadata?.ticketId,
      guestName: log.metadata?.guestName || 'N/A',
      tierName: log.metadata?.tierName || 'N/A',
      scannedAt: log.createdAt.toISOString(),
      status: log.metadata?.result || (log.status === 'success' ? 'SUCCESS' : 'ERROR'),
      operatorId: log.actor?.id,
      scanSource: log.metadata?.scanSource || 'manual',
      offline: log.metadata?.offline || false,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

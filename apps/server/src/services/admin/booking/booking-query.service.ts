import { Types } from 'mongoose';

import { AuditLogModel } from '../../../models/audit-log.schema';
import { Booking } from '../../../models/booking.schema';
import { Ticket } from '../../../models/ticket.schema';
import { getAuditLogsForBooking, mapBookingToAdminDTO } from './booking-dto.mapper';

export { getBookingsSummary } from './booking-summary.service';

/**
 * Fetch paginated list of bookings with optional status and fuzzy reference/email filtering.
 */
export const getBookings = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  eventId?: string,
  sortField?: string,
  sortOrder?: 'asc' | 'desc'
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

  const SORT_FIELDS: Record<string, string> = {
    bookingId: 'bookingId',
    totalAmount: 'totalAmount',
    createdAt: 'createdAt',
  };
  const validSortField = sortField ? (SORT_FIELDS[sortField] ?? 'createdAt') : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions: any = { [validSortField]: sortDirection };
  if (validSortField !== 'createdAt') sortOptions.createdAt = -1;
  sortOptions._id = 1;

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
      select: '_id title startDate bannerImage bookingMode',
    })
    .sort(sortOptions)
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
  const allLogs = await AuditLogModel.find(
    {
      $or: [
        { 'metadata.bookingId': { $in: bookingIds.map((id) => id.toString()) } },
        { 'metadata.bookingReference': { $in: bookingReferences } },
      ],
      action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] },
    },
    logProjection
  )
    .sort({ createdAt: -1 })
    .lean();

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
      select: '_id title startDate bannerImage bookingMode',
    })
    .lean();

  if (!booking) {
    return null;
  }

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
  const auditLogs = await AuditLogModel.find(
    {
      $or: [
        { 'metadata.bookingId': booking._id.toString() },
        { 'metadata.bookingReference': booking.bookingId },
      ],
      action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] },
    },
    logProjection
  )
    .sort({ createdAt: -1 })
    .lean();

  return mapBookingToAdminDTO(booking, tickets, auditLogs);
};

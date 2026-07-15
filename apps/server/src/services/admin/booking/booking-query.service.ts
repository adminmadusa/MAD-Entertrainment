import mongoose, { Types } from 'mongoose';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { AuditLogModel } from '../../../models/audit-log.schema';
import { Booking } from '../../../models/booking.schema';
import { Payment } from '../../../models/payment.schema';
import { Refund } from '../../../models/refund.schema';
import { Ticket } from '../../../models/ticket.schema';
import type { BookingsSummaryResponse } from '../../../types/admin/booking.types';
import { CacheService } from '../../cache.service';

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
      select: '_id title startDate bannerImage bookingMode'
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

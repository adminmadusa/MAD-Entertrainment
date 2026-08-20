/**
 * Maps a Mongoose Booking document onto a safe Normalized AdminBooking DTO representation with dynamic attendance.
 */
export const mapBookingToAdminDTO = (booking: any, ticketsList: any[], auditLogs: any[]) => {
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
    currency: booking.currency || 'USD',
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
export const getAuditLogsForBooking = (
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

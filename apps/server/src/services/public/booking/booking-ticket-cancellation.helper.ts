import { ClientSession, Types } from 'mongoose';
import { BookingStatus, SeatStatus } from '@mad/shared';
import { AppError } from '../../../middleware/error.middleware';
import { Booking } from '../../../models/booking.schema';
import { Event } from '../../../models/event.schema';
import { SeatLayout } from '../../../models/seat-layout.schema';
import { Ticket } from '../../../models/ticket.schema';

export async function cancelSpecificTicketsHelper(
  bookingId: string | Types.ObjectId,
  ticketIds: string[],
  actor: { id: string; role: string },
  session?: ClientSession
) {
  const booking = await Booking.findById(bookingId).session(session || null);
  if (!booking) throw AppError.notFound('Booking not found');

  if (booking.status !== BookingStatus.CONFIRMED) {
    throw AppError.badRequest(`Booking is already in a terminal state: ${booking.status}`);
  }

  const ticketsToCancel = await Ticket.find({
    _id: { $in: ticketIds },
    bookingId: booking._id,
    status: 'active',
  }).session(session || null);

  if (ticketsToCancel.length === 0) {
    return { booking, postCommitPayload: null };
  }

  if (actor && actor.role !== 'super_admin') {
    const scannedTickets = ticketsToCancel.filter((t: any) => t.scannedAt !== null);
    if (scannedTickets.length > 0) {
      throw AppError.badRequest(
        'Cancellation blocked: Selected tickets are checked-in. Only super_admin can cancel checked-in tickets.'
      );
    }
  }

  // 1. Void tickets
  await Ticket.updateMany(
    { _id: { $in: ticketsToCancel.map((t) => t._id) } },
    { $set: { status: 'voided', updatedAt: new Date() } },
    { session }
  );

  // 2. Update Event statistics
  const event = await Event.findById(booking.eventId).session(session || null);
  if (event) {
    const decUpdate: Record<string, number> = {
      soldCount: -ticketsToCancel.length,
      eventVersion: 1,
    };

    for (const t of ticketsToCancel) {
      const tierIndex = event.ticketTiers.findIndex((tier) => tier.tier === t.tier);
      if (tierIndex !== -1) {
        const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
        decUpdate[`ticketTiers.${tierIndex}.soldCount`] = -(1 * groupSize);
      }
    }

    const nextSoldCount = Math.max(0, (event.soldCount || 0) - ticketsToCancel.length);
    const shouldBeSoldOut = event.totalCapacity > 0 && nextSoldCount >= event.totalCapacity;

    await Event.findOneAndUpdate(
      { _id: booking.eventId },
      { $inc: decUpdate, $set: { isSoldOut: shouldBeSoldOut } },
      { new: true, session }
    );
  }

  // 3. Release Seats
  if (event && event.bookingMode === 'seat_based') {
    const allSeatIds = ticketsToCancel.map((t) => t.seatId).filter(Boolean);
    if (allSeatIds.length > 0) {
      await SeatLayout.updateOne(
        { eventId: event._id },
        {
          $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
            'seats.$[seat].bookedByBookingId': '',
            'seats.$[seat].reservationId': '',
          },
          $inc: { 'seats.$[seat].seatVersion': 1 },
        },
        {
          arrayFilters: [
            {
              'seat.seatId': { $in: allSeatIds },
              $or: [
                { 'seat.bookedByBookingId': booking._id.toString() },
                { 'seat.reservationId': { $in: booking.reservationIds || [] } },
              ],
            },
          ],
          session,
        }
      );
    }
  }

  return { booking, postCommitPayload: null };
}

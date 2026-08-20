import { BookingStatus, BookingMode, ReservationStatus, SeatStatus } from '@mad/shared';
import { emitToAdmin } from '../../../config/socket';
import { IBooking } from '../../../models/booking.schema';
import { SeatLayout } from '../../../models/seat-layout.schema';
import { logger } from '../../../utils/logger';
import { ReservationService } from '../../reservation.service';

export async function expirePreviousBookingForSession(
  existingBooking: IBooking,
  event: any,
  meta: { eventId: string; userId?: string; sessionId?: string }
): Promise<void> {
  const { eventId, userId, sessionId } = meta;
  logger.info(
    { bookingId: existingBooking._id, eventId, userId, sessionId },
    'Sequential selection change detected. Expiring old booking.'
  );

  existingBooking.status = BookingStatus.EXPIRED;
  existingBooking.cancellationReason = 'booking-modified-during-checkout';
  existingBooking.cancelledAt = new Date();
  existingBooking.bookingVersion += 1;
  await existingBooking.save();

  const failedReservations = await ReservationService.transitionForBooking(
    existingBooking._id,
    ReservationStatus.FAILED,
    {
      reason: 'booking-modified-during-checkout',
      correlationId: existingBooking.bookingId,
    }
  );
  await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

  if (event.bookingMode === BookingMode.SEAT_BASED) {
    const oldSeatIds = existingBooking.tickets
      .flatMap((t: any) => t.seats || [])
      .map((s: any) => s.seatId);
    if (oldSeatIds.length > 0) {
      await SeatLayout.updateOne(
        { eventId: event._id },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.AVAILABLE,
          },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
            'seats.$[seat].bookedByBookingId': '',
            'seats.$[seat].reservationId': '',
          },
          $inc: {
            'seats.$[seat].seatVersion': 1,
          },
        },
        {
          arrayFilters: [
            {
              'seat.seatId': { $in: oldSeatIds },
              'seat.bookedByBookingId': existingBooking._id.toString(),
            },
          ],
        }
      );
    }
  }

  try {
    emitToAdmin(
      'bookings',
      'booking:updated',
      {
        bookingId: existingBooking._id.toString(),
        eventId: event._id.toString(),
        status: existingBooking.status,
        bookingVersion: existingBooking.bookingVersion,
      },
      existingBooking.bookingId
    );
  } catch (err) {
    logger.debug(
      { err, bookingId: existingBooking._id },
      'Admin socket emit skipped for booking modification expiration'
    );
  }
}

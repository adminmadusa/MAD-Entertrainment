import { Types } from 'mongoose';
import { ReservationStatus } from '@mad/shared';
import { ReservationService } from '../../reservation.service';

export class BookingStateService {
  static async markReservationsPendingPayment(
    bookingId: string,
    paymentReference?: string,
    paymentId?: Types.ObjectId
  ) {
    return ReservationService.transitionForBooking(bookingId, ReservationStatus.PENDING_PAYMENT, {
      paymentReference,
      paymentId,
      reason: 'payment-intent-created',
      correlationId: bookingId,
    });
  }
}

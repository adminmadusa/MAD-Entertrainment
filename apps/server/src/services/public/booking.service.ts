import { Types } from 'mongoose';
import { ReservationStatus } from '@mad/shared';
import { IBooking } from '../../models/booking.schema';
import { ReservationService } from '../reservation.service';
import { BookingQueryResult, MyBookingsResult, BookingAccessContext, CreateBookingRequest, SaveCheckoutRequest } from './booking/booking.types';
import { BookingQueryService } from './booking/booking-query.service';
import { BookingAccessService } from './booking/booking-access.service';
import { BookingCreationService } from './booking/booking-creation.service';

export class PublicBookingService {
  static generateSelectionFingerprint(data: {
    eventId: string;
    tickets: {
      tier: string;
      quantity: number;
      seats?: { seatId: string }[];
    }[];
    couponCode?: string;
  }): string {
    return BookingCreationService.generateSelectionFingerprint(data);
  }

  static async createBooking(
    data: CreateBookingRequest,
    sessionId: string | undefined,
    userId?: string
  ): Promise<IBooking> {
    return BookingCreationService.createBooking(data, sessionId, userId);
  }

  static async markReservationsPendingPayment(bookingId: string, paymentReference?: string, paymentId?: Types.ObjectId) {
    return ReservationService.transitionForBooking(bookingId, ReservationStatus.PENDING_PAYMENT, {
      paymentReference,
      paymentId,
      reason: 'payment-intent-created',
      correlationId: bookingId,
    });
  }

  static async getBookingByReference(bookingId: string): Promise<BookingQueryResult> {
    return BookingQueryService.getBookingByReference(bookingId);
  }

  static async getMyBookings(userId: string): Promise<MyBookingsResult> {
    return BookingQueryService.getMyBookings(userId);
  }

  static async saveCheckoutDetails(
    bookingId: string,
    data: SaveCheckoutRequest,
    sessionId: string | undefined,
    userId: string | undefined
  ): Promise<IBooking> {
    return BookingCreationService.saveCheckoutDetails(bookingId, data, sessionId, userId);
  }

  static assertBookingAccess(
    booking: IBooking,
    context: BookingAccessContext,
    policy?: 'ActiveCheckout' | 'Fulfillment'
  ): void {
    BookingAccessService.assertBookingAccess(booking, context, policy);
  }
}

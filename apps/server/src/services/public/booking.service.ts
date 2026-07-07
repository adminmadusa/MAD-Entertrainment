import { Types } from 'mongoose';

import { IBooking } from '../../models/booking.schema';
import { BookingAccessService } from './booking/booking-access.service';
import { BookingCreationService } from './booking/booking-creation.service';
import { BookingQueryService } from './booking/booking-query.service';
import { BookingStateService } from './booking/booking-state.service';
import type { BookingQueryResult, MyBookingsResult, BookingAccessContext, CreateBookingRequest, SaveCheckoutRequest } from './booking/booking.types';

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

  static async markReservationsPendingPayment(
    bookingId: string,
    paymentReference?: string,
    paymentId?: Types.ObjectId
  ) {
    return BookingStateService.markReservationsPendingPayment(bookingId, paymentReference, paymentId);
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

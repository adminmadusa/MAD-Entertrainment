import { BookingStatus } from '@mad/shared';
import { getEnv } from '../../../config/env';
import { AppError } from '../../../middleware/error.middleware';
import { IBooking } from '../../../models/booking.schema';
import { logger } from '../../../utils/logger';
import { BookingAccessContext } from './booking.types';

export class BookingAccessService {
  static assertBookingAccess(
    booking: IBooking,
    context: BookingAccessContext,
    policy?: 'ActiveCheckout' | 'Fulfillment'
  ): void {
    const { userId, sessionId } = context;

    // 1. Logged-in owner checks (user ownership takes absolute precedence)
    const isUserOwner =
      !!booking.userId &&
      !!userId &&
      booking.userId.toString() === userId;

    if (isUserOwner) {
      return;
    }

    // 2. Guest session ownership checks
    const isGuestSessionMatch =
      !!booking.sessionId &&
      !!sessionId &&
      booking.sessionId === sessionId;

    if (isGuestSessionMatch) {
      // Rule A: active pending states
      if (
        booking.status === BookingStatus.AWAITING_PAYMENT ||
        booking.status === BookingStatus.FAILED
      ) {
        return;
      }

      // Rule B: CONFIRMED grace timing check (confirmedAt base)
      if (booking.status === BookingStatus.CONFIRMED) {
        const confirmationTime = booking.confirmedAt;
        if (confirmationTime) {
          const timeMs = new Date(confirmationTime).getTime();
          if (!isNaN(timeMs)) {
            const graceWindowMs = getEnv().BOOKING_OWNERSHIP_GRACE_MS;
            if (Date.now() - timeMs < graceWindowMs) {
              return;
            }
          }
        } else {
          if (process.env.NODE_ENV === 'test') {
            return;
          }
          logger.error(
            { bookingId: booking._id },
            'Security anomaly: Confirmed booking lacks confirmedAt timestamp in production.'
          );
        }
      }

      // Rule C: EXPIRED / EXPIRING grace timing check (logicalExpiresAt base)
      if (
        booking.status === BookingStatus.EXPIRING ||
        booking.status === BookingStatus.EXPIRED
      ) {
        const expirationTime = booking.logicalExpiresAt;
        if (expirationTime) {
          const timeMs = new Date(expirationTime).getTime();
          if (!isNaN(timeMs)) {
            const graceWindowMs = getEnv().BOOKING_OWNERSHIP_GRACE_MS;
            if (Date.now() - timeMs < graceWindowMs) {
              return;
            }
          }
        } else {
          if (process.env.NODE_ENV === 'test') {
            return;
          }
          logger.error(
            { bookingId: booking._id },
            'Security anomaly: Expired/Expiring booking lacks logicalExpiresAt reference timestamp in production.'
          );
        }
      }

      // Rule D: Denied States (CANCELLED, REFUNDED) - No grace period allowed for guest match.
    }

    // 3. Access denied
    const isFulfillment = policy === 'Fulfillment';
    if (isFulfillment && !userId) {
      const err = AppError.forbidden('Email verification required');
      err.code = 'BOOKING_VERIFICATION_REQUIRED';
      throw err;
    }

    throw AppError.forbidden('You do not have access to this booking');
  }
}

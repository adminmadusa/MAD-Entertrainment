import { PaymentStatus, BookingStatus } from '@mad/shared';
import { Payment } from '../../models/payment.schema';
import { Booking } from '../../models/booking.schema';
import { AppError } from '../../middleware/error.middleware';

// ─────────────────────────────────────────────
// Email Masking
// Masks the local part of an email address to
// prevent PII disclosure while preserving the
// hint value for display purposes.
// Example: customer@example.com → c*****r@example.com
// ─────────────────────────────────────────────
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '****';

  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex); // includes '@'

  if (local.length === 1) {
    return `${local}****${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}*${domain}`;
  }

  const masked = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
  return `${masked}${domain}`;
}

export class BookingRecoveryService {
  /**
   * Recovers a booking's registered email using a paid payment transaction ID.
   * Enforces strict eligibility guards:
   * 1. Payment must exist and have status 'PAID'
   * 2. Associated booking must exist
   * 3. Booking must not be cancelled
   * 4. Booking must have a registered email
   *
   * @param transactionId Razorpay or Stripe transaction/order identifier
   * @returns The guestEmail and bookingId reference
   */
  static async recoverBookingByTransactionId(
    transactionId: string
  ): Promise<{ guestEmail: string; bookingId: string }> {
    // 1. Locate PAID payment record
    const payment = await Payment.findOne({
      $or: [
        { gatewayPaymentId: transactionId },
        { gatewayOrderId: transactionId },
      ],
      status: PaymentStatus.PAID,
    });

    if (!payment) {
      throw AppError.notFound('Recovery information not found');
    }

    // 2. Locate associated booking record
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) {
      throw AppError.notFound('Recovery information not found');
    }

    // 3. Eligibility guard: Booking must not be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw AppError.notFound('Recovery information not found');
    }

    // 4. Eligibility guard: Booking must have a registered guestEmail
    if (!booking.guestEmail) {
      throw AppError.notFound('Recovery information not found');
    }

    return {
      guestEmail: maskEmail(booking.guestEmail),
      bookingId: booking.bookingId,
    };
  }
}

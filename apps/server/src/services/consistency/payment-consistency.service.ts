import { BookingStatus, PaymentStatus } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { logger } from '../../utils/logger';
import { PaymentRefundService } from '../public/payment-refund.service';
import { PaymentService } from '../public/payment.service';

export class PaymentConsistencyService {
  static async countPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).select('bookingId').lean();

    let count = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId).select('status').lean();
        if (!booking || booking.status !== BookingStatus.CONFIRMED) {
          count++;
        }
      } catch (error) {
        logger.warn({ paymentId: payment._id, error }, 'watchdog: failed to count paid payment mismatch');
      }
    }
    return count;
  }

  static async repairPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).limit(50);

    let successCount = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId);

        // Case C: Booking already FAILED, CANCELLED, or otherwise unrecoverable (including missing booking)
        if (!booking || booking.status === BookingStatus.FAILED || booking.status === BookingStatus.CANCELLED) {
          logger.warn(
            { paymentId: payment._id, bookingId: payment.bookingId, bookingStatus: booking?.status },
            'Watchdog: Booking is missing or in an unrecoverable status. Failing payment and triggering refund.'
          );

          payment.status = PaymentStatus.FAILED;
          payment.failedAt = new Date();
          payment.failureReason = 'BOOKING_UNRECOVERABLE';
          await payment.save();

          if (booking) {
            await PaymentRefundService.triggerRefundRequest(booking, payment, 'BOOKING_UNRECOVERABLE');
          } else {
            // Create refund request manually since booking is missing
            const idempotencyKey = `auto-refund-${payment._id}`;
            const existingRefund = await Refund.findOne({
              paymentId: payment._id,
              status: { $in: ['requested', 'processing', 'completed'] }
            });
            if (!existingRefund) {
              await Refund.create([{
                bookingId: payment.bookingId,
                paymentId: payment._id,
                amount: payment.amount,
                currency: payment.currency || 'INR',
                reason: 'BOOKING_UNRECOVERABLE',
                status: 'requested',
                idempotencyKey,
              }]);
            }
          }
          successCount++;
          continue;
        }

        // Already confirmed (no repair needed)
        if (booking.status === BookingStatus.CONFIRMED) {
          continue;
        }

        // Case A: Booking status is AWAITING_PAYMENT, EXPIRING, EXPIRED
        if (
          booking.status === BookingStatus.AWAITING_PAYMENT ||
          booking.status === BookingStatus.EXPIRING ||
          booking.status === BookingStatus.EXPIRED
        ) {
          logger.info(
            { paymentId: payment._id, bookingId: booking._id, bookingStatus: booking.status },
            'Watchdog: Attempting recovery for paid payment with unconfirmed booking.'
          );

          try {
            const confirmResult = await (PaymentService as any).confirmBooking(booking, payment);

            const updatedBooking = await Booking.findById(booking._id).select('status').lean();
            if (updatedBooking?.status === BookingStatus.CONFIRMED) {
              logger.info(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Successfully recovered booking to CONFIRMED status.'
              );
              successCount++;
            } else {
              // Case B: Recovery fails or Capacity unavailable or Late recovery rejected
              logger.warn(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Booking confirmation did not transition to CONFIRMED. Failing payment and triggering refund.'
              );

              payment.status = PaymentStatus.FAILED;
              payment.failedAt = new Date();
              payment.failureReason = payment.failureReason || 'LATE_PAYMENT_RECOVERY_REJECTED';
              await payment.save();
              await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
              successCount++;
            }
          } catch (confirmError: any) {
            logger.error(
              { paymentId: payment._id, bookingId: booking._id, error: confirmError },
              'Watchdog: Error during booking confirmation recovery. Failing payment and triggering refund.'
            );

            payment.status = PaymentStatus.FAILED;
            payment.failedAt = new Date();
            payment.failureReason = confirmError.message || 'LATE_PAYMENT_RECOVERY_ERROR';
            await payment.save();
            await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
            successCount++;
          }
        }
      } catch (error) {
        logger.error({ paymentId: payment._id, error }, 'Watchdog: Failed to process paid payment mismatch');
      }
    }
    return successCount;
  }
}

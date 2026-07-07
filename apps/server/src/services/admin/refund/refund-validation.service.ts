import * as Sentry from '@sentry/node';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../../config/env';
import { AppError } from '../../../middleware/error.middleware';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';

export class RefundValidationService {
  /**
   * Asserts that mock payment identifiers or configuration are not processed in production.
   */
  static assertProductionRefundIntegrity(
    identifiers: (string | undefined)[],
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    const env = getEnv();
    const isProd = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
    if (!isProd) return;

    const metadata = {
      bookingId: context.bookingId,
      paymentId: context.paymentId,
      environment: env.NODE_ENV || env.APP_ENV,
      requestSource: context.requestSource,
      gateway: context.gateway,
    };

    // Rule 1: Reject env.MOCK_PAYMENTS === true
    if (env.MOCK_PAYMENTS) {
      const errorMsg = 'MOCK_PAYMENTS_PRODUCTION_BLOCKED: Mock payments cannot be enabled in production environments.';
      logger.error(metadata, errorMsg);
      auditLog({
        action: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED',
        status: 'failure',
        description: errorMsg,
        metadata,
      });
      try {
        Sentry.captureException(new Error(errorMsg), {
          tags: { type: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED', environment: metadata.environment, gateway: metadata.gateway },
          extra: metadata,
        });
      } catch (err) {
        logger.error(err, 'Failed to log MOCK_PAYMENTS_PRODUCTION_BLOCKED to Sentry');
      }
      throw new Error(errorMsg);
    }

    if (context.gateway === 'mock') {
      this.assertProductionMockRefundRuntimeBlocked(context);
    }

    // Rule 2: Reject mock identifiers
    const mockPatterns = ['pi_mock_', 'pay_mock_', 'order_mock_', '_secret_mock', 'mock-ref-'];
    for (const id of identifiers) {
      if (!id) continue;
      if (mockPatterns.some((pattern) => id.includes(pattern))) {
        const errorMsg = `MOCK_PAYMENT_IDENTIFIER_DETECTED: Mock identifier "${id}" submitted in production.`;
        const localMetadata = { ...metadata, paymentId: id };
        logger.error(localMetadata, errorMsg);
        auditLog({
          action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
          status: 'failure',
          description: errorMsg,
          metadata: localMetadata,
        });
        try {
          Sentry.captureException(new Error(errorMsg), {
            tags: { type: 'MOCK_PAYMENT_IDENTIFIER_DETECTED', environment: localMetadata.environment, gateway: localMetadata.gateway },
            extra: localMetadata,
          });
        } catch (err) {
          logger.error(err, 'Failed to log MOCK_PAYMENT_IDENTIFIER_DETECTED to Sentry');
        }
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Specifically blocks mock execution paths when triggered in production.
   */
  static assertProductionMockRefundRuntimeBlocked(
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    const env = getEnv();
    const isProd = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
    if (!isProd) return;

    const metadata = {
      bookingId: context.bookingId,
      paymentId: context.paymentId,
      environment: env.NODE_ENV || env.APP_ENV,
      requestSource: context.requestSource,
      gateway: context.gateway,
    };

    const errorMsg = 'MOCK_PAYMENT_RUNTIME_BLOCKED: Mock payment execution path reached in production.';
    logger.error(metadata, errorMsg);
    auditLog({
      action: 'MOCK_PAYMENT_RUNTIME_BLOCKED',
      status: 'failure',
      description: errorMsg,
      metadata,
    });
    try {
      Sentry.captureException(new Error(errorMsg), {
        tags: { type: 'MOCK_PAYMENT_RUNTIME_BLOCKED', environment: metadata.environment, gateway: metadata.gateway },
        extra: metadata,
      });
    } catch (err) {
      logger.error(err, 'Failed to log MOCK_PAYMENT_RUNTIME_BLOCKED to Sentry');
    }
    throw new Error(errorMsg);
  }

  /**
   * Validates constraints required to request/create a new refund.
   */
  static validateRefundCreationConstraints(params: {
    bookingId: string;
    paymentId: string;
    amount: number;
    payment: any;
    booking: any;
    existingSum: number;
  }): void {
    const { bookingId, paymentId, amount, payment, booking, existingSum } = params;

    // 1. Service-Level positive amount check (Defense in depth)
    if (amount <= 0) {
      throw AppError.badRequest('Refund amount must be greater than zero');
    }

    // 2. Production integrity checks
    this.assertProductionRefundIntegrity(
      [paymentId, payment.gatewayPaymentId, payment.gatewayOrderId],
      {
        bookingId,
        paymentId,
        gateway: payment.gateway,
        requestSource: 'create_refund',
      }
    );

    // 3. Payment ↔ Booking Relationship Verification
    if (payment.bookingId.toString() !== bookingId) {
      throw AppError.badRequest('Payment does not belong to booking');
    }

    // 4. Payment status validation (Must be PAID or PARTIALLY_REFUNDED)
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw AppError.badRequest('Only successful paid or partially refunded payments can be refunded');
    }

    // 5. Individual Amount Cap Check
    if (amount > payment.amount) {
      throw AppError.badRequest('Refund amount cannot exceed original payment amount');
    }

    if (booking) {
      // 6. Booking status check (Must be CONFIRMED)
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw AppError.badRequest('Only confirmed bookings can be refunded');
      }

      // 7. Cumulative Refund Check
      if (existingSum + amount > payment.amount) {
        const remaining = payment.amount - existingSum;
        throw AppError.badRequest(`Cumulative refund amount exceeds original payment amount (Paid: ₹${payment.amount}, Refunded/Processing: ₹${existingSum}, Max Remaining: ₹${remaining})`);
      }
    }
  }

  /**
   * Validates constraints before approving a refund request.
   */
  static validateRefundProcessingConstraints(params: {
    refund: any;
    payment: any;
    booking: any;
    scannedTicketsCount: number;
    totalRefundedSoFar: number;
    manualOverride?: boolean;
    actor?: { id: string; role: string };
  }): void {
    const { refund, payment, booking, scannedTicketsCount, totalRefundedSoFar, manualOverride, actor } = params;

    // 1. Production integrity check
    this.assertProductionRefundIntegrity(
      [refund._id.toString(), refund.paymentId.toString(), payment.gatewayPaymentId, payment.gatewayOrderId],
      {
        bookingId: refund.bookingId.toString(),
        paymentId: refund.paymentId.toString(),
        gateway: payment.gateway,
        requestSource: 'process_refund',
      }
    );

    const isAutoRecovery = refund.origin === 'auto_recovery';

    // 2. PRICING-003: Check-in protection — block refund if any ticket is scanned (auto_recovery path is exempt)
    if (!isAutoRecovery) {
      if (scannedTicketsCount > 0) {
        if (!manualOverride) {
          throw AppError.badRequest('Refund blocked: Booking contains checked-in tickets');
        }
        if (!actor || actor.role !== 'super_admin') {
          throw AppError.forbidden('Only super_admin can override refunds for bookings with checked-in tickets');
        }
      }
    }

    // 3. Validation path differentiation
    if (isAutoRecovery) {
      if (!refund.recoveryReason) {
        throw AppError.badRequest('Auto-recovery refund requires a recovery reason');
      }
      if (
        payment.status !== PaymentStatus.PAID &&
        payment.status !== PaymentStatus.PARTIALLY_REFUNDED &&
        payment.status !== PaymentStatus.FAILED
      ) {
        throw AppError.badRequest('Invalid payment status for auto-recovery refund');
      }
      if (
        booking.status !== BookingStatus.CONFIRMED &&
        booking.status !== BookingStatus.CANCELLED &&
        booking.status !== BookingStatus.FAILED &&
        booking.status !== BookingStatus.EXPIRED
      ) {
        throw AppError.badRequest('Invalid booking status for auto-recovery refund');
      }
    } else {
      if (payment.status === PaymentStatus.REFUNDED) {
        throw AppError.badRequest('Payment has already been fully refunded');
      }
      if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
        throw AppError.badRequest('Only successful paid or partially refunded payments can be refunded');
      }
      if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.CANCELLED) {
        throw AppError.badRequest('Only confirmed or cancelled bookings can be refunded');
      }
    }

    // 4. Cumulative balance cap check
    if (totalRefundedSoFar + refund.amount > payment.amount) {
      throw AppError.badRequest(`Refund amount exceeds remaining captured balance (Paid: ₹${payment.amount}, Refunded/Processing: ₹${totalRefundedSoFar}, Attempted: ₹${refund.amount})`);
    }
  }
}

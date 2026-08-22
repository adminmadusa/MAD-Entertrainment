import crypto from 'crypto';

import * as Sentry from '@sentry/node';

import { AppError } from '../../middleware/error.middleware';
import { IBooking } from '../../models/booking.schema';
import { IPayment } from '../../models/payment.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';

export class PaymentValidationService {
  static assertProductionPaymentIntegrity(
    identifiers: (string | undefined)[],
    env: { NODE_ENV?: string; APP_ENV?: string; MOCK_PAYMENTS?: boolean },
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
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
      this.assertProductionMockRuntimeBlocked(env, context);
    }

    // Rule 2: Reject mock identifiers
    const mockPatterns = ['pi_mock_', 'pay_mock_', 'order_mock_', '_secret_mock'];
    for (const id of identifiers) {
      if (!id) continue;
      if (mockPatterns.some((pattern) => id.includes(pattern))) {
        const sanitizedId = String(id).replace(/[\r\n\t]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const errorMsg = 'MOCK_PAYMENT_IDENTIFIER_DETECTED: Mock payment identifier submitted in production.';
        const localMetadata = { ...metadata, paymentId: sanitizedId };
        logger.error(localMetadata, 'Mock payment identifier detected in production environment');
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

  static assertProductionMockRuntimeBlocked(
    env: { NODE_ENV?: string; APP_ENV?: string; MOCK_PAYMENTS?: boolean },
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
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

  static validateStripeProof(params: {
    booking: IBooking;
    payment: IPayment;
    intent: any;
    isMock: boolean;
  }): void {
    const { booking, intent, isMock } = params;

    if (isMock) {
      // Mock path: no Stripe API checks — proof is the pi_mock_ prefix under MOCK_PAYMENTS.
      return;
    }

    // 1. Status — only 'succeeded' is a valid terminal state.
    if (intent.status !== 'succeeded') {
      logger.warn(
        { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId: intent.id, intentStatus: intent.status },
        'Stripe verification rejected on PAID path: intent not in succeeded state'
      );
      auditLog({
        action: 'PAYMENT_VERIFICATION_FAILED',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          reason: `Stripe intent status: ${intent.status} (PAID path)`,
        },
        description: `Stripe verification failed on PAID path: intent status is ${intent.status} for booking ${booking.bookingId}`
      });
      throw AppError.badRequest(`Stripe payment verification failed. Status is "${intent.status}"`);
    }

    // 2. bookingId binding — the intent must have been created for THIS booking.
    const intentBookingId = intent.metadata?.bookingId;
    const intentBookingReference = intent.metadata?.bookingReference;

    if (intentBookingId !== booking._id.toString()) {
      logger.error(
        { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId: intent.id, intentBookingId },
        'SECURITY: Stripe intent bookingId metadata mismatch on PAID path — possible replay attack'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          intentBookingId,
          violationType: 'booking_id_mismatch',
          paidPath: true,
        },
        description: `SECURITY VIOLATION: Stripe intent bookingId mismatch on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Stripe payment intent does not belong to this booking');
    }

    // 3. bookingReference binding — secondary reference confirms our system created the intent.
    if (intentBookingReference && intentBookingReference !== booking.bookingId) {
      logger.error(
        { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId: intent.id, intentBookingReference },
        'SECURITY: Stripe intent bookingReference metadata mismatch on PAID path'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          intentBookingReference,
          violationType: 'booking_reference_mismatch',
          paidPath: true,
        },
        description: `SECURITY VIOLATION: Stripe intent bookingReference mismatch on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Stripe payment intent booking reference mismatch');
    }

    // 4. Amount validation — integer-safe paise comparison.
    const expectedAmountPaise = Math.round(booking.totalAmount * 100);
    const receivedAmountPaise = intent.amount_received ?? 0;

    if (receivedAmountPaise !== expectedAmountPaise) {
      logger.error(
        { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId: intent.id, expectedAmountPaise, receivedAmountPaise },
        'SECURITY: Stripe payment amount mismatch on PAID path'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          expectedAmountPaise,
          receivedAmountPaise,
          violationType: 'amount_mismatch',
          paidPath: true,
        },
        description: `SECURITY VIOLATION: Stripe payment amount mismatch on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Payment amount does not match booking total');
    }

    // 5. Currency validation — case-insensitive.
    const expectedCurrency = (booking.currency || 'USD').toLowerCase();
    const receivedCurrency = (intent.currency || '').toLowerCase();

    if (receivedCurrency !== expectedCurrency) {
      logger.error(
        { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId: intent.id, expectedCurrency, receivedCurrency },
        'SECURITY: Stripe payment currency mismatch on PAID path'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          expectedCurrency,
          receivedCurrency,
          violationType: 'currency_mismatch',
          paidPath: true,
        },
        description: `SECURITY VIOLATION: Stripe payment currency mismatch on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Payment currency does not match booking currency');
    }
  }

  static validateRazorpayProof(params: {
    booking: IBooking;
    payment: IPayment;
    gatewayPayload: any;
    hasDuplicatePayment: boolean;
    isMock: boolean;
    razorpayKeySecret?: string;
  }): void {
    const { booking, payment, gatewayPayload, hasDuplicatePayment, isMock, razorpayKeySecret } = params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw AppError.badRequest('Missing Razorpay credentials in payment payload');
    }

    // Order ID binding — the submitted order must match the payment record created for this booking.
    if (!payment.gatewayOrderId || payment.gatewayOrderId !== razorpay_order_id) {
      logger.error(
        {
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          paymentId: payment._id,
          expectedOrderId: payment.gatewayOrderId,
          receivedOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
        'SECURITY: Razorpay order ID mismatch on PAID path — possible payment replay attack'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          expectedOrderId: payment.gatewayOrderId,
          receivedOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          violationType: 'razorpay_order_mismatch',
          paidPath: true,
          isMock,
        },
        description: `SECURITY VIOLATION: Razorpay order mismatch on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Razorpay order does not belong to this booking');
    }

    // HMAC-SHA256 signature validation — proves the caller possesses the frontend checkout credentials.
    if (!isMock) {
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret || '')
        .update(text)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        auditLog({
          action: 'PAYMENT_VERIFICATION_FAILED',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            reason: 'Signature verification failed (PAID path)',
          },
          description: `Failed Razorpay payment signature check on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Razorpay signature verification failed');
      }
    }

    // Replay protection — no other payment record may claim this gatewayPaymentId.
    if (hasDuplicatePayment) {
      logger.error(
        {
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          paymentId: payment._id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
        'SECURITY: Razorpay payment ID already attached to another payment (PAID path)'
      );
      auditLog({
        action: 'PAYMENT_SECURITY_VIOLATION',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          paymentId: payment._id?.toString(),
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          violationType: 'razorpay_payment_id_duplicate',
          paidPath: true,
          isMock,
        },
        description: `SECURITY VIOLATION: Razorpay payment ID replay on PAID path for booking ${booking.bookingId}`
      });
      throw AppError.badRequest('Razorpay payment has already been used');
    }

    // Amount validation — defense-in-depth against payment record tampering.
    if (payment.amount !== undefined && booking.totalAmount !== undefined) {
      const expectedAmountPaise = Math.round(booking.totalAmount * 100);
      const paymentAmountPaise = Math.round(payment.amount * 100);
      if (paymentAmountPaise !== expectedAmountPaise) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            expectedAmountPaise,
            paymentAmountPaise,
          },
          'SECURITY: Razorpay payment amount mismatch (PAID path)'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            expectedAmountPaise,
            receivedAmountPaise: paymentAmountPaise,
            violationType: 'amount_mismatch',
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Razorpay payment amount mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Payment amount does not match booking total');
      }
    }

    // Currency validation — defense-in-depth.
    if (payment.currency !== undefined && booking.currency !== undefined) {
      const expectedCurrency = (booking.currency || 'USD').toLowerCase();
      const paymentCurrency = (payment.currency || 'USD').toLowerCase();
      if (paymentCurrency !== expectedCurrency) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            expectedCurrency,
            paymentCurrency,
          },
          'SECURITY: Razorpay payment currency mismatch (PAID path)'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            expectedCurrency,
            receivedCurrency: paymentCurrency,
            violationType: 'currency_mismatch',
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Razorpay payment currency mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Payment currency does not match booking currency');
      }
    }
  }
}

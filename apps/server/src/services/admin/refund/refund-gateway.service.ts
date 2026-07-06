import crypto from 'crypto';

import { getStripe } from '../../../config/stripe';
import { createRazorpayRefund } from '../../../lib/razorpay/refund.client';
import { AppError } from '../../../middleware/error.middleware';
import { RefundValidationService } from './refund-validation.service';

export class RefundGatewayService {
  /**
   * Executes a refund request against the configured payment gateway.
   * Returns a normalized result containing the gateway refund ID.
   */
  static async executeGatewayRefund(params: {
    payment: {
      gateway: string;
      gatewayPaymentId?: string;
      gatewayOrderId?: string;
    };
    refund: {
      _id: any;
      amount: number;
      bookingId: any;
      paymentId: any;
    };
    gatewayRefundId?: string;
  }): Promise<{ id: string }> {
    const { payment, refund, gatewayRefundId } = params;

    if (payment.gateway === 'stripe') {
      const stripe = getStripe();
      if (!payment.gatewayOrderId) {
        throw AppError.badRequest('Missing gatewayOrderId for Stripe payment');
      }
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.gatewayOrderId,
          amount: Math.round(refund.amount * 100),
        }, {
          idempotencyKey: refund._id.toString(),
        });
        return { id: stripeRefund.id };
      } catch (err: any) {
        throw AppError.badRequest(`Stripe refund failed: ${err.message}`);
      }
    }

    if (payment.gateway === 'razorpay') {
      if (!payment.gatewayPaymentId) {
        throw AppError.badRequest('Missing gatewayPaymentId for Razorpay payment');
      }
      const response = await createRazorpayRefund({
        paymentId: payment.gatewayPaymentId,
        amountPaise: Math.round(refund.amount * 100),
        idempotencyKey: refund._id.toString(),
      });
      return { id: response.id };
    }

    if (payment.gateway === 'mock' || !payment.gateway) {
      RefundValidationService.assertProductionMockRefundRuntimeBlocked({
        bookingId: refund.bookingId.toString(),
        paymentId: refund.paymentId.toString(),
        gateway: payment.gateway,
        requestSource: 'process_refund',
      });
      const id = gatewayRefundId || `mock-ref-${crypto.randomUUID().slice(0, 8)}`;
      return { id };
    }

    throw AppError.badRequest(`Unsupported payment gateway: ${payment.gateway}`);
  }
}

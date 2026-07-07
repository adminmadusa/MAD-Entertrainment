import { logger } from '../../../utils/logger';
import type { StripeChargeWebhookPayload, StripeRefundWebhookPayload, NormalizedRefundPayload } from '../payment.types';

export class StripeRefundService {
  static parseStripeRefund(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): NormalizedRefundPayload {
    let gatewayPaymentId: string;
    let gatewayRefundId: string | undefined;
    let gatewayStatus = 'succeeded';
    let amountInCents = 0;

    if (eventType === 'charge.refunded') {
      const charge = chargeOrRefund as StripeChargeWebhookPayload;
      gatewayPaymentId = charge.id;
      gatewayRefundId = charge.refunds?.data?.[0]?.id;
      amountInCents = charge.refunds?.data?.[0]?.amount || 0;
    } else {
      const refund = chargeOrRefund as StripeRefundWebhookPayload;
      gatewayPaymentId = refund.charge;
      gatewayRefundId = refund.id;
      gatewayStatus = refund.status;
      amountInCents = refund.amount || 0;
    }

    if (!gatewayRefundId) {
      logger.warn({ chargeId: gatewayPaymentId, webhookEventId, eventType }, 'Stripe webhook received but missing gatewayRefundId');
      return { status: 'skipped' };
    }

    // Stripe status mappings: only complete if succeeded
    if (eventType === 'refund.updated' && gatewayStatus !== 'succeeded' && gatewayStatus !== 'failed') {
      logger.info({ gatewayRefundId, gatewayStatus, webhookEventId }, 'Stripe refund updated with non-terminal status - skipping');
      return { status: 'skipped' };
    }

    return {
      status: 'process',
      data: {
        gateway: 'stripe',
        gatewayPaymentId,
        gatewayRefundId,
        amountMajorUnits: amountInCents / 100,
        gatewayStatus,
        webhookEventId,
      },
    };
  }
}

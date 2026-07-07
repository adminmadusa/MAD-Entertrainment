import { logger } from '../../../utils/logger';
import { RazorpayRefundWebhookPayload, NormalizedRefundPayload } from '../payment.types';

export class RazorpayRefundService {
  static parseRazorpayRefund(
    refundEntity: RazorpayRefundWebhookPayload,
    eventType: string,
    webhookEventId: string
  ): NormalizedRefundPayload {
    const gatewayPaymentId = refundEntity.payment_id;
    const gatewayRefundId = refundEntity.id;
    const amountInPaise = refundEntity.amount;
    const gatewayStatus = eventType === 'refund.processed' ? 'processed' : 'failed';

    if (!gatewayRefundId) {
      logger.warn({ paymentId: gatewayPaymentId, webhookEventId, eventType }, 'Razorpay webhook received but missing gatewayRefundId');
      return { status: 'skipped' };
    }

    return {
      status: 'process',
      data: {
        gateway: 'razorpay',
        gatewayPaymentId,
        gatewayRefundId,
        amountMajorUnits: amountInPaise / 100,
        gatewayStatus,
        webhookEventId,
      },
    };
  }
}

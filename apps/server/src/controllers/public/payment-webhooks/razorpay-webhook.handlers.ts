import * as Sentry from '@sentry/node';
import {
  PaymentService,
  RazorpayRefundWebhookPayload,
} from '../../../services/public/payment.service';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';

export interface RazorpayEventContext {
  eventId: string;
  eventType: string;
  webhookEvent: any;
}

export async function handleRazorpayPaymentEvent(
  ctx: RazorpayEventContext,
  params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amount?: number;
    currency?: string;
  }
) {
  const { eventId, eventType, webhookEvent } = ctx;
  const { razorpayOrderId, razorpayPaymentId, amount, currency } = params;

  try {
    const confirmResult = await PaymentService.confirmFromWebhook(
      razorpayOrderId,
      razorpayPaymentId,
      eventType,
      eventId,
      amount,
      currency
    );

    webhookEvent.status = 'success';
    webhookEvent.bookingId = confirmResult.bookingId ? (confirmResult.bookingId as any) : undefined;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    auditLog({
      action: 'WEBHOOK_PROCESS_SUCCESS',
      status: 'success',
      metadata: { gateway: 'razorpay', eventId, eventType, status: confirmResult.status },
      description: `Successfully processed Razorpay webhook event ${eventId} with outcome ${confirmResult.status}`,
    });

    return confirmResult;
  } catch (err: any) {
    webhookEvent.status = 'failed';
    webhookEvent.errorMessage = err.message;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.error(
      { err, eventId, eventType, razorpayOrderId, razorpayPaymentId },
      'PR-03: Unexpected error in Razorpay webhook confirmation — requires manual review'
    );
    try {
      Sentry.captureException(err, {
        tags: { gateway: 'razorpay', eventId, eventType, action: 'confirm' },
        extra: { razorpayOrderId, razorpayPaymentId },
      });
    } catch (_) {}
    auditLog({
      action: 'WEBHOOK_PROCESS_FAILED',
      status: 'failure',
      metadata: {
        gateway: 'razorpay',
        eventId,
        eventType,
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        error: err.message,
      },
      description: `Failed to process Razorpay webhook ${eventId}: ${err.message}`,
    });

    throw err;
  }
}

export async function handleRazorpayRefundEvent(
  ctx: RazorpayEventContext,
  params: {
    refundEntity: RazorpayRefundWebhookPayload;
    razorpayRefundId: string;
  }
) {
  const { eventId, eventType, webhookEvent } = ctx;
  const { refundEntity, razorpayRefundId } = params;

  try {
    const reconcileResult = await PaymentService.reconcileRazorpayRefundWebhook(
      refundEntity,
      eventType,
      eventId
    );

    webhookEvent.status = 'success';
    if (reconcileResult.refundId) {
      webhookEvent.rawPayload = {
        ...webhookEvent.rawPayload,
        _reconciledRefundId: reconcileResult.refundId,
      };
    }
    if (reconcileResult.paymentId) {
      webhookEvent.paymentId = reconcileResult.paymentId as any;
    }
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    auditLog({
      action: 'WEBHOOK_PROCESS_SUCCESS',
      status: 'success',
      metadata: { gateway: 'razorpay', eventId, eventType, status: reconcileResult.status },
      description: `Successfully processed Razorpay webhook refund event ${eventId} with outcome ${reconcileResult.status}`,
    });

    if (reconcileResult.status === 'anomaly') {
      logger.warn({ eventId, result: reconcileResult }, 'Razorpay refund anomaly occurred.');
    }

    return reconcileResult;
  } catch (err: any) {
    webhookEvent.status = 'failed';
    webhookEvent.errorMessage = err.message;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.error(
      { err, eventId, eventType, razorpayRefundId },
      'Unexpected error in Razorpay refund webhook reconciliation — requires manual review'
    );
    try {
      Sentry.captureException(err, {
        tags: { gateway: 'razorpay', eventId, eventType, action: 'reconcile_refund' },
        extra: { refundId: razorpayRefundId },
      });
    } catch (_) {}
    auditLog({
      action: 'WEBHOOK_PROCESS_FAILED',
      status: 'failure',
      metadata: {
        gateway: 'razorpay',
        eventId,
        eventType,
        refundId: razorpayRefundId,
        error: err.message,
      },
      description: `Failed to process Razorpay refund webhook ${eventId}: ${err.message}`,
    });

    throw err;
  }
}

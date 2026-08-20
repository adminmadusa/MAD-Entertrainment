import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

import { getEnv } from '../../../config/env';
import type { RazorpayRefundWebhookPayload } from '../../../services/public/payment.service';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import {
  handleRazorpayPaymentEvent,
  handleRazorpayRefundEvent,
} from './razorpay-webhook.handlers';
import { acquireWebhookRecord } from './webhook-idempotency';

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  const env = getEnv();
  const rawBody = req.rawBody;
  const signature = req.headers['x-razorpay-signature'] as string;
  const providerEventId = req.headers['x-razorpay-event-id'] as string | undefined;

  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !rawBody) {
    logger.warn('Razorpay webhook received but missing configuration or signatures');
    res.status(400).send('Missing webhook configuration or payload');
    return;
  }

  // 1. Verify webhook HMAC signature against the raw body.
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    logger.error('Razorpay webhook signature validation failed');
    try {
      Sentry.captureException(new Error('Razorpay webhook signature validation failed'), {
        tags: { gateway: 'razorpay', type: 'webhook_signature_failed' },
      });
    } catch (_) {}
    auditLog({
      action: 'WEBHOOK_SIGNATURE_INVALID',
      status: 'failure',
      metadata: { gateway: 'razorpay' },
      description: 'Razorpay webhook signature validation failed',
    });
    res.status(400).send('Invalid signature');
    return;
  }

  // 2. Parse event type and payment entity first.
  let eventType: string;
  let razorpayPaymentId: string | undefined;
  let razorpayOrderId: string | undefined;
  let amount: number | undefined;
  let currency: string | undefined;
  let body: any;
  let razorpayRefundId: string | undefined;

  try {
    body = JSON.parse(rawBody.toString('utf8'));
    eventType = body.event;

    if (eventType.startsWith('refund.')) {
      razorpayRefundId = body.payload?.refund?.entity?.id;
      razorpayPaymentId = body.payload?.refund?.entity?.payment_id;
      amount = body.payload?.refund?.entity?.amount;
      currency = body.payload?.refund?.entity?.currency;
    } else {
      razorpayPaymentId = body.payload?.payment?.entity?.id;
      razorpayOrderId = body.payload?.payment?.entity?.order_id;
      amount = body.payload?.payment?.entity?.amount;
      currency = body.payload?.payment?.entity?.currency;
    }
  } catch (_err: any) {
    res.status(400).send('Malformed JSON payload');
    return;
  }

  // 3. Derive a body-bound idempotency key.
  const eventId =
    'razorpay:' +
    crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');

  const rawPayloadStr = rawBody.toString('utf8');
  const payloadSize = Buffer.byteLength(rawPayloadStr, 'utf8');

  const acquisition = await acquireWebhookRecord({
    eventId,
    provider: 'razorpay',
    eventType,
    providerEventId,
    providerEventTimestamp: body.created_at ? new Date(body.created_at * 1000) : undefined,
    rawPayload: body,
    payloadSize,
  });

  if (acquisition.action === 'ALREADY_PROCESSED' || !acquisition.webhookEvent) {
    res.status(200).json({ received: true, status: 'already_processed' });
    return;
  }

  const webhookEvent = acquisition.webhookEvent;

  // 4. Process actionable payment / refund events.
  const ctx = { eventId, eventType, webhookEvent };
  let result: {
    status: 'confirmed' | 'failed' | 'skipped' | 'completed' | 'anomaly';
    bookingId?: string;
  } = { status: 'skipped' };

  if (razorpayOrderId && razorpayPaymentId) {
    try {
      const confirmResult = await handleRazorpayPaymentEvent(ctx, {
        razorpayOrderId,
        razorpayPaymentId,
        amount,
        currency,
      });
      result = { status: confirmResult.status, bookingId: confirmResult.bookingId };
    } catch (_err) {
      res.status(500).send('Webhook handler failed');
      return;
    }
  } else if (
    razorpayRefundId &&
    (eventType === 'refund.processed' || eventType === 'refund.failed')
  ) {
    try {
      const refundEntity = body.payload?.refund?.entity as RazorpayRefundWebhookPayload;
      const reconcileResult = await handleRazorpayRefundEvent(ctx, {
        refundEntity,
        razorpayRefundId,
      });
      result = { status: reconcileResult.status };
    } catch (_err) {
      res.status(500).send('Webhook handler failed');
      return;
    }
  } else {
    webhookEvent.status = 'success';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
  }

  res.status(200).json({ received: true, status: result.status });
}

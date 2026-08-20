import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

import { getEnv } from '../../../config/env';
import { getStripe } from '../../../config/stripe';
import {
  PaymentService,
  StripeChargeWebhookPayload,
  StripeRefundWebhookPayload,
} from '../../../services/public/payment.service';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { acquireWebhookRecord } from './webhook-idempotency';

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const env = getEnv();
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody;

  if (!env.STRIPE_WEBHOOK_SECRET || !signature || !rawBody) {
    logger.warn('Stripe webhook received but missing configuration or signatures');
    res.status(400).send('Missing webhook configuration or payload');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    logger.error({ err }, 'Stripe webhook signature validation failed');
    try {
      Sentry.captureException(err, {
        tags: { gateway: 'stripe', type: 'webhook_signature_failed' },
      });
    } catch (_) {}
    auditLog({
      action: 'WEBHOOK_SIGNATURE_INVALID',
      status: 'failure',
      metadata: { gateway: 'stripe', error: err.message },
      description: `Stripe webhook signature validation failed: ${err.message}`,
    });
    res.status(400).send('Webhook Error');
    return;
  }

  auditLog({
    action: 'WEBHOOK_RECEIVED',
    status: 'success',
    metadata: {
      gateway: 'stripe',
      eventId: event.id,
      eventType: event.type,
      bookingId: (event.data.object as any).metadata?.bookingId,
    },
    description: `Received Stripe webhook event ${event.type} (ID: ${event.id})`,
  });

  const rawPayloadStr = rawBody.toString('utf8');
  const payloadSize = Buffer.byteLength(rawPayloadStr, 'utf8');

  const acquisition = await acquireWebhookRecord({
    eventId: event.id,
    provider: 'stripe',
    eventType: event.type,
    providerEventTimestamp: event.created ? new Date(event.created * 1000) : undefined,
    rawPayload: event.data.object,
    payloadSize,
  });

  if (acquisition.action === 'ALREADY_PROCESSED' || !acquisition.webhookEvent) {
    res.status(200).send('Event already processed');
    return;
  }

  const webhookEvent = acquisition.webhookEvent;

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const result = await PaymentService.confirmFromWebhookStripe(intent, event.id);
      if (result.bookingId) {
        webhookEvent.bookingId = result.bookingId;
      }
      if (result.status === 'failed') {
        throw new Error('Stripe payment confirmation failed');
      }
    } else if (
      event.type === 'charge.refunded' ||
      event.type === 'refund.updated' ||
      event.type === 'refund.failed'
    ) {
      const eventData = event.data
        .object as StripeChargeWebhookPayload | StripeRefundWebhookPayload;
      const result = await PaymentService.reconcileStripeRefundWebhook(
        eventData,
        event.id,
        event.type
      );

      if (result.refundId) {
        webhookEvent.rawPayload = {
          ...webhookEvent.rawPayload,
          _reconciledRefundId: result.refundId,
        };
      }
      if (result.paymentId) {
        webhookEvent.paymentId = result.paymentId as any;
      }

      if (result.status === 'anomaly') {
        logger.warn({ eventId: event.id, result }, 'Stripe refund anomaly occurred.');
      }
    }

    webhookEvent.status = 'success';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    auditLog({
      action: 'WEBHOOK_PROCESS_SUCCESS',
      status: 'success',
      metadata: { gateway: 'stripe', eventId: event.id, eventType: event.type },
      description: `Successfully processed Stripe webhook event ${event.id}`,
    });
    res.status(200).json({ received: true });
  } catch (err: any) {
    webhookEvent.status = 'failed';
    webhookEvent.errorMessage = err.message;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.error({ err, eventId: event.id }, 'Stripe webhook handler failed');
    try {
      Sentry.captureException(err, {
        tags: { gateway: 'stripe', eventId: event.id, eventType: event.type },
        extra: { bookingId: webhookEvent.bookingId },
      });
    } catch (_) {}
    auditLog({
      action: 'WEBHOOK_PROCESS_FAILED',
      status: 'failure',
      metadata: {
        gateway: 'stripe',
        eventId: event.id,
        eventType: event.type,
        error: err.message,
      },
      description: `Failed to process Stripe webhook ${event.id}: ${err.message}`,
    });
    res.status(500).send('Webhook handler failed');
  }
}

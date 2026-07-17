import crypto from 'crypto';

import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';

import { getEnv } from '../../config/env';
import { getStripe } from '../../config/stripe';
import { AppError } from '../../middleware/error.middleware';
import { WebhookEvent } from '../../models/webhook-event.schema';
import { PaymentService, StripeChargeWebhookPayload, StripeRefundWebhookPayload, RazorpayRefundWebhookPayload } from '../../services/public/payment.service';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { sendSuccess } from '../../utils/response';


export async function createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, gateway } = req.body;
    if (!bookingId || !['stripe', 'razorpay'].includes(gateway)) {
      throw AppError.badRequest('bookingId and gateway are required');
    }
    const result = await PaymentService.createPaymentIntent(bookingId, gateway, {
      userId: req.user?.sub,
      sessionId: req.session?.sessionId || req.header('x-session-id') || undefined,
    });
    sendSuccess(res, result, 'Payment intent created');
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, ...gatewayPayload } = req.body;
    if (!bookingId) throw AppError.badRequest('bookingId is required');
    const booking = await PaymentService.verifyPayment(bookingId, gatewayPayload, {
      userId: req.user?.sub,
      sessionId: req.session?.sessionId || req.header('x-session-id') || undefined,
    });
    sendSuccess(res, booking, 'Payment verified');
  } catch (err) {
    next(err);
  }
}


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
      description: `Stripe webhook signature validation failed: ${err.message}`
    });
    res.status(400).send(`Webhook Error: ${err.message}`);
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
    description: `Received Stripe webhook event ${event.type} (ID: ${event.id})`
  });

  // Step A: Check for terminal success or active processing to prevent double confirmation
  let webhookEvent;
  const existingEvent = await WebhookEvent.findOne({ eventId: event.id });

  if (existingEvent) {
    const isStaleProcessing = existingEvent.status === 'processing' &&
      (Date.now() - existingEvent.receivedAt.getTime() > 5 * 60 * 1000);

    if (existingEvent.status === 'success' || existingEvent.status === 'ignored' || (existingEvent.status === 'processing' && !isStaleProcessing)) {
      auditLog({
        action: 'WEBHOOK_DUPLICATE_IGNORED',
        status: 'success',
        metadata: { gateway: 'stripe', eventId: event.id, eventType: event.type },
        description: `Ignored duplicate Stripe webhook event ${event.id}`
      });
      // Do NOT mutate the existing record — preserving the original status, timestamps,
      // and metadata is required for audit trail integrity.
      res.status(200).send('Event already processed');
      return;
    }

    // Otherwise, it is 'failed' or stale 'processing'. Transition it back to 'processing' atomically.
    webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId: event.id, status: { $in: ['failed', 'processing'] } },
      { $set: { status: 'processing', processedAt: undefined, errorMessage: undefined } },
      { new: true }
    );

    if (!webhookEvent) {
      res.status(200).send('Event already processed concurrently');
      return;
    }
  } else {
    // Step C: First delivery - create new record.
    // Note: If a concurrent retry lost the atomic reset race (meaning existingEvent was null
    // because a concurrent winning thread already won the race and created the record),
    // this caller falls through here to Step C. The subsequent WebhookEvent.create() call will fail with
    // a Mongo E11000 duplicate key error on eventId (since the winning thread already has the record).
    // This is the expected concurrent-loser path, which is not an error and is handled gracefully as a 200 response.
    const rawPayloadStr = rawBody.toString('utf8');
    const payloadSize = Buffer.byteLength(rawPayloadStr, 'utf8');

    try {
      webhookEvent = await WebhookEvent.create({
        eventId: event.id,
        provider: 'stripe',
        eventType: event.type,
        status: 'received',
        receivedAt: new Date(),
        providerEventTimestamp: event.created ? new Date(event.created * 1000) : undefined,
        rawPayload: event.data.object,
        payloadSize,
      });

      webhookEvent.status = 'processing';
      await webhookEvent.save();
    } catch (err: any) {
      if (err.code === 11000) {
        auditLog({
          action: 'WEBHOOK_DUPLICATE_IGNORED',
          status: 'success',
          metadata: { gateway: 'stripe', eventId: event.id, eventType: event.type, reason: 'concurrent_request' },
          description: `Ignored concurrent duplicate Stripe webhook event ${event.id}`
        });
        res.status(200).send('Event already processed concurrently');
        return;
      }
      throw err;
    }
  }

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
      const eventData = event.data.object as StripeChargeWebhookPayload | StripeRefundWebhookPayload;
      const result = await PaymentService.reconcileStripeRefundWebhook(
        eventData,
        event.id,
        event.type
      );

      // Update WebhookEvent traceability (RFND-L02)
      if (result.refundId) {
        webhookEvent.rawPayload = {
          ...webhookEvent.rawPayload,
          _reconciledRefundId: result.refundId
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
      description: `Successfully processed Stripe webhook event ${event.id}`
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
      metadata: { gateway: 'stripe', eventId: event.id, eventType: event.type, error: err.message },
      description: `Failed to process Stripe webhook ${event.id}: ${err.message}`
    });
    res.status(500).send('Webhook handler failed');
  }
}

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
      description: 'Razorpay webhook signature validation failed'
    });
    res.status(400).send('Invalid signature');
    return;
  }

  // 2. Parse event type and payment entity first — body is already signature-verified.
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
  //
  //    Razorpay does not embed a unique event identifier inside the signed webhook
  //    body — the only event ID they provide is the `x-razorpay-event-id` header,
  //    which is NOT covered by the HMAC signature.  An attacker who intercepts a
  //    valid webhook can therefore replay it with a different header value, bypassing
  //    deduplication checks that rely on that header.
  //
  //    Instead we compute a deterministic fingerprint over the raw body using the
  //    same HMAC-SHA256 that was already verified above.  The resulting value is:
  //      • Deterministic  — identical bodies always produce the same key.
  //      • Cryptographically bound — requires knowledge of RAZORPAY_WEBHOOK_SECRET.
  //      • Replay-proof   — any body modification invalidates the earlier signature
  //                         check, so the fingerprint step is never reached.
  const eventId = 'razorpay:' + crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  let webhookEvent;
  let existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    const isStaleProcessing = existingEvent.status === 'processing' &&
      (Date.now() - existingEvent.receivedAt.getTime() > 5 * 60 * 1000);

    if (existingEvent.status === 'success' || existingEvent.status === 'ignored' || (existingEvent.status === 'processing' && !isStaleProcessing)) {
      auditLog({
        action: 'WEBHOOK_DUPLICATE_IGNORED',
        status: 'success',
        metadata: { gateway: 'razorpay', eventId },
        description: `Ignored duplicate Razorpay webhook event ${eventId}`
      });
      // Do NOT mutate the existing record — preserving the original status, timestamps,
      // and metadata is required for audit trail integrity.
      res.status(200).json({ received: true, status: 'already_processed' });
      return;
    }

    // Otherwise, it is 'failed' or stale 'processing'. Transition it back to 'processing' atomically.
    webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId, status: { $in: ['failed', 'processing'] } },
      { $set: { status: 'processing', processedAt: undefined, errorMessage: undefined } },
      { new: true }
    );

    if (!webhookEvent) {
      res.status(200).json({ received: true, status: 'already_processed_concurrently' });
      return;
    }
  } else {
    auditLog({
      action: 'WEBHOOK_RECEIVED',
      status: 'success',
      metadata: { gateway: 'razorpay', eventId, providerEventId, eventType, orderId: razorpayOrderId, paymentId: razorpayPaymentId },
      description: `Received Razorpay webhook event ${eventType} (ID: ${eventId})`
    });

    const rawPayloadStr = rawBody.toString('utf8');
    const payloadSize = Buffer.byteLength(rawPayloadStr, 'utf8');

    try {
      webhookEvent = await WebhookEvent.create({
        eventId,
        providerEventId,
        provider: 'razorpay',
        eventType,
        status: 'received',
        receivedAt: new Date(),
        providerEventTimestamp: body.created_at ? new Date(body.created_at * 1000) : undefined,
        rawPayload: body,
        payloadSize,
      });

      webhookEvent.status = 'processing';
      await webhookEvent.save();
    } catch (err: any) {
      if (err.code === 11000) {
        auditLog({
          action: 'WEBHOOK_DUPLICATE_IGNORED',
          status: 'success',
          metadata: { gateway: 'razorpay', eventId, eventType, reason: 'concurrent_request' },
          description: `Ignored concurrent duplicate Razorpay webhook event ${eventId}`
        });
        res.status(200).json({ received: true, status: 'already_processed_concurrently' });
        return;
      }
      throw err;
    }
  }

  // 4. Process actionable payment events.
  let result: { status: 'confirmed' | 'failed' | 'skipped' | 'completed' | 'anomaly'; bookingId?: string; refundId?: string; paymentId?: string } = { status: 'skipped' };

  if (razorpayOrderId && razorpayPaymentId) {
    try {
      const confirmResult = await PaymentService.confirmFromWebhook(
        razorpayOrderId,
        razorpayPaymentId,
        eventType,
        eventId,
        amount,
        currency
      );
      result = { status: confirmResult.status, bookingId: confirmResult.bookingId };

      webhookEvent.status = 'success';
      webhookEvent.bookingId = result.bookingId ? (result.bookingId as any) : undefined;
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      auditLog({
        action: 'WEBHOOK_PROCESS_SUCCESS',
        status: 'success',
        metadata: { gateway: 'razorpay', eventId, eventType, status: result.status },
        description: `Successfully processed Razorpay webhook event ${eventId} with outcome ${result.status}`
      });

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
          extra: { razorpayOrderId, razorpayPaymentId }
        });
      } catch (_) {}
      auditLog({
        action: 'WEBHOOK_PROCESS_FAILED',
        status: 'failure',
        metadata: { gateway: 'razorpay', eventId, eventType, orderId: razorpayOrderId, paymentId: razorpayPaymentId, error: err.message },
        description: `Failed to process Razorpay webhook ${eventId}: ${err.message}`
      });

      res.status(500).send('Webhook handler failed');
      return;
    }
  } else if (razorpayRefundId && (eventType === 'refund.processed' || eventType === 'refund.failed')) {
    try {
      const refundEntity = body.payload?.refund?.entity as RazorpayRefundWebhookPayload;
      const reconcileResult = await PaymentService.reconcileRazorpayRefundWebhook(
        refundEntity,
        eventType,
        eventId
      );
      result = reconcileResult;

      webhookEvent.status = 'success';
      if (result.refundId) {
        webhookEvent.rawPayload = {
          ...webhookEvent.rawPayload,
          _reconciledRefundId: result.refundId
        };
      }
      if (result.paymentId) {
        webhookEvent.paymentId = result.paymentId as any;
      }
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      auditLog({
        action: 'WEBHOOK_PROCESS_SUCCESS',
        status: 'success',
        metadata: { gateway: 'razorpay', eventId, eventType, status: result.status },
        description: `Successfully processed Razorpay webhook refund event ${eventId} with outcome ${result.status}`
      });

      if (result.status === 'anomaly') {
        logger.warn({ eventId, result }, 'Razorpay refund anomaly occurred.');
      }
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
          extra: { refundId: razorpayRefundId }
        });
      } catch (_) {}
      auditLog({
        action: 'WEBHOOK_PROCESS_FAILED',
        status: 'failure',
        metadata: { gateway: 'razorpay', eventId, eventType, refundId: razorpayRefundId, error: err.message },
        description: `Failed to process Razorpay refund webhook ${eventId}: ${err.message}`
      });

      res.status(500).send('Webhook handler failed');
      return;
    }
  } else {
    // If it's an event without an order ID / payment ID that we process
    webhookEvent.status = 'success';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
  }

  res.status(200).json({ received: true, status: result.status });
}

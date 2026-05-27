import { Request, Response, NextFunction } from "express";

import { getEnv } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import { PaymentService } from "../../services/public/payment.service";
import { sendSuccess } from "../../utils/response";
import { logger } from "../../utils/logger";
import { auditLog } from "../../utils/audit";

export async function createPaymentIntent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingId, gateway } = req.body;
    if (!bookingId || !["stripe", "razorpay"].includes(gateway)) {
      throw AppError.badRequest("bookingId and gateway are required");
    }
    const result = await PaymentService.createPaymentIntent(bookingId, gateway);
    sendSuccess(res, result, "Payment intent created");
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingId, ...gatewayPayload } = req.body;
    if (!bookingId) throw AppError.badRequest("bookingId is required");
    const booking = await PaymentService.verifyPayment(
      bookingId,
      gatewayPayload,
    );
    sendSuccess(res, booking, "Payment verified");
  } catch (err) {
    next(err);
  }
}

import { WebhookEvent } from "../../models/webhook-event.schema";
import crypto from "crypto";
import { getStripe } from "../../config/stripe";

export async function stripeWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const env = getEnv();
  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  const rawBody = (req as any).rawBody;

  if (!env.STRIPE_WEBHOOK_SECRET || !signature || !rawBody) {
    logger.warn(
      "Stripe webhook received but missing configuration or signatures",
    );
    res.status(400).send("Missing webhook configuration or payload");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    logger.error({ err }, "Stripe webhook signature validation failed");
    auditLog({
      action: "WEBHOOK_SIGNATURE_INVALID",
      status: "failure",
      metadata: { gateway: "stripe", error: err.message },
      description: `Stripe webhook signature validation failed: ${err.message}`,
    });
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  auditLog({
    action: "WEBHOOK_RECEIVED",
    status: "success",
    metadata: {
      gateway: "stripe",
      eventId: event.id,
      eventType: event.type,
      bookingId: (event.data.object as any).metadata?.bookingId,
    },
    description: `Received Stripe webhook event ${event.type} (ID: ${event.id})`,
  });

  const existingEvent = await WebhookEvent.findOne({ eventId: event.id });
  if (existingEvent) {
    auditLog({
      action: "WEBHOOK_DUPLICATE_IGNORED",
      status: "success",
      metadata: { gateway: "stripe", eventId: event.id, eventType: event.type },
      description: `Ignored duplicate Stripe webhook event ${event.id}`,
    });
    res.status(200).send("Event already processed");
    return;
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as any;
      const bookingId = intent.metadata?.bookingId;
      if (bookingId) {
        await PaymentService.verifyPayment(bookingId, {
          paymentIntentId: intent.id,
        });
      }
    }

    await WebhookEvent.create({ eventId: event.id, provider: "stripe" });
    auditLog({
      action: "WEBHOOK_PROCESS_SUCCESS",
      status: "success",
      metadata: { gateway: "stripe", eventId: event.id, eventType: event.type },
      description: `Successfully processed Stripe webhook event ${event.id}`,
    });
    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error({ err, eventId: event.id }, "Stripe webhook handler failed");
    auditLog({
      action: "WEBHOOK_PROCESS_FAILED",
      status: "failure",
      metadata: {
        gateway: "stripe",
        eventId: event.id,
        eventType: event.type,
        error: err.message,
      },
      description: `Failed to process Stripe webhook ${event.id}: ${err.message}`,
    });
    res.status(500).send("Webhook handler failed");
  }
}

export async function razorpayWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const env = getEnv();
  const rawBody = (req as any).rawBody;
  const signature = req.headers["x-razorpay-signature"] as string;

  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !rawBody) {
    logger.warn(
      "Razorpay webhook received but missing configuration or signatures",
    );
    res.status(400).send("Missing webhook configuration or payload");
    return;
  }

  // 1. Verify webhook HMAC signature against the raw body.
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    logger.error("Razorpay webhook signature validation failed");
    auditLog({
      action: "WEBHOOK_SIGNATURE_INVALID",
      status: "failure",
      metadata: { gateway: "razorpay" },
      description: "Razorpay webhook signature validation failed",
    });
    res.status(400).send("Invalid signature");
    return;
  }

  // 2. Idempotency — reject already-processed webhook events.
  const eventId = req.headers["x-razorpay-event-id"] as string;
  if (!eventId) {
    res.status(400).send("Missing x-razorpay-event-id header");
    return;
  }

  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    auditLog({
      action: "WEBHOOK_DUPLICATE_IGNORED",
      status: "success",
      metadata: { gateway: "razorpay", eventId },
      description: `Ignored duplicate Razorpay webhook event ${eventId}`,
    });
    res.status(200).json({ received: true, status: "already_processed" });
    return;
  }

  // 3. Parse event type and payment entity.
  let eventType: string;
  let razorpayPaymentId: string | undefined;
  let razorpayOrderId: string | undefined;

  try {
    const body = JSON.parse(rawBody);
    eventType = body.event;
    razorpayPaymentId = body.payload?.payment?.entity?.id;
    razorpayOrderId = body.payload?.payment?.entity?.order_id;
  } catch (err: any) {
    res.status(400).send("Malformed JSON payload");
    return;
  }

  auditLog({
    action: "WEBHOOK_RECEIVED",
    status: "success",
    metadata: {
      gateway: "razorpay",
      eventId,
      eventType,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
    },
    description: `Received Razorpay webhook event ${eventType} (ID: ${eventId})`,
  });

  // 4. Process actionable payment events.
  let result: {
    status: "confirmed" | "failed" | "skipped";
    bookingId?: string;
  } = { status: "skipped" };

  if (razorpayOrderId && razorpayPaymentId) {
    try {
      result = await PaymentService.confirmFromWebhook(
        razorpayOrderId,
        razorpayPaymentId,
        eventType,
        eventId,
      );
    } catch (err: any) {
      logger.error(
        { err, eventId, eventType, razorpayOrderId, razorpayPaymentId },
        "PR-03: Unexpected error in Razorpay webhook confirmation — requires manual review",
      );
      auditLog({
        action: "WEBHOOK_PROCESS_FAILED",
        status: "failure",
        metadata: {
          gateway: "razorpay",
          eventId,
          eventType,
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          error: err.message,
        },
        description: `Failed to process Razorpay webhook ${eventId}: ${err.message}`,
      });
    }
  }

  // 5. Record the processed event (with booking/payment links if resolved).
  try {
    await WebhookEvent.create({
      eventId,
      provider: "razorpay",
      bookingId: result.bookingId ? result.bookingId : undefined,
    });
    auditLog({
      action: "WEBHOOK_PROCESS_SUCCESS",
      status: "success",
      metadata: {
        gateway: "razorpay",
        eventId,
        eventType,
        status: result.status,
      },
      description: `Successfully processed Razorpay webhook event ${eventId} with outcome ${result.status}`,
    });
  } catch (err: any) {
    if (err.code !== 11000) {
      logger.error({ err, eventId }, "PR-03: Failed to record WebhookEvent");
      auditLog({
        action: "WEBHOOK_PROCESS_FAILED",
        status: "failure",
        metadata: {
          gateway: "razorpay",
          eventId,
          eventType,
          error: err.message,
        },
        description: `Failed to record processed Razorpay webhook event ${eventId}`,
      });
    }
  }

  res.status(200).json({ received: true, status: result.status });
}

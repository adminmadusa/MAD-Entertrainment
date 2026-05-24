import { Request, Response, NextFunction } from 'express';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { PaymentService } from '../../services/public/payment.service';
import { sendSuccess } from '../../utils/response';

export async function createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, gateway } = req.body;
    if (!bookingId || !['stripe', 'razorpay'].includes(gateway)) {
      throw AppError.badRequest('bookingId and gateway are required');
    }
    const result = await PaymentService.createPaymentIntent(bookingId, gateway);
    sendSuccess(res, result, 'Payment intent created');
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, ...gatewayPayload } = req.body;
    if (!bookingId) throw AppError.badRequest('bookingId is required');
    const booking = await PaymentService.verifyPayment(bookingId, gatewayPayload);
    sendSuccess(res, booking, 'Payment verified');
  } catch (err) {
    next(err);
  }
}

import { WebhookEvent } from '../../models/webhook-event.schema';
import crypto from 'crypto';
import { getStripe } from '../../config/stripe';

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const env = getEnv();
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const rawBody = (req as any).rawBody;

  if (!env.STRIPE_WEBHOOK_SECRET || !signature || !rawBody) {
    res.status(400).send('Missing webhook configuration or payload');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const existingEvent = await WebhookEvent.findOne({ eventId: event.id });
  if (existingEvent) {
    res.status(200).send('Event already processed');
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const bookingId = intent.metadata?.bookingId;
      if (bookingId) {
        await PaymentService.verifyPayment(bookingId, { paymentIntentId: intent.id });
      }
    }
    
    await WebhookEvent.create({ eventId: event.id, provider: 'stripe' });
    res.status(200).send({ received: true });
  } catch (err) {
    res.status(500).send('Webhook handler failed');
  }
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  const env = getEnv();
  const rawBody = (req as any).rawBody;
  const signature = req.headers['x-razorpay-signature'];

  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !rawBody) {
    res.status(400).send('Missing webhook configuration or payload');
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    res.status(400).send('Invalid signature');
    return;
  }

  const eventId = req.headers['x-razorpay-event-id'] as string;
  if (!eventId) {
    res.status(400).send('Missing event id');
    return;
  }

  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    res.status(200).send('Event already processed');
    return;
  }

  try {
    // We would fetch the payment using the webhook payload and then call PaymentService.verifyPayment.
    // For now, we will just record it to prevent replays. In a real system, we'd extract the order_id and payment_id from req.body and map it to a booking.
    await WebhookEvent.create({ eventId, provider: 'razorpay' });
    res.status(200).send({ received: true });
  } catch (err) {
    res.status(500).send('Webhook handler failed');
  }
}


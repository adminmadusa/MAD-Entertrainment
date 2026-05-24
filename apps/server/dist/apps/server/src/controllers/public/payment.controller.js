"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = createPaymentIntent;
exports.verifyPayment = verifyPayment;
exports.stripeWebhook = stripeWebhook;
exports.razorpayWebhook = razorpayWebhook;
const env_1 = require("../../config/env");
const error_middleware_1 = require("../../middleware/error.middleware");
const payment_service_1 = require("../../services/public/payment.service");
const response_1 = require("../../utils/response");
async function createPaymentIntent(req, res, next) {
    try {
        const { bookingId, gateway } = req.body;
        if (!bookingId || !['stripe', 'razorpay'].includes(gateway)) {
            throw error_middleware_1.AppError.badRequest('bookingId and gateway are required');
        }
        const result = await payment_service_1.PaymentService.createPaymentIntent(bookingId, gateway);
        (0, response_1.sendSuccess)(res, result, 'Payment intent created');
    }
    catch (err) {
        next(err);
    }
}
async function verifyPayment(req, res, next) {
    try {
        const { bookingId, ...gatewayPayload } = req.body;
        if (!bookingId)
            throw error_middleware_1.AppError.badRequest('bookingId is required');
        const booking = await payment_service_1.PaymentService.verifyPayment(bookingId, gatewayPayload);
        (0, response_1.sendSuccess)(res, booking, 'Payment verified');
    }
    catch (err) {
        next(err);
    }
}
const webhook_event_schema_1 = require("../../models/webhook-event.schema");
const crypto_1 = __importDefault(require("crypto"));
const stripe_1 = require("../../config/stripe");
async function stripeWebhook(req, res) {
    const env = (0, env_1.getEnv)();
    const stripe = (0, stripe_1.getStripe)();
    const signature = req.headers['stripe-signature'];
    const rawBody = req.rawBody;
    if (!env.STRIPE_WEBHOOK_SECRET || !signature || !rawBody) {
        res.status(400).send('Missing webhook configuration or payload');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    const existingEvent = await webhook_event_schema_1.WebhookEvent.findOne({ eventId: event.id });
    if (existingEvent) {
        res.status(200).send('Event already processed');
        return;
    }
    try {
        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object;
            const bookingId = intent.metadata?.bookingId;
            if (bookingId) {
                await payment_service_1.PaymentService.verifyPayment(bookingId, { paymentIntentId: intent.id });
            }
        }
        await webhook_event_schema_1.WebhookEvent.create({ eventId: event.id, provider: 'stripe' });
        res.status(200).send({ received: true });
    }
    catch (err) {
        res.status(500).send('Webhook handler failed');
    }
}
async function razorpayWebhook(req, res) {
    const env = (0, env_1.getEnv)();
    const rawBody = req.rawBody;
    const signature = req.headers['x-razorpay-signature'];
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !rawBody) {
        res.status(400).send('Missing webhook configuration or payload');
        return;
    }
    const expectedSignature = crypto_1.default
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
    if (expectedSignature !== signature) {
        res.status(400).send('Invalid signature');
        return;
    }
    const eventId = req.headers['x-razorpay-event-id'];
    if (!eventId) {
        res.status(400).send('Missing event id');
        return;
    }
    const existingEvent = await webhook_event_schema_1.WebhookEvent.findOne({ eventId });
    if (existingEvent) {
        res.status(200).send('Event already processed');
        return;
    }
    try {
        // We would fetch the payment using the webhook payload and then call PaymentService.verifyPayment.
        // For now, we will just record it to prevent replays. In a real system, we'd extract the order_id and payment_id from req.body and map it to a booking.
        await webhook_event_schema_1.WebhookEvent.create({ eventId, provider: 'razorpay' });
        res.status(200).send({ received: true });
    }
    catch (err) {
        res.status(500).send('Webhook handler failed');
    }
}
//# sourceMappingURL=payment.controller.js.map
import { Router } from 'express';

import { createPaymentIntent, verifyPayment, stripeWebhook, razorpayWebhook } from '../../controllers/public/payment.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { paymentLimiter, webhookLimiter } from '../../middleware/rate.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { createPaymentIntentSchema, verifyPaymentSchema } from '../../validations/payment.validation';

const router: Router = Router();

// ─── Secure payment endpoints ─────────────────────────────────────

router.post('/create-intent', optionalAuth, paymentLimiter as any, validateBody(createPaymentIntentSchema), createPaymentIntent);
router.post('/verify', optionalAuth, paymentLimiter as any, validateBody(verifyPaymentSchema), verifyPayment);
router.post('/webhook/stripe', webhookLimiter as any, stripeWebhook);
router.post('/webhook/razorpay', webhookLimiter as any, razorpayWebhook);

export default router;

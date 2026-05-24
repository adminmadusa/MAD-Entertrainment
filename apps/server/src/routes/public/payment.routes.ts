import { Router } from 'express';

import { createPaymentIntent, verifyPayment, stripeWebhook, razorpayWebhook } from '../../controllers/public/payment.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { paymentLimiter } from '../../middleware/rate.middleware';

const router: Router = Router();

// ─── Secure payment endpoints ─────────────────────────────────────

router.post('/create-intent', optionalAuth, paymentLimiter as any, createPaymentIntent);
router.post('/verify', optionalAuth, paymentLimiter as any, verifyPayment);
router.post('/webhook/stripe', stripeWebhook);
router.post('/webhook/razorpay', razorpayWebhook);

export default router;

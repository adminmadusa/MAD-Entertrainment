import { Router } from 'express';

import { createPaymentIntent, verifyPayment, stripeWebhook, razorpayWebhook } from '../../controllers/public/payment.controller';
<<<<<<< Updated upstream

const router = Router();

router.post('/create-intent', createPaymentIntent);
router.post('/verify', verifyPayment);
router.post('/webhook/stripe', stripeWebhook);
router.post('/webhook/razorpay', razorpayWebhook);
=======
import { optionalAuth } from '../../middleware/auth.middleware';
import { paymentLimiter } from '../../middleware/rate.middleware';
import { csrfProtection } from '../../middleware/csrf.middleware';

const router = Router();

// ─── Secure payment endpoints ─────────────────────────────────────

router.post('/create-intent', optionalAuth, paymentLimiter, createPaymentIntent);
router.post('/verify', optionalAuth, paymentLimiter, verifyPayment);
router.post('/webhook/stripe', csrfProtection, stripeWebhook);
router.post('/webhook/razorpay', csrfProtection, razorpayWebhook);
>>>>>>> Stashed changes

export default router;

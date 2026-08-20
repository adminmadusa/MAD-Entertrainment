import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { PaymentService } from '../../services/public/payment.service';
import { sendSuccess } from '../../utils/response';

export { stripeWebhook } from './payment-webhooks/stripe-webhook.controller';
export { razorpayWebhook } from './payment-webhooks/razorpay-webhook.controller';

export async function createPaymentIntent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

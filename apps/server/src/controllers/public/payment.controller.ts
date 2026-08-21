import { Request, Response, NextFunction } from 'express';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { UserModel } from '../../models/user.schema';
import { AuthSessionService } from '../../services/public/auth-session.service';
import { PaymentService } from '../../services/public/payment.service';
import { setXsrfCookie } from '../../utils/cookie';
import { logger } from '../../utils/logger';
import { sendSuccess } from '../../utils/response';

export { stripeWebhook } from './payment-webhooks/stripe-webhook.controller';
export { razorpayWebhook } from './payment-webhooks/razorpay-webhook.controller';

function setAuthCookies(res: Response, refreshToken: string, csrfToken: string): void {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  setXsrfCookie(res, csrfToken);
}

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

    let authPayload: { token?: string; user?: any } = {};
    let targetUserId = booking?.userId?.toString() || req.user?.sub;
    if (!targetUserId && booking?.guestEmail) {
      try {
        const userByEmail = await UserModel.findOne({ email: booking.guestEmail.trim().toLowerCase() });
        if (userByEmail) {
          targetUserId = userByEmail._id.toString();
        }
      } catch (lookupErr) {
        logger.warn({ lookupErr }, 'Failed to lookup user by guestEmail in verifyPayment');
      }
    }

    if (targetUserId) {
      try {
        const user = await UserModel.findById(targetUserId);
        if (user && user.isActive) {
          const { accessToken, refreshToken, csrfToken } = await AuthSessionService.issueTokens(
            user._id.toString(),
            user.email,
            'user'
          );
          setAuthCookies(res, refreshToken, csrfToken);
          authPayload = {
            token: accessToken,
            user: {
              id: user._id,
              userId: user._id.toString(),
              email: user.email,
              name: user.name,
              picture: user.picture,
              firstName: user.firstName ?? '',
              lastName: user.lastName ?? '',
              mobileNumber: user.mobileNumber ?? '',
              isEmailVerified: !!user.isEmailVerified,
            },
          };
        }
      } catch (authErr) {
        logger.warn({ authErr }, 'Failed to issue post-payment auth session tokens');
      }
    }

    sendSuccess(res, { booking, ...authPayload }, 'Payment verified');
  } catch (err) {
    next(err);
  }
}

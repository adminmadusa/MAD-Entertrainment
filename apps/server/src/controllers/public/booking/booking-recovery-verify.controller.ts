import { Request, Response, NextFunction } from 'express';

import { getEnv } from '../../../config/env';
import { AppError } from '../../../middleware/error.middleware';
import { AuthService } from '../../../services/public/auth.service';
import { BookingRecoveryService } from '../../../services/public/booking-recovery.service';
import { auditLog } from '../../../utils/audit';
import { setXsrfCookie } from '../../../utils/cookie';
import { requiresOnboarding } from '../../../utils/user';

export const maskTransactionId = (id: string): string => {
  if (!id || id.length <= 8) return '****';
  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
};

/**
 * Verify Recovered Booking OTP
 */
export async function verifyRecoveredBookingOTP(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { transactionId, otp } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  const maskedTxId = maskTransactionId(transactionId);

  try {
    auditLog({
      action: 'TRANSACTION_RECOVERY_VERIFY_ATTEMPT',
      status: 'pending',
      metadata: {
        transactionId: maskedTxId,
        ip,
        userAgent,
      },
      description: `Attempting OTP verification for booking recovery with transaction ID ${maskedTxId}`,
    });

    const booking = await BookingRecoveryService.getBookingByTransactionId(transactionId);

    const result = await AuthService.verifyMagicLinkOrOTP(otp, booking.guestEmail!);

    const env = getEnv();
    const isProd = env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      domain: env.COOKIE_DOMAIN || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Set CSRF Token cookie
    setXsrfCookie(res, result.csrfToken);

    auditLog({
      action: 'TRANSACTION_RECOVERY_VERIFY_SUCCESS',
      status: 'success',
      metadata: {
        transactionId: maskedTxId,
        bookingId: booking.bookingId,
        userId: result.user._id,
      },
      description: `Successfully verified OTP for booking recovery with transaction ID ${maskedTxId}`,
    });

    const onboardingRequired = requiresOnboarding(result.user);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user._id,
          email: result.user.email,
          name: result.user.name,
          picture: result.user.picture,
        },
        token: result.accessToken,
        onboardingRequired,
      },
    });
  } catch (err: any) {
    const reason = err instanceof AppError ? err.message : (err?.message || 'Unknown error');
    auditLog({
      action: 'TRANSACTION_RECOVERY_VERIFY_FAILURE',
      status: 'failure',
      metadata: {
        transactionId: maskedTxId,
        reason,
      },
      description: `Failed OTP verification for booking recovery with transaction ID ${maskedTxId}: ${reason}`,
    });

    if (err instanceof AppError && err.statusCode === 404) {
      res.status(404).json({
        success: false,
        message: 'Recovery information not found.',
      });
      return;
    }

    next(err);
  }
}

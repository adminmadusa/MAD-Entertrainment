import axios from 'axios';

import { HTTP_STATUS } from '@mad/shared';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface RazorpayRefundRequest {
  paymentId: string;
  amountPaise: number;
  idempotencyKey: string;
}

export interface RazorpayRefundResponse {
  id: string;
  status: 'pending' | 'processed' | 'failed';
}

/**
 * Creates a refund via Razorpay REST API directly.
 * Decouples the business logic layer from raw Axios and standardizes gateway errors.
 */
export async function createRazorpayRefund(params: RazorpayRefundRequest): Promise<RazorpayRefundResponse> {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Razorpay credentials are not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const credentials = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');

  try {
    const response = await axios.post<{ id: string; status: 'pending' | 'processed' | 'failed' }>(
      `https://api.razorpay.com/v1/payments/${params.paymentId}/refund`,
      { amount: params.amountPaise },
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'X-Refund-Idempotency': params.idempotencyKey,
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.status,
    };
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const rzpError = err.response?.data?.error;
      const rzpErrorMsg = rzpError?.description || err.message || 'Unknown Razorpay error';
      const rzpErrorCode = rzpError?.code || 'UNKNOWN_ERROR';
      const message = `Razorpay refund failed: ${rzpErrorMsg}`;

      // Log full diagnostic information locally
      logger.error(
        {
          err,
          paymentId: params.paymentId,
          amountPaise: params.amountPaise,
          idempotencyKey: params.idempotencyKey,
          httpStatus: status,
          razorpayErrorCode: rzpErrorCode,
          razorpayErrorMsg: rzpErrorMsg,
        },
        'Razorpay refund API call failed'
      );

      // Map to correct domain-friendly AppError status
      if (status === HTTP_STATUS.BAD_REQUEST) {
        throw AppError.badRequest(message);
      }
      if (status === HTTP_STATUS.UNAUTHORIZED) {
        throw AppError.unauthorized(message);
      }
      if (status === HTTP_STATUS.FORBIDDEN) {
        throw AppError.forbidden(message);
      }
      if (status === HTTP_STATUS.NOT_FOUND) {
        throw AppError.notFound(message);
      }
      if (status === HTTP_STATUS.CONFLICT) {
        throw AppError.conflict(message);
      }
      if (status && status >= 500) {
        throw new AppError(message, HTTP_STATUS.BAD_GATEWAY);
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND' || !status) {
        throw new AppError(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
      throw new AppError(message, status || HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Log unexpected errors
    logger.error({ err, paymentId: params.paymentId }, 'Unexpected error in Razorpay refund client');
    throw new AppError(`Razorpay refund failed: ${err.message || 'Unknown error'}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

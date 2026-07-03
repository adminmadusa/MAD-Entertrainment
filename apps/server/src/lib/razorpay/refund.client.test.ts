import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { HTTP_STATUS } from '@mad/shared';
import { createRazorpayRefund } from './refund.client';
import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(),
  },
  isAxiosError: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'rzp_test_secret',
    NODE_ENV: 'test',
  })),
}));

describe('Razorpay Refund Client Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret',
    } as any);
  });

  it('should successfully trigger a full refund and verify custom idempotency header', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: 'rfnd_123', status: 'processed' },
    });

    const result = await createRazorpayRefund({
      paymentId: 'pay_123',
      amountPaise: 50000,
      idempotencyKey: 'refund_idemp_key',
    });

    expect(result).toEqual({ id: 'rfnd_123', status: 'processed' });
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments/pay_123/refund',
      { amount: 50000 },
      {
        headers: {
          'Authorization': expect.stringContaining('Basic '),
          'Content-Type': 'application/json',
          'X-Refund-Idempotency': 'refund_idemp_key',
        },
      }
    );
  });

  it('should successfully trigger a partial refund', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: 'rfnd_123', status: 'pending' },
    });

    const result = await createRazorpayRefund({
      paymentId: 'pay_123',
      amountPaise: 25000,
      idempotencyKey: 'refund_idemp_key_2',
    });

    expect(result).toEqual({ id: 'rfnd_123', status: 'pending' });
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments/pay_123/refund',
      { amount: 25000 },
      expect.anything()
    );
  });

  it('should throw AppError if credentials are not configured', async () => {
    vi.mocked(getEnv).mockReturnValue({} as any);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(new AppError('Razorpay credentials are not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR));
  });

  it('should map 400 Bad Request to AppError.badRequest', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.BAD_REQUEST,
        data: { error: { description: 'Bad refund details', code: 'BAD_REQUEST_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(AppError.badRequest('Razorpay refund failed: Bad refund details'));
  });

  it('should map 401 Unauthorized to AppError.unauthorized', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.UNAUTHORIZED,
        data: { error: { description: 'Invalid API Key', code: 'UNAUTHORIZED_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(AppError.unauthorized('Razorpay refund failed: Invalid API Key'));
  });

  it('should map 403 Forbidden to AppError.forbidden', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.FORBIDDEN,
        data: { error: { description: 'Access Denied', code: 'FORBIDDEN_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(AppError.forbidden('Razorpay refund failed: Access Denied'));
  });

  it('should map 404 Not Found to AppError.notFound', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.NOT_FOUND,
        data: { error: { description: 'Payment not found', code: 'BAD_REQUEST_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(AppError.notFound('Razorpay refund failed: Payment not found'));
  });

  it('should map 409 Conflict to AppError.conflict', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.CONFLICT,
        data: { error: { description: 'Refund already exists', code: 'BAD_REQUEST_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(AppError.conflict('Razorpay refund failed: Refund already exists'));
  });

  it('should map 5xx to BAD_GATEWAY', async () => {
    const errorResponse = {
      response: {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        data: { error: { description: 'Razorpay Internal Error', code: 'GATEWAY_ERROR' } },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(new AppError('Razorpay refund failed: Razorpay Internal Error', HTTP_STATUS.BAD_GATEWAY));
  });

  it('should map network timeout or connection error to SERVICE_UNAVAILABLE', async () => {
    const errorResponse = {
      code: 'ECONNABORTED',
      message: 'timeout of 5000ms exceeded',
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(
      createRazorpayRefund({
        paymentId: 'pay_123',
        amountPaise: 50000,
        idempotencyKey: 'key',
      })
    ).rejects.toThrowError(new AppError('Razorpay refund failed: timeout of 5000ms exceeded', HTTP_STATUS.SERVICE_UNAVAILABLE));
  });
});

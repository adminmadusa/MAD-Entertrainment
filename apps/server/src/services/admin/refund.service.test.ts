import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefund } from './refund.service';
import { Refund } from '../../models/refund.schema';
import { Payment } from '../../models/payment.schema';
import { cancelBooking, runInTransaction } from './booking.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_admin',
    JWT_SESSION_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_session',
  })),
}));

vi.mock('./booking.service', () => ({
  runInTransaction: vi.fn(async (fn) => fn('mock-session')),
  cancelBooking: vi.fn(),
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    findByIdAndUpdate: vi.fn(),
  },
}));

describe('Admin Refund Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRefund', () => {
    it('should successfully approve a refund and trigger booking cancellation and payment refund', async () => {
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 100,
        status: 'completed',
        adminNotes: 'Approve notes',
        gatewayRefundId: 'gateway-ref-123',
      };

      vi.mocked(Refund.findOneAndUpdate).mockResolvedValue(mockRefund as any);
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Approve notes', 'gateway-ref-123');

      expect(result).toEqual(mockRefund);
      expect(Refund.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'refund-123', status: 'requested' },
        expect.objectContaining({
          status: 'completed',
          adminNotes: 'Approve notes',
          gatewayRefundId: 'gateway-ref-123',
        }),
        { new: true, session: 'mock-session' }
      );
      expect(cancelBooking).toHaveBeenCalledWith('booking-456', 'Approve notes', 'mock-session', 'refunded');
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-789',
        { status: 'refunded' },
        { session: 'mock-session' }
      );
    });

    it('should successfully reject a refund and update status without cancelling booking or refunding payment', async () => {
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 100,
        status: 'failed',
        adminNotes: 'Reject notes',
      };

      vi.mocked(Refund.findOneAndUpdate).mockResolvedValue(mockRefund as any);

      const result = await processRefund('refund-123', 'reject', 'Reject notes');

      expect(result).toEqual(mockRefund);
      expect(Refund.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'refund-123', status: 'requested' },
        expect.objectContaining({
          status: 'failed',
          adminNotes: 'Reject notes',
        }),
        { new: true, session: 'mock-session' }
      );
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw an error (bad request) if the refund is not found or already processed (findOneAndUpdate returns null)', async () => {
      vi.mocked(Refund.findOneAndUpdate).mockResolvedValue(null);

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund request not found or has already been processed');

      expect(Refund.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'refund-123', status: 'requested' },
        expect.objectContaining({
          status: 'completed',
          adminNotes: 'Approve notes',
        }),
        { new: true, session: 'mock-session' }
      );
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should fail and propagate error if cancelBooking throws an error', async () => {
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 100,
        status: 'completed',
      };

      vi.mocked(Refund.findOneAndUpdate).mockResolvedValue(mockRefund as any);
      vi.mocked(cancelBooking).mockRejectedValue(new Error('Cancel failed'));

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Cancel failed');

      expect(Refund.findOneAndUpdate).toHaveBeenCalled();
      expect(cancelBooking).toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});

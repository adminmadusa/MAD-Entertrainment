import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { createRazorpayRefund } from '../../lib/razorpay/refund.client';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { auditLog } from '../../utils/audit';
import { runInTransaction } from '../../utils/transaction';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { cancelBooking } from './booking.service';
import { createRefund, processRefund } from './refund.service';

vi.mock('../../lib/razorpay/refund.client', () => ({
  createRazorpayRefund: vi.fn(),
}));

const mockStripeRefundsCreate = vi.fn();
vi.mock('../../config/stripe', () => ({
  getStripe: () => ({
    refunds: {
      create: mockStripeRefundsCreate,
    },
  }),
}));

const mockRazorpayPaymentsRefund = vi.fn();
vi.mock('../../config/razorpay', () => ({
  getRazorpay: () => ({
    payments: {
      refund: mockRazorpayPaymentsRefund,
    },
  }),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_admin',
    JWT_SESSION_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_session',
    RAZORPAY_KEY_ID: 'test_key_id',
    RAZORPAY_KEY_SECRET: 'test_key_secret',
  })),
}));

vi.mock('./booking.service', () => ({
  cancelBooking: vi.fn(),
  executeCancelBookingSideEffects: vi.fn(),
}));

vi.mock('../public/booking/booking-lifecycle.service', () => ({
  BookingLifecycleService: {
    cancelSpecificTickets: vi.fn().mockResolvedValue({ success: true, voidedCount: 1, postCommitPayload: null }),
  },
}));

vi.mock('../../utils/transaction', () => ({
  runInTransaction: vi.fn(async (fn) => fn('mock-session')),
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

const createMockQuery = (val: any) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).populate = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  (query as any).limit = vi.fn().mockReturnValue(query);
  (query as any).skip = vi.fn().mockReturnValue(query);
  return query as any;
};

// Mock Mongoose models to completely avoid database dependency and allow easy static/instance mocking
vi.mock('../../models/refund.schema', () => {
  const MockRefund = vi.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
  });
  MockRefund.prototype.save = vi.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  });

  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };

  (MockRefund as any).findOne = vi.fn().mockImplementation(() => localCreateMockQuery(null));
  (MockRefund as any).findOneAndUpdate = vi.fn().mockImplementation(() => localCreateMockQuery(null));
  (MockRefund as any).find = vi.fn().mockImplementation(() => localCreateMockQuery([]));
  (MockRefund as any).countDocuments = vi.fn().mockImplementation(() => localCreateMockQuery(0));
  (MockRefund as any).updateOne = vi.fn().mockImplementation(() => localCreateMockQuery({ modifiedCount: 1 }));
  return { Refund: MockRefund };
});

vi.mock('../../models/payment.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };
  const MockPayment = {
    findByIdAndUpdate: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
    findById: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
    findOneAndUpdate: vi.fn().mockImplementation(function (filter: any) {
      return MockPayment.findById(filter?._id || filter);
    }),
  };
  return { Payment: MockPayment };
});

vi.mock('../../models/booking.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };
  const MockBooking = {
    findById: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
  };
  return { Booking: MockBooking };
});

vi.mock('../../models/ticket.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    return query;
  };
  const MockTicket = {
    find: vi.fn().mockImplementation(() => localCreateMockQuery([])),
  };
  return { Ticket: MockTicket };
});

describe('Admin Refund Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeRefundsCreate.mockReset();
    mockRazorpayPaymentsRefund.mockReset();
  });


  describe('PRICING-003 Scan Protection', () => {
    const scannedTicket = { _id: 'ticket-001', ticketId: 'TKT-001', scannedAt: new Date() };

    const mockScannedQuery = () => {
      const q = Promise.resolve([scannedTicket]);
      (q as any).session = () => q;
      return q as any;
    };

    it('should block refund if any ticket is scanned and manualOverride is false', async () => {
      const mockRefund = {
        _id: 'refund-scan-001', bookingId: 'booking-scan-001', paymentId: 'payment-scan-001',
        amount: 300, status: 'requested', origin: 'manual', save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-scan-001', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-001', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      await expect(
        processRefund('refund-scan-001', 'approve', 'Admin notes', 'gatewayId', false, undefined, { id: 'admin1', role: 'admin' })
      ).rejects.toThrow('Refund blocked: Selected tickets or booking contains checked-in tickets');
    });

    it('should block refund with 403 if actor is not super_admin and manualOverride is true', async () => {
      const mockRefund = {
        _id: 'refund-scan-002', bookingId: 'booking-scan-002', paymentId: 'payment-scan-002',
        amount: 300, status: 'requested', origin: 'manual', save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-scan-002', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-002', status: BookingStatus.CONFIRMED };
      const adminActor = { id: 'admin-user-001', role: 'admin' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      await expect(
        processRefund('refund-scan-002', 'approve', 'Admin notes', 'gate-ref-456', true, 'Override reason here', adminActor)
      ).rejects.toThrow('Only super_admin can override refunds for bookings with checked-in tickets');
    });

    it('should allow refund when actor is super_admin and manualOverride is true, and log real actor id', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-scan-003', bookingId: 'booking-scan-003', paymentId: 'payment-scan-003',
        amount: 300, status: 'requested', origin: 'manual', save: mockRefundSave,
      };
      const mockPayment = { _id: 'payment-scan-003', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-003', status: BookingStatus.CONFIRMED };
      const superAdminActor = { id: 'super-admin-001', role: 'super_admin' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      const result = await processRefund(
        'refund-scan-003', 'approve', 'Admin notes', 'gate-ref-789', true, 'Override reason here', superAdminActor
      );

      expect(result?.status).toBe('completed');
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REFUND_MANUAL_OVERRIDE',
        actor: expect.objectContaining({ id: 'super-admin-001' }),
      }));
    });

    it('should allow auto_recovery refund even if booking has scanned tickets (scan check is exempt)', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-auto-scan', bookingId: 'booking-auto-scan', paymentId: 'payment-auto-scan',
        amount: 500, status: 'requested', origin: 'auto_recovery', recoveryReason: 'AMOUNT_MISMATCH',
        save: mockRefundSave,
      };
      const mockPayment = {
        _id: 'payment-auto-scan', amount: 500, status: PaymentStatus.FAILED,
        gateway: 'stripe', gatewayOrderId: 'pi_auto_scan',
      };
      const mockBooking = { _id: 'booking-auto-scan', status: BookingStatus.FAILED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      // Even with scanned tickets, auto_recovery must NOT be blocked
      vi.mocked(Ticket.find).mockReturnValue(mockScannedQuery());

      mockStripeRefundsCreate.mockResolvedValue({ id: 're_auto_scan' });

      const result = await processRefund('refund-auto-scan', 'approve', 'Auto recovery notes');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('re_auto_scan');
    });
  });

  describe('3-Hour Lock & Super Admin Override Policy', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago (< 3 hours)
    const oldDate = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago (> 3 hours)

    it('should block normal admin approval when refund is recent (< 3 hours) and manualOverride is false', async () => {
      const mockRefund = {
        _id: 'refund-recent-001', bookingId: 'booking-recent-001', paymentId: 'payment-recent-001',
        amount: 300, status: 'requested', origin: 'manual', createdAt: recentDate, save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-recent-001', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-recent-001', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValue(createMockQuery([]));

      await expect(
        processRefund('refund-recent-001', 'approve', 'Admin notes', undefined, false, undefined, { id: 'admin1', role: 'admin' })
      ).rejects.toThrow('Refund request is locked: Must wait 3 hours before processing');
    });

    it('should block non-super_admin with 403 when attempting manualOverride on recent refund (< 3 hours)', async () => {
      const mockRefund = {
        _id: 'refund-recent-002', bookingId: 'booking-recent-002', paymentId: 'payment-recent-002',
        amount: 300, status: 'requested', origin: 'manual', createdAt: recentDate, save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-recent-002', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-recent-002', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValue(createMockQuery([]));

      await expect(
        processRefund('refund-recent-002', 'approve', 'Admin notes', 'gate-123', true, 'Reason for early override', { id: 'admin1', role: 'admin' })
      ).rejects.toThrow('Only super_admin can override the 3-hour wait constraint for refund processing');
    });

    it('should allow super_admin with manualOverride to process recent refund (< 3 hours)', async () => {
      const mockRefund = {
        _id: 'refund-recent-003', bookingId: 'booking-recent-003', paymentId: 'payment-recent-003',
        amount: 300, status: 'requested', origin: 'manual', createdAt: recentDate, save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-recent-003', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-recent-003', status: BookingStatus.CONFIRMED };
      const superAdminActor = { id: 'super-admin-001', role: 'super_admin' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Ticket.find).mockReturnValue(createMockQuery([]));

      const result = await processRefund(
        'refund-recent-003', 'approve', 'Admin notes', 'gate-override-123', true, 'Customer urgent flight cancellation', superAdminActor
      );

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('gate-override-123');
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REFUND_MANUAL_OVERRIDE',
        actor: expect.objectContaining({ id: 'super-admin-001' }),
      }));
    });

    it('should allow normal admin to process refund older than 3 hours without manualOverride', async () => {
      const mockRefund = {
        _id: 'refund-old-001', bookingId: 'booking-old-001', paymentId: 'payment-old-001',
        amount: 300, status: 'requested', origin: 'manual', createdAt: oldDate, save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-old-001', amount: 500, status: PaymentStatus.PAID, gateway: 'stripe', gatewayOrderId: 'pi_old_123' };
      const mockBooking = { _id: 'booking-old-001', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Ticket.find).mockReturnValue(createMockQuery([]));

      mockStripeRefundsCreate.mockResolvedValue({ id: 're_stripe_old' });

      const result = await processRefund('refund-old-001', 'approve', 'Old refund notes');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('re_stripe_old');
    });
  });
});


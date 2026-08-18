import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelBooking } from './booking.controller';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import * as bookingService from '../../services/admin/booking.service';
import * as refundService from '../../services/admin/refund.service';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../services/admin/booking.service', () => ({
  cancelBooking: vi.fn(),
  getBookings: vi.fn(),
  getBookingById: vi.fn(),
}));

vi.mock('../../services/admin/refund.service', () => ({
  createRefund: vi.fn(),
}));

function makeResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('Admin Booking Controller — Cancellation & Refund Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers canonical refund creation when refundAmount > 0', async () => {
    const req: any = {
      params: { id: 'booking-123' },
      body: {
        reason: 'Customer requested refund and cancel',
        refundAmount: 250,
        ticketIds: ['tkt-1', 'tkt-2'],
      },
      admin: { sub: 'admin-001', role: 'super_admin' },
    };
    const res = makeResponse();
    const next = vi.fn();

    const mockBooking = {
      _id: 'booking-123',
      paymentId: 'payment-456',
    };
    const mockPayment = {
      _id: 'payment-456',
      amount: 500,
    };
    const mockCreatedRefund = {
      _id: 'ref-new-001',
      bookingId: 'booking-123',
      paymentId: 'payment-456',
      amount: 250,
      status: 'requested',
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
    vi.mocked(refundService.createRefund).mockResolvedValue(mockCreatedRefund as any);

    await cancelBooking(req, res, next);

    expect(Booking.findById).toHaveBeenCalledWith('booking-123');
    expect(Payment.findById).toHaveBeenCalledWith('payment-456');
    expect(refundService.createRefund).toHaveBeenCalledWith({
      bookingId: 'booking-123',
      paymentId: 'payment-456',
      amount: 250,
      reason: 'Customer requested refund and cancel',
      origin: 'manual',
      cancelTickets: true,
      ticketIds: ['tkt-1', 'tkt-2'],
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockCreatedRefund,
        message: expect.stringContaining('Refund requested successfully'),
      })
    );
    expect(bookingService.cancelBooking).not.toHaveBeenCalled();
  });

  it('returns 400 when refundAmount > 0 but booking has no payment', async () => {
    const req: any = {
      params: { id: 'booking-no-pay' },
      body: {
        reason: 'Refund requested',
        refundAmount: 100,
      },
      admin: { sub: 'admin-001', role: 'admin' },
    };
    const res = makeResponse();
    const next = vi.fn();

    const mockBooking = {
      _id: 'booking-no-pay',
      paymentId: undefined,
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Payment.findOne).mockResolvedValue(null);

    await cancelBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cannot request refund for booking without payment',
    });
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });

  it('directly cancels booking without refund when refundAmount is not supplied', async () => {
    const req: any = {
      params: { id: 'booking-regular-cancel' },
      body: {
        reason: 'Event rescheduled',
      },
      admin: { sub: 'admin-002', role: 'admin' },
    };
    const res = makeResponse();
    const next = vi.fn();

    const mockCancelledBooking = {
      _id: 'booking-regular-cancel',
      status: 'cancelled',
    };

    vi.mocked(bookingService.cancelBooking).mockResolvedValue(mockCancelledBooking as any);

    await cancelBooking(req, res, next);

    expect(bookingService.cancelBooking).toHaveBeenCalledWith(
      'booking-regular-cancel',
      'Event rescheduled',
      undefined,
      undefined,
      { id: 'admin-002', role: 'admin' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockCancelledBooking,
      message: 'Booking cancelled successfully',
    });
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });
});

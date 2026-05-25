import { Refund, IRefund } from '../../models/refund.schema';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';

export const createRefund = async (data: {
  bookingId: string;
  paymentId: string;
  amount: number;
  reason?: string;
}): Promise<IRefund> => {
  const refund = new Refund({
    bookingId: data.bookingId,
    paymentId: data.paymentId,
    amount: data.amount,
    reason: data.reason,
    status: 'requested',
  });
  return await refund.save();
};

export const getRefunds = async (
  page: number = 1,
  limit: number = 15,
  status?: string
): Promise<{ refunds: IRefund[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;
  const filter: Record<string, any> = {};
  if (status) {
    filter.status = status;
  }

  const total = await Refund.countDocuments(filter);
  const refunds = await Refund.find(filter)
    .populate('bookingId', 'bookingId totalAmount status')
    .populate('paymentId', 'gatewayPaymentId amount status gateway')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    refunds,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const processRefund = async (
  id: string,
  action: 'approve' | 'reject',
  adminNotes?: string,
  gatewayRefundId?: string
): Promise<IRefund | null> => {
  const status = action === 'approve' ? 'completed' : 'failed';
  const updated = await Refund.findByIdAndUpdate(
    id,
    {
      status,
      adminNotes,
      gatewayRefundId,
      processedAt: new Date(),
    },
    { new: true }
  );

  if (updated && status === 'completed') {
    // If the refund is successfully completed, update the booking status to cancelled/refunded
    await Booking.findByIdAndUpdate(updated.bookingId, {
      status: 'cancelled',
      cancellationReason: adminNotes || 'Admin Refund Processed',
      cancelledAt: new Date(),
    });
    await Payment.findByIdAndUpdate(updated.paymentId, {
      status: 'refunded',
    });
  }

  return updated;
};

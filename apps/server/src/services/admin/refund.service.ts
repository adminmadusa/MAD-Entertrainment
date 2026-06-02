import { Refund, IRefund } from '../../models/refund.schema';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { runInTransaction, cancelBooking } from './booking.service';
import { AppError } from '../../middleware/error.middleware';
import { BookingStatus } from '@mad/shared';

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
    .populate({
      path: 'bookingId',
      select: 'bookingId totalAmount status eventId guestInfo userId createdAt totalTickets ticketsScanned',
      populate: { path: 'eventId', select: 'title startDate venue' }
    })
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
  return runInTransaction(async (session) => {
    const status = action === 'approve' ? 'completed' : 'failed';

    const updated = await Refund.findOneAndUpdate(
      { _id: id, status: 'requested' },
      {
        status,
        adminNotes,
        gatewayRefundId,
        processedAt: new Date(),
      },
      { new: true, session }
    );

    if (!updated) {
      throw AppError.badRequest('Refund request not found or has already been processed');
    }

    if (status === 'completed') {
      // Trigger core booking, seat, and inventory cancellation cleanup
      await cancelBooking(updated.bookingId.toString(), adminNotes || 'Admin Refund Processed', session, BookingStatus.REFUNDED);

      // Update payment status to refunded
      await Payment.findByIdAndUpdate(
        updated.paymentId,
        { status: 'refunded' },
        { session }
      );
    }

    return updated;
  });
};

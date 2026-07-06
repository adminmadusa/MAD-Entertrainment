import { BookingStatus, PaymentStatus, RefundStatus } from '@mad/shared';

import { AppError } from '../../../middleware/error.middleware';
import { Booking } from '../../../models/booking.schema';
import { Payment } from '../../../models/payment.schema';
import { Refund, IRefund } from '../../../models/refund.schema';
import { Ticket } from '../../../models/ticket.schema';
import { runInTransaction } from '../../../utils/transaction';
import { cancelBooking } from '../booking.service';
import { RefundValidationService } from './refund-validation.service';

export class RefundLifecycleService {
  /**
   * Creates a new Refund request record inside a transaction.
   */
  static async createRefundRecord(data: {
    bookingId: string;
    paymentId: string;
    amount: number;
    reason?: string;
    idempotencyKey: string;
    origin?: string;
    recoveryReason?: string;
    cancelTickets?: boolean;
  }): Promise<IRefund> {
    return await runInTransaction(async (session) => {
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw AppError.notFound('Payment record not found');
      }

      // Delegate payment validation constraints (early validation check)
      RefundValidationService.validateRefundCreationConstraints({
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        payment,
        booking: null,
        existingSum: 0,
      });

      const booking = await Booking.findById(data.bookingId).session(session);
      if (!booking) {
        throw AppError.notFound('Booking record not found');
      }

      // Check for existing refund request with same idempotency key if provided
      const existingRefund = await Refund.findOne({
        idempotencyKey: data.idempotencyKey,
        status: { $in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
      }).session(session);
      if (existingRefund) {
        return existingRefund;
      }

      // Fetch existing refunds to compute cumulative balance
      const existingRefunds = await Refund.find({
        paymentId: payment._id,
        status: { $in: [RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
      }).session(session);
      const existingSum = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

      // Delegate final validation constraints (booking and sum checks)
      RefundValidationService.validateRefundCreationConstraints({
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        payment,
        booking,
        existingSum,
      });

      const refund = new Refund({
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        status: RefundStatus.REQUESTED,
        idempotencyKey: data.idempotencyKey,
        origin: data.origin || 'manual',
        recoveryReason: data.recoveryReason,
        cancelTickets: data.cancelTickets || false,
      });
      return await refund.save({ session });
    });
  }

  /**
   * Phase 1: Atomically locks and reserves the refund and parent payment/booking.
   */
  static async claimRefundRecord(id: string): Promise<{
    refund: IRefund;
    payment: any;
    booking: any;
    totalRefundedSoFar: number;
    scannedTicketsCount: number;
  }> {
    return await runInTransaction(async (session) => {
      const refund = await Refund.findOneAndUpdate(
        { _id: id, status: RefundStatus.REQUESTED },
        { $set: { status: RefundStatus.PROCESSING } },
        { session, new: true }
      );
      if (!refund) {
        throw AppError.badRequest('Refund request not found or has already been processed');
      }

      const payment = await Payment.findOneAndUpdate(
        { _id: refund.paymentId },
        { $set: { updatedAt: new Date() } },
        { new: true }
      ).session(session);
      if (!payment) {
        throw AppError.notFound('Payment record not found');
      }

      const booking = await Booking.findById(refund.bookingId).session(session);
      if (!booking) {
        throw AppError.notFound('Booking record not found');
      }

      // Early integrity assertion (Run before database queries to prevent hangs / mock leakage)
      RefundValidationService.assertProductionRefundIntegrity(
        [id, refund.paymentId.toString(), payment.gatewayPaymentId, payment.gatewayOrderId],
        {
          bookingId: refund.bookingId.toString(),
          paymentId: refund.paymentId.toString(),
          gateway: payment.gateway,
          requestSource: 'process_refund',
        }
      );

      // Fetch dynamic ticket/refund count state
      const scannedTickets = await Ticket.find({ bookingId: booking._id, scannedAt: { $ne: null } }).session(session as any);
      const scannedTicketsCount = scannedTickets.length;

      const existingRefunds = await Refund.find({
        paymentId: payment._id,
        status: { $in: [RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
        _id: { $ne: refund._id }
      }).session(session);
      const totalRefundedSoFar = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

      return { refund, payment, booking, totalRefundedSoFar, scannedTicketsCount };
    });
  }

  /**
   * Reverts the processing status back to requested on Phase 1/Phase 2 failure.
   */
  static async revertClaimRefundRecord(id: string): Promise<void> {
    await Refund.updateOne(
      { _id: id, status: RefundStatus.PROCESSING },
      { $set: { status: RefundStatus.REQUESTED } }
    );
  }

  /**
   * Reject path: Marks the refund request as failed/rejected inside a transaction.
   */
  static async rejectRefund(
    refund: any,
    adminNotes?: string
  ): Promise<{ updated: any; cancelPostCommitPayload: null }> {
    return await runInTransaction(async (session) => {
      refund.status = RefundStatus.FAILED;
      refund.adminNotes = adminNotes;
      refund.processedAt = new Date();
      await refund.save({ session });
      return { updated: refund, cancelPostCommitPayload: null };
    });
  }

  /**
   * Persists the gateway refund ID immediately to minimize consistency window.
   */
  static async persistGatewayRefundId(refundId: string, gatewayRefundId: string): Promise<void> {
    await Refund.updateOne(
      { _id: refundId },
      { $set: { gatewayRefundId } }
    );
  }

  /**
   * Phase 3: Finalizes the refund approval status, updates payment, and cancels bookings.
   */
  static async finalizeRefundApproval(params: {
    refund: any;
    adminNotes?: string;
    gatewayRefundId?: string;
    totalRefundedSoFar: number;
    bookingId: string;
    paymentId: string;
    cancelTickets?: boolean;
    actor?: { id: string; role: string };
  }): Promise<{ updated: any; cancelPostCommitPayload: any }> {
    const { refund, adminNotes, gatewayRefundId, totalRefundedSoFar, bookingId, paymentId, cancelTickets, actor } = params;

    return await runInTransaction(async (session) => {
      refund.status = RefundStatus.COMPLETED;
      refund.adminNotes = adminNotes;
      if (gatewayRefundId) {
        refund.gatewayRefundId = gatewayRefundId;
      }
      refund.processedAt = new Date();
      await refund.save({ session });

      const freshBooking = await Booking.findById(bookingId).session(session);
      if (!freshBooking) {
        throw AppError.notFound('Booking record not found');
      }

      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw AppError.notFound('Payment record not found');
      }

      const isFullRefund = (totalRefundedSoFar + refund.amount) === payment.amount;
      const newPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

      let cancelPostCommitPayload = null;

      if (isFullRefund) {
        if (freshBooking.status === BookingStatus.CONFIRMED) {
          const cancelResult = await cancelBooking(
            bookingId,
            adminNotes || 'Admin Refund Processed',
            session,
            BookingStatus.REFUNDED,
            actor
          );
          if (cancelResult && cancelResult.postCommitPayload) {
            cancelPostCommitPayload = cancelResult.postCommitPayload;
          }
        } else if (freshBooking.status === BookingStatus.CANCELLED) {
          const b = await Booking.findById(bookingId).session(session);
          if (b) {
            b.status = BookingStatus.REFUNDED;
            b.bookingVersion += 1;
            await b.save({ session });
          }
        }
      } else if (cancelTickets) {
        if (freshBooking.status === BookingStatus.CONFIRMED) {
          const cancelResult = await cancelBooking(
            bookingId,
            adminNotes || 'Admin Refund Processed',
            session,
            BookingStatus.CANCELLED,
            actor
          );
          if (cancelResult && cancelResult.postCommitPayload) {
            cancelPostCommitPayload = cancelResult.postCommitPayload;
          }
        }
      }

      await Payment.findByIdAndUpdate(
        paymentId,
        { status: newPaymentStatus },
        { session }
      );

      return { updated: refund, cancelPostCommitPayload };
    });
  }
}

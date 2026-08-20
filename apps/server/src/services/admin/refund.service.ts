import crypto from 'crypto';


import { AppError } from '../../middleware/error.middleware';
import { Refund, IRefund } from '../../models/refund.schema';
import { executeCancelBookingSideEffects } from './booking.service';
import { RefundAuditService } from './refund/refund-audit.service';
import { RefundGatewayService } from './refund/refund-gateway.service';
import { RefundLifecycleService } from './refund/refund-lifecycle.service';
import { RefundNotificationService } from './refund/refund-notification.service';
import { RefundValidationService } from './refund/refund-validation.service';

export const createRefund = async (data: {
  bookingId: string;
  paymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey?: string;
  origin?: 'manual' | 'auto_recovery';
  recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE';
  cancelTickets?: boolean;
  ticketIds?: string[];
}): Promise<IRefund> => {
  // 1. Service-Level positive amount check (Defense in depth)
  if (data.amount <= 0) {
    throw AppError.badRequest('Refund amount must be greater than zero');
  }

  const idempotencyKey = data.idempotencyKey || `manual-refund-${crypto.randomUUID()}`;

  try {
    const result = await RefundLifecycleService.createRefundRecord({
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      idempotencyKey,
      origin: data.origin,
      recoveryReason: data.recoveryReason,
      cancelTickets: data.cancelTickets,
      ticketIds: data.ticketIds,
    });
    return result;
  } catch (err: any) {
    const isDuplicateKey = err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');
    if (isDuplicateKey) {
      const cleanKey = String(idempotencyKey);
      RefundAuditService.logDuplicateRefundRace(cleanKey);
      const existing = await Refund.findOne({
        idempotencyKey: cleanKey,
      });
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
};

export const getRefunds = async (
  page: number = 1,
  limit: number = 15,
  status?: string,
  sortField?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<{ refunds: IRefund[]; total: number; totalPages: number }> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;
  const filter: Record<string, any> = {};
  if (typeof status === 'string' && status.trim()) {
    filter.status = status.trim().toLowerCase();
  }

  const SORT_FIELDS: Record<string, string> = {
    amount: 'amount',
    createdAt: 'createdAt',
    status: 'status'
  };
  const validSortField = sortField ? (SORT_FIELDS[sortField] ?? 'createdAt') : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions: any = { [validSortField]: sortDirection };
  if (validSortField !== 'createdAt') sortOptions.createdAt = -1;
  sortOptions._id = 1;

  const total = await Refund.countDocuments(filter);
  const refunds = await Refund.find(filter)
    .populate({
      path: 'bookingId',
      select: 'bookingId totalAmount status eventId guestInfo userId createdAt totalTickets ticketsScanned',
      populate: { path: 'eventId', select: 'title startDate venue' }
    })
    .populate('paymentId', 'gatewayPaymentId amount status gateway')
    .sort(sortOptions)
    .skip(skip)
    .limit(safeLimit);

  return {
    refunds,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
};

export const processRefund = async (
  id: string,
  action: 'approve' | 'reject',
  adminNotes?: string,
  gatewayRefundId?: string,
  manualOverride?: boolean,
  overrideReason?: string,
  actor?: { id: string; role: string }
): Promise<IRefund | null> => {
  let phase1Result: {
    refund: IRefund;
    payment: any;
    booking: any;
    totalRefundedSoFar: number;
    scannedTicketsCount: number;
  } | null = null;

  try {
    // Phase 1: Claim and Reserve within a transaction session
    phase1Result = await RefundLifecycleService.claimRefundRecord(id);
  } catch (err: any) {
    RefundAuditService.logProcessPhase1Error(id, err);
    await RefundLifecycleService.revertClaimRefundRecord(id).catch((revertErr) => {
      RefundAuditService.logRevertClaimError(id, revertErr);
    });
    throw err;
  }

  const { refund, payment, booking, totalRefundedSoFar, scannedTicketsCount } = phase1Result;
  let result = null;

  try {
    // 5. Action Reject Path
    if (action === 'reject') {
      result = await RefundLifecycleService.rejectRefund(refund, adminNotes);
    } else {
      // Validate processing constraints
      RefundValidationService.validateRefundProcessingConstraints({
        refund,
        payment,
        booking,
        scannedTicketsCount,
        totalRefundedSoFar,
        manualOverride,
        actor,
      });

      // 6. Action Approve Path: Execute gateway refund API call (Phase 2)
      let finalGatewayRefundId = gatewayRefundId;

      if (manualOverride) {
        if (!overrideReason || overrideReason.trim() === '') {
          throw AppError.badRequest('Manual override requires an override reason');
        }
        if (!gatewayRefundId || gatewayRefundId.trim() === '') {
          throw AppError.badRequest('Manual override requires a gateway refund ID');
        }
        // Emit manual override audit event
        RefundAuditService.logManualOverride({
          refund,
          payment,
          booking,
          gatewayRefundId,
          overrideReason,
          actor,
        });
      } else {
        const response = await RefundGatewayService.executeGatewayRefund({
          payment,
          refund,
          gatewayRefundId,
        });
        finalGatewayRefundId = response.id;
      }

      if (finalGatewayRefundId) {
        await RefundLifecycleService.persistGatewayRefundId(refund._id.toString(), finalGatewayRefundId).catch((err) => {
          RefundAuditService.logGatewayPersistError(refund._id.toString(), err);
        });
        refund.gatewayRefundId = finalGatewayRefundId;
      }

      // Phase 3: Finalization (inside second transaction session)
      result = await RefundLifecycleService.finalizeRefundApproval({
        refund,
        adminNotes,
        gatewayRefundId: finalGatewayRefundId,
        totalRefundedSoFar,
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
        cancelTickets: refund.cancelTickets,
        actor,
      });
    }
  } catch (err: any) {
    // Phase 4: Conditional Failure Recovery
    RefundAuditService.logProcessError(id, err);
    await RefundLifecycleService.revertClaimRefundRecord(id).catch((revertErr) => {
      RefundAuditService.logRevertClaimError(id, revertErr);
    });
    throw err;
  }

  if (result) {
    const { updated, cancelPostCommitPayload } = result;

    // Execute cancelBooking post-commit side effects sequentially with error isolation
    if (cancelPostCommitPayload) {
      try {
        await executeCancelBookingSideEffects(cancelPostCommitPayload);
      } catch (err) {
        RefundAuditService.logCancelSideEffectsError(err);
      }
    }

    // Trigger post-commit notifications
    await RefundNotificationService.sendRefundNotification(updated);

    return updated;
  }

  return null;
};

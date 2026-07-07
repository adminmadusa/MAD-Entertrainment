import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';

export class RefundAuditService {
  /**
   * Logs a warning for duplicate refund request creation race.
   */
  static logDuplicateRefundRace(idempotencyKey: string): void {
    logger.warn({ idempotencyKey }, 'Duplicate refund request creation race detected. Recovering existing refund.');
  }

  /**
   * Logs an error during Phase 1 of processing refund (claiming).
   */
  static logProcessPhase1Error(refundId: string, err: any): void {
    logger.error({ err, refundId }, 'Error in Phase 1 of processing refund. Reverting status to requested.');
  }

  /**
   * Logs an error when failing to revert a claimed refund record.
   */
  static logRevertClaimError(refundId: string, revertErr: any): void {
    logger.error({ revertErr, refundId }, 'Failed to revert refund status to requested.');
  }

  /**
   * Emits a manual override audit log event.
   */
  static logManualOverride(params: {
    refund: { _id: any; amount: number };
    payment: { _id: any };
    booking: { _id: any };
    gatewayRefundId: string;
    overrideReason: string;
    actor?: { id: string; role: string };
  }): void {
    const { refund, payment, booking, gatewayRefundId, overrideReason, actor } = params;
    auditLog({
      action: 'REFUND_MANUAL_OVERRIDE',
      actor: { type: 'admin', id: actor?.id || 'system' },
      status: 'success',
      metadata: {
        refundId: refund._id.toString(),
        paymentId: payment._id.toString(),
        bookingId: booking._id.toString(),
        amount: refund.amount,
        gatewayRefundId,
        overrideReason,
      },
      description: `Manual override executed for refund ${refund._id}. Reason: ${overrideReason}`,
    });
  }

  /**
   * Logs an error when failing to persist gatewayRefundId immediately.
   */
  static logGatewayPersistError(refundId: string, err: any): void {
    logger.error({ err, refundId }, 'Failed to persist gatewayRefundId immediately.');
  }

  /**
   * Logs an error during general processing of refund.
   */
  static logProcessError(refundId: string, err: any): void {
    logger.error({ err, refundId }, 'Error processing refund. Reverting status to requested.');
  }

  /**
   * Logs an error executing booking cancellation side effects post-commit.
   */
  static logCancelSideEffectsError(err: any): void {
    logger.error({ err }, 'Error executing booking cancel side effects post-commit in processRefund');
  }
}

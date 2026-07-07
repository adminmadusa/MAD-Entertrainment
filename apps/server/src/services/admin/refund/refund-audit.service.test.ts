import { describe, it, expect, vi, beforeEach } from 'vitest';

import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { RefundAuditService } from './refund-audit.service';

vi.mock('../../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RefundAuditService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logDuplicateRefundRace', () => {
    it('should log warning with idempotencyKey', () => {
      RefundAuditService.logDuplicateRefundRace('key-123');
      expect(logger.warn).toHaveBeenCalledWith(
        { idempotencyKey: 'key-123' },
        expect.stringContaining('Duplicate refund request creation race detected')
      );
    });
  });

  describe('logProcessPhase1Error', () => {
    it('should log error with err and refundId', () => {
      const err = new Error('Test error');
      RefundAuditService.logProcessPhase1Error('ref-123', err);
      expect(logger.error).toHaveBeenCalledWith(
        { err, refundId: 'ref-123' },
        expect.stringContaining('Error in Phase 1 of processing refund')
      );
    });
  });

  describe('logRevertClaimError', () => {
    it('should log error with revertErr and refundId', () => {
      const err = new Error('Revert error');
      RefundAuditService.logRevertClaimError('ref-123', err);
      expect(logger.error).toHaveBeenCalledWith(
        { revertErr: err, refundId: 'ref-123' },
        expect.stringContaining('Failed to revert refund status')
      );
    });
  });

  describe('logGatewayPersistError', () => {
    it('should log error with err and refundId', () => {
      const err = new Error('Persist error');
      RefundAuditService.logGatewayPersistError('ref-123', err);
      expect(logger.error).toHaveBeenCalledWith(
        { err, refundId: 'ref-123' },
        expect.stringContaining('Failed to persist gatewayRefundId')
      );
    });
  });

  describe('logProcessError', () => {
    it('should log error with err and refundId', () => {
      const err = new Error('Process error');
      RefundAuditService.logProcessError('ref-123', err);
      expect(logger.error).toHaveBeenCalledWith(
        { err, refundId: 'ref-123' },
        expect.stringContaining('Error processing refund')
      );
    });
  });

  describe('logCancelSideEffectsError', () => {
    it('should log error with err', () => {
      const err = new Error('Cancel error');
      RefundAuditService.logCancelSideEffectsError(err);
      expect(logger.error).toHaveBeenCalledWith(
        { err },
        expect.stringContaining('Error executing booking cancel side effects')
      );
    });
  });

  describe('logManualOverride', () => {
    it('should emit auditLog with correct payload and real actor identity', () => {
      const refund = { _id: 'ref-123', amount: 500 };
      const payment = { _id: 'pay-123' };
      const booking = { _id: 'bk-123' };
      const actor = { id: 'admin-999', role: 'admin' };

      RefundAuditService.logManualOverride({
        refund,
        payment,
        booking,
        gatewayRefundId: 'gt-777',
        overrideReason: 'Override notes',
        actor,
      });

      expect(auditLog).toHaveBeenCalledWith({
        action: 'REFUND_MANUAL_OVERRIDE',
        actor: { type: 'admin', id: 'admin-999' },
        status: 'success',
        metadata: {
          refundId: 'ref-123',
          paymentId: 'pay-123',
          bookingId: 'bk-123',
          amount: 500,
          gatewayRefundId: 'gt-777',
          overrideReason: 'Override notes',
        },
        description: 'Manual override executed for refund ref-123. Reason: Override notes',
      });
    });

    it('should fallback to system actor if actor is not provided', () => {
      const refund = { _id: 'ref-123', amount: 500 };
      const payment = { _id: 'pay-123' };
      const booking = { _id: 'bk-123' };

      RefundAuditService.logManualOverride({
        refund,
        payment,
        booking,
        gatewayRefundId: 'gt-777',
        overrideReason: 'Override notes',
      });

      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        actor: { type: 'admin', id: 'system' },
      }));
    });
  });
});

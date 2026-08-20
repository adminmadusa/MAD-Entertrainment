import * as Sentry from '@sentry/node';
import { BookingStatus, PaymentStatus, RefundStatus, isFullRefund } from '@mad/shared';
import { Booking } from '../../../models/booking.schema';
import { Payment } from '../../../models/payment.schema';
import { Refund } from '../../../models/refund.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { runInTransaction } from '../../../utils/transaction';
import { RefundNotificationService } from '../../admin/refund/refund-notification.service';
import { BookingLifecycleService } from '../booking/booking-lifecycle.service';
import type { NormalizedRefundData } from '../payment.types';

const { cancelBooking, executeCancelBookingSideEffects } = BookingLifecycleService;

export class PaymentRefundReconciliationService {
  static async reconcileRefundWebhook(
    params: NormalizedRefundData
  ): Promise<{
    status: 'completed' | 'failed' | 'anomaly' | 'skipped';
    refundId?: string;
    paymentId?: string;
  }> {
    const {
      gateway,
      gatewayPaymentId,
      gatewayRefundId,
      amountMajorUnits,
      gatewayStatus,
      webhookEventId,
    } = params;
    const isSucceeded = gatewayStatus === 'succeeded' || gatewayStatus === 'processed';
    const isFailed = gatewayStatus === 'failed';

    let refund = await Refund.findOne({ gatewayRefundId });

    if (!refund && gatewayPaymentId) {
      const paymentObj = await Payment.findOne({ gatewayPaymentId, gateway });
      if (paymentObj) {
        refund = await Refund.findOne({
          paymentId: paymentObj._id,
          status: { $in: [RefundStatus.PROCESSING, RefundStatus.REQUESTED] },
          amount: amountMajorUnits,
        });
      }
    }

    if (!refund) {
      const paymentObj = await Payment.findOne({ gatewayPaymentId, gateway });
      if (paymentObj) {
        const isFullGatewayRefund = isFullRefund(0, amountMajorUnits, paymentObj.amount);

        try {
          const result = await runInTransaction(async (session) => {
            await Payment.findOneAndUpdate(
              { _id: paymentObj._id },
              { $set: { updatedAt: new Date() } },
              { session, new: true }
            );

            const doubleCheck = await Refund.findOne({ gatewayRefundId }).session(session);
            if (doubleCheck) {
              return {
                status: 'completed' as const,
                refundId: doubleCheck._id.toString(),
                paymentId: paymentObj._id.toString(),
              };
            }

            const createdRefund = await Refund.create(
              [
                {
                  bookingId: paymentObj.bookingId,
                  paymentId: paymentObj._id,
                  amount: amountMajorUnits,
                  currency: paymentObj.currency,
                  reason: 'Reconciled from gateway-initiated refund webhook',
                  status: RefundStatus.COMPLETED,
                  origin: 'manual',
                  gatewayRefundId,
                  gatewayRefundStatus: gatewayStatus,
                  reconciledAt: new Date(),
                  processedAt: new Date(),
                  webhookEventId,
                  cancelTickets: isFullGatewayRefund,
                },
              ],
              { session }
            );

            const newRefundDoc = createdRefund[0];

            const otherCompletedRefunds = await Refund.find({
              paymentId: paymentObj._id,
              status: RefundStatus.COMPLETED,
              _id: { $ne: newRefundDoc._id },
            }).session(session);
            const totalCompletedRefunded = otherCompletedRefunds.reduce(
              (sum, r) => sum + r.amount,
              0
            );
            const isReallyFullRefund = isFullRefund(
              totalCompletedRefunded,
              newRefundDoc.amount,
              paymentObj.amount
            );
            const newPaymentStatus = isReallyFullRefund
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED;

            await Payment.findByIdAndUpdate(
              paymentObj._id,
              { status: newPaymentStatus },
              { session }
            );

            let cancelPostCommitPayload = null;
            const booking = await Booking.findById(paymentObj.bookingId).session(session);
            if (booking) {
              if (isReallyFullRefund) {
                if (booking.status === BookingStatus.CONFIRMED) {
                  const cancelResult = await cancelBooking(
                    booking._id.toString(),
                    `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Full Auto-Refund`,
                    session,
                    BookingStatus.REFUNDED
                  );
                  if (cancelResult && cancelResult.postCommitPayload) {
                    cancelPostCommitPayload = cancelResult.postCommitPayload;
                  }
                } else if (booking.status === BookingStatus.CANCELLED) {
                  booking.status = BookingStatus.REFUNDED;
                  booking.bookingVersion += 1;
                  await booking.save({ session });
                }
              } else {
                logger.info(
                  { paymentId: paymentObj._id, bookingId: booking._id },
                  'Partial gateway-initiated refund - flagging for manual review, booking active'
                );
              }
            }

            return {
              status: 'completed' as const,
              refundId: newRefundDoc._id.toString(),
              paymentId: paymentObj._id.toString(),
              cancelPostCommitPayload,
              isNewRefund: true,
            };
          });

          if (result.cancelPostCommitPayload) {
            try {
              await executeCancelBookingSideEffects(result.cancelPostCommitPayload);
            } catch (err) {
              logger.error(
                { err },
                `Error executing booking cancel side effects post-commit in reconcileRefundWebhook (${gateway})`
              );
            }
          }

          if (result.isNewRefund) {
            try {
              await RefundNotificationService.sendRefundNotificationById(result.refundId);
            } catch (err) {
              logger.error(
                { err, refundId: result.refundId },
                'Failed to trigger auto-created refund notification email'
              );
            }
          }

          return {
            status: result.status,
            refundId: result.refundId,
            paymentId: result.paymentId,
          };
        } catch (err: any) {
          logger.error(
            { err, gatewayRefundId },
            `Failed to process auto-created ${gateway} refund webhook`
          );
          throw err;
        }
      }
      logger.warn(
        { gatewayPaymentId, gatewayRefundId },
        `${gateway} webhook received but no matching Payment or Refund record found`
      );
      return { status: 'skipped' };
    }

    if (refund.status === RefundStatus.COMPLETED) {
      if (isFailed) {
        const gatewayLabel = gateway === 'stripe' ? 'Stripe' : 'Razorpay';
        const errMsg = `CRITICAL ANOMALY: Webhook reports ${gatewayLabel} refund ${gatewayRefundId} failed, but DB status is completed!`;
        logger.error({ refundId: refund._id, gatewayRefundId }, errMsg);

        auditLog({
          action: 'REFUND_RECONCILIATION_ANOMALY',
          actor: { type: 'admin', id: 'system' },
          status: 'failure',
          description: errMsg,
          metadata: {
            refundId: refund._id.toString(),
            gatewayRefundId,
            gatewayStatus,
            dbStatus: refund.status,
          },
        });

        Sentry.captureMessage(errMsg, { level: 'error' as const });
        return {
          status: 'anomaly',
          refundId: refund._id.toString(),
          paymentId: refund.paymentId.toString(),
        };
      }
      return {
        status: 'completed',
        refundId: refund._id.toString(),
        paymentId: refund.paymentId.toString(),
      };
    }

    if (refund.status === RefundStatus.FAILED) {
      if (isSucceeded) {
        const gatewayLabel = gateway === 'stripe' ? 'Stripe' : 'Razorpay';
        const errMsg = `CRITICAL ANOMALY: Webhook reports ${gatewayLabel} refund ${gatewayRefundId} succeeded, but DB status is failed!`;
        logger.error({ refundId: refund._id, gatewayRefundId }, errMsg);

        auditLog({
          action: 'REFUND_RECONCILIATION_ANOMALY',
          actor: { type: 'admin', id: 'system' },
          status: 'failure',
          description: errMsg,
          metadata: {
            refundId: refund._id.toString(),
            gatewayRefundId,
            gatewayStatus,
            dbStatus: refund.status,
          },
        });

        Sentry.captureMessage(errMsg, { level: 'error' as const });
        return {
          status: 'anomaly',
          refundId: refund._id.toString(),
          paymentId: refund.paymentId.toString(),
        };
      }
      return {
        status: 'failed',
        refundId: refund._id.toString(),
        paymentId: refund.paymentId.toString(),
      };
    }

    try {
      const result = await runInTransaction(async (session) => {
        const payment = await Payment.findOneAndUpdate(
          { _id: refund.paymentId },
          { $set: { updatedAt: new Date() } },
          { session, new: true }
        );

        if (!payment) throw new Error('Payment not found');

        const booking = await Booking.findById(refund.bookingId).session(session);
        if (!booking) throw new Error('Booking not found');

        const updatedRefund = await Refund.findOneAndUpdate(
          { _id: refund._id, status: { $in: [RefundStatus.PROCESSING, RefundStatus.REQUESTED] } },
          {
            $set: {
              status: isFailed ? RefundStatus.FAILED : RefundStatus.COMPLETED,
              gatewayRefundStatus: gatewayStatus,
              reconciledAt: new Date(),
              processedAt: new Date(),
              webhookEventId,
            },
          },
          { session, new: true }
        );

        if (!updatedRefund) {
          const currentRefund = await Refund.findById(refund._id).session(session);
          if (currentRefund?.status === RefundStatus.COMPLETED) {
            return {
              status: 'completed' as const,
              refundId: refund._id.toString(),
              paymentId: payment._id.toString(),
            };
          }
          return {
            status: 'failed' as const,
            refundId: refund._id.toString(),
            paymentId: payment._id.toString(),
          };
        }

        if (updatedRefund.status === RefundStatus.COMPLETED) {
          const otherCompletedRefunds = await Refund.find({
            paymentId: payment._id,
            status: RefundStatus.COMPLETED,
            _id: { $ne: updatedRefund._id },
          }).session(session);
          const totalCompletedRefunded = otherCompletedRefunds.reduce(
            (sum, r) => sum + r.amount,
            0
          );
          const isFullRefundStatus = isFullRefund(
            totalCompletedRefunded,
            updatedRefund.amount,
            payment.amount
          );
          const newPaymentStatus = isFullRefundStatus
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;

          await Payment.findByIdAndUpdate(payment._id, { status: newPaymentStatus }, { session });

          let cancelPostCommitPayload = null;
          if (isFullRefundStatus) {
            if (booking.status === BookingStatus.CONFIRMED) {
              const cancelResult = await cancelBooking(
                booking._id.toString(),
                `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Reconciled`,
                session,
                BookingStatus.REFUNDED
              );
              if (cancelResult && cancelResult.postCommitPayload) {
                cancelPostCommitPayload = cancelResult.postCommitPayload;
              }
            } else if (booking.status === BookingStatus.CANCELLED) {
              booking.status = BookingStatus.REFUNDED;
              booking.bookingVersion += 1;
              await booking.save({ session });
            }
          } else if (updatedRefund.cancelTickets && booking.status === BookingStatus.CONFIRMED) {
            const cancelResult = await cancelBooking(
              booking._id.toString(),
              `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Reconciled`,
              session,
              BookingStatus.CANCELLED
            );
            if (cancelResult && cancelResult.postCommitPayload) {
              cancelPostCommitPayload = cancelResult.postCommitPayload;
            }
          }

          return {
            status: 'completed' as const,
            refundId: updatedRefund._id.toString(),
            paymentId: payment._id.toString(),
            cancelPostCommitPayload,
            transitioned: true,
          };
        } else {
          return {
            status: 'failed' as const,
            refundId: updatedRefund._id.toString(),
            paymentId: payment._id.toString(),
          };
        }
      });

      if (result.cancelPostCommitPayload) {
        try {
          await executeCancelBookingSideEffects(result.cancelPostCommitPayload);
        } catch (err) {
          logger.error(
            { err },
            `Error executing booking cancel side effects post-commit in reconcileRefundWebhook (${gateway})`
          );
        }
      }

      if (result.status === 'completed' && result.transitioned) {
        try {
          await RefundNotificationService.sendRefundNotificationById(result.refundId);
        } catch (err) {
          logger.error(
            { err, refundId: result.refundId },
            'Failed to trigger reconciled refund notification email'
          );
        }
      }

      return { status: result.status, refundId: result.refundId, paymentId: result.paymentId };
    } catch (err: any) {
      logger.error(
        { err, refundId: refund._id },
        `Error during ${gateway} refund webhook reconciliation`
      );
      throw err;
    }
  }
}

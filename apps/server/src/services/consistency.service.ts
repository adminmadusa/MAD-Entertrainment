import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { getRedis, isRedisConnected } from '../config/redis';
import { emitToAdmin, emitToEvent } from '../config/socket';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Payment } from '../models/payment.schema';
import { Reservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { Notification } from '../models/notification.schema';
import { logger } from '../utils/logger';
import { runWithContext, getTraceContext } from '../utils/context';
import { auditLog } from '../utils/audit';
import crypto from 'crypto';

import { ReservationService } from './reservation.service';
import { Ticket } from '../models/ticket.schema';
import { QueueService } from './queue.service';
import { getQueueName } from '../config/queue.config';
import { Refund } from '../models/refund.schema';
import { PaymentService } from './public/payment.service';
import { fullRefundHtml, partialRefundHtml, eventCancellationHtml, paymentFailureHtml } from '../lib/email';
import { getEnv } from '../config/env';
import { createNotificationSafe } from './notification.service';

const UNTICKETED_BOOKING_WINDOW_MS = 48 * 60 * 60 * 1000;
const UNTICKETED_PAGE_SIZE = 25;
const STUCK_NOTIFICATION_THRESHOLD_MS = 15 * 60 * 1000;
const ORPHANED_DELIVERY_THRESHOLD_MS = 10 * 60 * 1000;

export interface ConsistencyReport {
  generatedAt: string;
  counts: {
    activeReservations: number;
    expiredReservations: number;
    redisLocks: number;
    awaitingPaymentBookings: number;
    orphanPayments: number;
  };
  drift: {
    staleSeatReservations: number;
    phantomRedisLocks: number;
    eventInventoryMismatches: number;
    unticketedConfirmedBookings: number;
    stuckNotifications: number;
    orphanedConfirmedDeliveries: number;
    paidPaymentMismatches?: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
    eventInventoryMismatchesRepaired?: number;
    logicallyExpiredBookings?: number;
    reEnqueuedUnticketedBookings?: number;
    resetStuckNotifications?: number;
    reEnqueuedOrphanedDeliveries?: number;
    repairedPaidPaymentMismatches?: number;
  };
}

async function countRedisLocks(): Promise<number> {
  if (!isRedisConnected()) return 0;
  const redis = getRedis();
  let cursor = '0';
  let count = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
    cursor = nextCursor;
    count += keys.length;
  } while (cursor !== '0');
  return count;
}

async function cleanupPhantomRedisLocks(): Promise<number> {
  if (!isRedisConnected()) return 0;
  const redis = getRedis();
  let cursor = '0';
  let removed = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
    cursor = nextCursor;
    for (const key of keys) {
      const [, , , eventId, , seatId] = key.split(':');
      if (!eventId || !seatId) continue;
      const layout = await SeatLayout.findOne({ eventId, 'seats.seatId': seatId }).select({ seats: { $elemMatch: { seatId } } }).lean();
      const seat = layout?.seats.find((candidate) => candidate.seatId === seatId);
      if (!seat || seat.status !== SeatStatus.AVAILABLE) {
        await redis.del(key);
        removed++;
      }
    }
  } while (cursor !== '0');

  return removed;
}

async function repairStaleSeatReservations(): Promise<number> {
  const staleReservations = await Reservation.find({
    status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
    seatId: { $exists: true },
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).limit(500);

  let repaired = 0;
  for (const reservation of staleReservations) {
    const result = await SeatLayout.updateOne(
      { eventId: reservation.eventId },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.AVAILABLE,
          },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
            'seats.$[seat].bookedByBookingId': '',
            'seats.$[seat].reservationId': '',
          },
          $inc: { 'seats.$[seat].seatVersion': 1 },
        },
      {
        arrayFilters: [
          {
            'seat.seatId': reservation.seatId,
            'seat.status': SeatStatus.LOCKED,
            'seat.reservationId': reservation.reservationId,
          },
        ],
      }
    );
    repaired += result.modifiedCount;
  }

  return repaired;
}

async function countEventInventoryMismatches(): Promise<number> {
  const events = await Event.find({}).select('_id soldCount reservedCount').lean();
  let mismatches = 0;

  for (const event of events) {
    const [confirmedBookings, activeReservations] = await Promise.all([
      Booking.aggregate([
        { $match: { eventId: event._id, status: BookingStatus.CONFIRMED } },
        { $group: { _id: null, total: { $sum: '$totalTickets' } } },
      ]),
      Reservation.aggregate([
        {
          $match: {
            eventId: event._id,
            status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] },
          },
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
    ]);

    const soldTotal = confirmedBookings[0]?.total ?? 0;
    const reservedTotal = activeReservations[0]?.total ?? 0;
    if (event.soldCount !== soldTotal || event.reservedCount !== reservedTotal) {
      mismatches++;
    }
  }

  return mismatches;
}

async function repairEventInventoryMismatches(): Promise<number> {
  const events = await Event.find({}).select('_id soldCount reservedCount ticketTiers eventVersion');
  let repairedCount = 0;

  for (const event of events) {
    const [confirmedBookings, activeReservations] = await Promise.all([
      Booking.aggregate([
        { $match: { eventId: event._id, status: BookingStatus.CONFIRMED } },
        { $group: { _id: null, total: { $sum: '$totalTickets' } } },
      ]),
      Reservation.aggregate([
        {
          $match: {
            eventId: event._id,
            status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] },
          },
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
    ]);

    const soldTotal = confirmedBookings[0]?.total ?? 0;
    const reservedTotal = activeReservations[0]?.total ?? 0;

    if (event.soldCount !== soldTotal || event.reservedCount !== reservedTotal) {
      // Also update individual tier soldCounts based on confirmed bookings
      const tierSoldCounts = new Map<string, number>();
      const confirmedBookingsDocs = await Booking.find({ eventId: event._id, status: BookingStatus.CONFIRMED }).lean();
      for (const bookingDoc of confirmedBookingsDocs) {
        for (const t of bookingDoc.tickets) {
          tierSoldCounts.set(t.tier, (tierSoldCounts.get(t.tier) ?? 0) + t.quantity);
        }
      }

      const updatedTiers = event.ticketTiers.map(t => {
        const actualSold = tierSoldCounts.get(t.tier) ?? 0;
        t.soldCount = actualSold;
        return t;
      });

      await Event.updateOne(
        { _id: event._id },
        { 
          $set: { 
            soldCount: soldTotal, 
            reservedCount: reservedTotal, 
            ticketTiers: updatedTiers,
            eventVersion: event.eventVersion + 1 
          } 
        }
      );
      repairedCount++;
    }
  }
  return repairedCount;
}

export class ConsistencyService {
  private static async repairUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .sort({ updatedAt: 1 })
      .limit(UNTICKETED_PAGE_SIZE)
      .select('_id totalTickets')
      .lean();

    if (candidates.length === UNTICKETED_PAGE_SIZE) {
      logger.warn({ count: candidates.length }, 'Watchdog: UNTICKETED_PAGE_SIZE limit reached during confirmed bookings check');
    }

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount === candidate.totalTickets) {
          continue;
        }

        const bookingStillExists = await Booking.exists({ _id: candidate._id });
        if (!bookingStillExists) {
          logger.warn({ bookingId: candidate._id }, 'watchdog: booking no longer exists, skipping enqueue');
          continue;
        }

        await QueueService.enqueue(
          getQueueName('booking-queue'),
          'booking:confirm',
          { bookingId: candidate._id.toString() },
          `booking:confirm:${candidate._id}`
        );
        successCount++;
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to repair unticketed booking');
      }
    }

    return successCount;
  }

  private static async countUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .select('_id totalTickets')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          count++;
        }
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to count tickets for booking');
      }
    }
    return count;
  }

  private static async repairStuckNotifications(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const stuckThreshold = new Date(Date.now() - STUCK_NOTIFICATION_THRESHOLD_MS);

    const candidates = await Notification.find({
      status: { $in: ['queued', 'processing'] },
      updatedAt: { $gte: windowStart, $lte: stuckThreshold },
    }).lean();

    let successCount = 0;
    for (const notification of candidates) {
      try {
        if (!notification.bookingId) {
          continue;
        }

        if (
          notification.type === NotificationType.FULL_REFUND ||
          notification.type === NotificationType.PARTIAL_REFUND
        ) {
          // ─── Refund Notifications ───
          // Recover independently of booking confirmation state.
          // Parse refund ID from jobId, e.g. refund-{refundId}-{timestamp}
          if (!notification.jobId || !notification.jobId.startsWith('refund-')) {
            continue;
          }
          const parts = notification.jobId.split('-');
          const refundId = parts[1];
          if (!refundId) {
            continue;
          }

          const refund = await Refund.findById(refundId);
          if (!refund || refund.status !== 'completed') {
            continue;
          }

          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking) {
            continue;
          }

          const event = await Event.findById(booking.eventId).lean();
          const totalAmount = booking.totalAmount;

          const completedRefunds = await Refund.find({
            paymentId: refund.paymentId,
            status: 'completed',
          }).lean();
          const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

          let emailHtml = '';
          let subject = '';

          if (notification.type === NotificationType.FULL_REFUND) {
            const formattedRefundDate = new Date(refund.processedAt || refund.updatedAt).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            emailHtml = await fullRefundHtml({
              customerName: booking.guestName,
              bookingReference: booking.bookingId,
              eventTitle: event?.title || 'MAD Event',
              refundAmount: refund.amount,
              refundDate: formattedRefundDate,
              settlementTimeline: '5-7 business days',
              currency: booking.currency || 'INR',
            });
            subject = `Refund Processed for ${booking.bookingId}`;
          } else {
            emailHtml = await partialRefundHtml({
              customerName: booking.guestName,
              bookingReference: booking.bookingId,
              originalAmount: totalAmount,
              refundAmount: refund.amount,
              remainingAmount: Math.max(0, totalAmount - totalRefunded),
              reason: refund.reason || 'Tier adjustment refund',
              currency: booking.currency || 'INR',
            });
            subject = `Partial Refund Processed for ${booking.bookingId}`;
          }

          // Transition state first to ensure single winner lease acquisition
          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            const newJobId = `refund-${refund._id}-${Date.now()}`;
            await createNotificationSafe([{
              jobId: newJobId,
              status: 'queued',
              queuedAt: new Date(),
              type: notification.type,
              channel: 'email',
              recipient: booking.guestEmail,
              subject,
              isSent: false,
              retryCount: 0,
              bookingId: booking._id,
              eventId: event?._id,
            }]);

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: booking.guestEmail,
                subject,
                html: emailHtml,
                notificationType: notification.type,
                bookingId: booking._id.toString(),
                eventId: event?._id?.toString() || booking.eventId.toString(),
              },
              newJobId
            );
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck refund notification and enqueued email job.');
          }
        } else if (notification.type === NotificationType.EVENT_CANCELLED) {
          // ─── Cancellation Notifications ───
          // Recover independently of booking confirmation state.
          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking) {
            continue;
          }

          const event = await Event.findById(booking.eventId).lean();
          if (!event) {
            continue;
          }

          const formattedDate = new Date(
            event.startDate || booking.createdAt
          ).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const emailBody = await eventCancellationHtml({
            customerName: booking.guestName,
            eventTitle: event.title || 'MAD Event',
            eventDate: formattedDate,
            venueName: event.venue || 'MAD Venue',
            bookingReference: booking.bookingId,
          });

          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            const newJobId = `cancellation-${booking.bookingId}-${Date.now()}`;
            await createNotificationSafe([{
              jobId: newJobId,
              status: 'queued',
              queuedAt: new Date(),
              type: NotificationType.EVENT_CANCELLED,
              channel: 'email',
              recipient: booking.guestEmail,
              subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
              isSent: false,
              retryCount: 0,
              bookingId: booking._id,
              eventId: event._id,
            }]);

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: booking.guestEmail,
                subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
                html: emailBody,
                notificationType: NotificationType.EVENT_CANCELLED,
                bookingId: booking._id.toString(),
                eventId: event._id.toString(),
              },
              newJobId
            );
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck event cancellation notification.');
          }
        } else {
          // ─── Ticket / Other Notifications (Keep existing behavior) ───
          // Only recover if BOOKING_CONFIRMED (which is the default or explicit BOOKING_CONFIRMED type)
          if (notification.type && notification.type !== NotificationType.BOOKING_CONFIRMED) {
            continue;
          }

          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking || booking.status !== BookingStatus.CONFIRMED) {
            continue;
          }

          // Delivery Protection: Only process if tickets are fully generated
          const ticketCount = await Ticket.countDocuments({ bookingId: booking._id });
          if (ticketCount !== booking.totalTickets) {
            continue;
          }

          // 1. Attempt recovery enqueue FIRST
          await QueueService.enqueue(
            getQueueName('pdf-queue'),
            'pdf:generate',
            {
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
              recipientEmail: booking.guestEmail,
              guestName: booking.guestName,
            },
            `pdf:generate:${booking._id}`
          );

          // 2. Only transition state if enqueue succeeds. Transition must be conditional.
          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck notification lease and re-enqueued PDF task.');
          } else {
            logger.warn({ notificationId: notification._id }, 'Watchdog: Stuck notification was updated concurrently, skipping lease reset.');
          }
        }
      } catch (error) {
        logger.warn({ notificationId: notification._id, error }, 'watchdog: failed to repair stuck notification');
      }
    }

    return successCount;
  }

  private static async countStuckNotifications(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const stuckThreshold = new Date(Date.now() - STUCK_NOTIFICATION_THRESHOLD_MS);

    return await Notification.countDocuments({
      status: { $in: ['queued', 'processing'] },
      updatedAt: { $gte: windowStart, $lte: stuckThreshold },
    });
  }

  private static async repairOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .sort({ updatedAt: 1 })
      .select('_id eventId guestEmail guestName totalTickets')
      .lean();

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          // Skip delivery since tickets are not fully generated yet
          continue;
        }

        const hasSentNotification = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });
        if (hasSentNotification) {
          continue;
        }

        // Final Sent-Notification Verification immediately before repair execution (race-condition check)
        const hasSentNotificationFinal = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });
        if (hasSentNotificationFinal) {
          logger.info({ bookingId: candidate._id }, 'Watchdog: Sent notification completed concurrently. Skipping repair.');
          continue;
        }

        await QueueService.enqueue(
          getQueueName('pdf-queue'),
          'pdf:generate',
          {
            bookingId: candidate._id.toString(),
            eventId: candidate.eventId.toString(),
            recipientEmail: candidate.guestEmail,
            guestName: candidate.guestName,
          },
          `pdf:generate:${candidate._id}`
        );

        successCount++;
        logger.info({ bookingId: candidate._id }, 'Watchdog successfully re-enqueued PDF generation for orphaned confirmed delivery.');
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to repair orphaned confirmed delivery');
      }
    }

    return successCount;
  }

  private static async countOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .select('_id totalTickets')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          continue;
        }

        const hasSentNotification = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });

        if (!hasSentNotification) {
          count++;
        }
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to count orphaned delivery candidate');
      }
    }
    return count;
  }

  private static async countPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).select('bookingId').lean();

    let count = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId).select('status').lean();
        if (!booking || booking.status !== BookingStatus.CONFIRMED) {
          count++;
        }
      } catch (error) {
        logger.warn({ paymentId: payment._id, error }, 'watchdog: failed to count paid payment mismatch');
      }
    }
    return count;
  }

  private static async repairPaidPaymentMismatches(): Promise<number> {
    const recoveryThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const candidatePayments = await Payment.find({
      status: PaymentStatus.PAID,
      updatedAt: { $lte: recoveryThreshold }
    }).limit(50);

    let successCount = 0;
    for (const payment of candidatePayments) {
      try {
        const booking = await Booking.findById(payment.bookingId);
        
        // Case C: Booking already FAILED, CANCELLED, or otherwise unrecoverable (including missing booking)
        if (!booking || booking.status === BookingStatus.FAILED || booking.status === BookingStatus.CANCELLED) {
          logger.warn(
            { paymentId: payment._id, bookingId: payment.bookingId, bookingStatus: booking?.status },
            'Watchdog: Booking is missing or in an unrecoverable status. Failing payment and triggering refund.'
          );
          
          payment.status = PaymentStatus.FAILED;
          payment.failedAt = new Date();
          payment.failureReason = 'BOOKING_UNRECOVERABLE';
          await payment.save();

          if (booking) {
            await (PaymentService as any).triggerRefundRequest(booking, payment, 'BOOKING_UNRECOVERABLE');
          } else {
            // Create refund request manually since booking is missing
            const idempotencyKey = `auto-refund-${payment._id}`;
            const existingRefund = await Refund.findOne({
              paymentId: payment._id,
              status: { $in: ['requested', 'processing', 'completed'] }
            });
            if (!existingRefund) {
              await Refund.create([{
                bookingId: payment.bookingId,
                paymentId: payment._id,
                amount: payment.amount,
                currency: payment.currency || 'INR',
                reason: 'BOOKING_UNRECOVERABLE',
                status: 'requested',
                idempotencyKey,
              }]);
            }
          }
          successCount++;
          continue;
        }

        // Already confirmed (no repair needed)
        if (booking.status === BookingStatus.CONFIRMED) {
          continue;
        }

        // Case A: Booking status is AWAITING_PAYMENT, EXPIRING, EXPIRED
        if (
          booking.status === BookingStatus.AWAITING_PAYMENT ||
          booking.status === BookingStatus.EXPIRING ||
          booking.status === BookingStatus.EXPIRED
        ) {
          logger.info(
            { paymentId: payment._id, bookingId: booking._id, bookingStatus: booking.status },
            'Watchdog: Attempting recovery for paid payment with unconfirmed booking.'
          );

          try {
            const confirmResult = await (PaymentService as any).confirmBooking(booking, payment);
            
            const updatedBooking = await Booking.findById(booking._id).select('status').lean();
            if (updatedBooking?.status === BookingStatus.CONFIRMED) {
              logger.info(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Successfully recovered booking to CONFIRMED status.'
              );
              successCount++;
            } else {
              // Case B: Recovery fails or Capacity unavailable or Late recovery rejected
              logger.warn(
                { paymentId: payment._id, bookingId: booking._id },
                'Watchdog: Booking confirmation did not transition to CONFIRMED. Failing payment and triggering refund.'
              );

              payment.status = PaymentStatus.FAILED;
              payment.failedAt = new Date();
              payment.failureReason = payment.failureReason || 'LATE_PAYMENT_RECOVERY_REJECTED';
              await payment.save();
              await (PaymentService as any).triggerRefundRequest(booking, payment, payment.failureReason);
              successCount++;
            }
          } catch (confirmError: any) {
            logger.error(
              { paymentId: payment._id, bookingId: booking._id, error: confirmError },
              'Watchdog: Error during booking confirmation recovery. Failing payment and triggering refund.'
            );

            payment.status = PaymentStatus.FAILED;
            payment.failedAt = new Date();
            payment.failureReason = confirmError.message || 'LATE_PAYMENT_RECOVERY_ERROR';
            await payment.save();
            await (PaymentService as any).triggerRefundRequest(booking, payment, payment.failureReason);
            successCount++;
          }
        }
      } catch (error) {
        logger.error({ paymentId: payment._id, error }, 'Watchdog: Failed to process paid payment mismatch');
      }
    }
    return successCount;
  }

  static async expireStaleBookings(): Promise<number> {
    const now = new Date();

    // 1. Stuck-booking sweep (recovery for any crash/timeouts while in EXPIRING state)
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const recoveredStuck = await Booking.updateMany(
      { status: BookingStatus.EXPIRING, updatedAt: { $lte: stuckThreshold } },
      { $set: { status: BookingStatus.AWAITING_PAYMENT } }
    );
    if (recoveredStuck.modifiedCount > 0) {
      logger.warn({ count: recoveredStuck.modifiedCount }, 'Consistency: Recovered stuck EXPIRING bookings back to AWAITING_PAYMENT');
    }

    // 2. Fetch stale candidates
    const staleCandidates = await Booking.find({
      status: BookingStatus.AWAITING_PAYMENT,
      logicalExpiresAt: { $lte: now }
    }).select('_id').limit(100);

    let expiredCount = 0;
    for (const candidate of staleCandidates) {
      // 3. Atomically claim the booking by transitioning status to EXPIRING
      const booking = await Booking.findOneAndUpdate(
        { _id: candidate._id, status: BookingStatus.AWAITING_PAYMENT },
        { $set: { status: BookingStatus.EXPIRING }, $inc: { bookingVersion: 1 } },
        { new: true }
      );

      if (!booking) {
        // Already claimed by another worker/thread, skip
        continue;
      }

      try {
        // 4. Process logical expiration and release inventory
        const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
          reason: 'booking-logical-checkout-timeout',
          correlationId: booking.bookingId,
        });
        await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

        const event = await Event.findById(booking.eventId);
        if (event && event.bookingMode === 'seat_based') {
          const allSeatIds = booking.tickets.flatMap((ticket) => ticket.seats || []).map((seat) => seat.seatId);
          if (allSeatIds.length > 0) {
            await SeatLayout.updateOne(
              { eventId: event._id },
              {
                $set: {
                  'seats.$[seat].status': SeatStatus.AVAILABLE,
                },
                $unset: {
                  'seats.$[seat].lockedBy': '',
                  'seats.$[seat].lockedAt': '',
                  'seats.$[seat].bookedByBookingId': '',
                  'seats.$[seat].reservationId': '',
                },
                $inc: {
                  'seats.$[seat].seatVersion': 1,
                },
              },
              {
                arrayFilters: [
                  {
                    'seat.seatId': { $in: allSeatIds },
                    'seat.status': SeatStatus.LOCKED,
                    'seat.bookedByBookingId': booking._id.toString(),
                  },
                ],
              }
            );
          }
        }

        // 5. Transition from EXPIRING to EXPIRED atomically
        const finalized = await Booking.updateOne(
          { _id: booking._id, status: BookingStatus.EXPIRING },
          { $set: { status: BookingStatus.EXPIRED } }
        );

        if (finalized.modifiedCount > 0) {
          expiredCount++;
          logger.info({ bookingId: booking._id, bookingReference: booking.bookingId }, 'Consistency: Logically expired booking and released held inventory');
        }
      } catch (err) {
        logger.error(
          { err, bookingId: booking._id, bookingReference: booking.bookingId },
          'Consistency: Failed to process logical expiration for candidate'
        );
      }
    }
    return expiredCount;
  }

  static async runRepairCycle(): Promise<ConsistencyReport> {
    const correlationId = `repair-cycle-${crypto.randomUUID().slice(0, 8)}`;
    return runWithContext({ correlationId }, async () => {
      const startTime = Date.now();
      const [
        expiredReservations,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
        repairedPaidPaymentMismatches,
      ] = await Promise.all([
        ReservationService.expireReservations(),
        cleanupPhantomRedisLocks(),
        repairStaleSeatReservations(),
        repairEventInventoryMismatches(),
        ConsistencyService.expireStaleBookings(),
        ConsistencyService.repairUnticketedConfirmedBookings(),
        ConsistencyService.repairStuckNotifications(),
        ConsistencyService.repairOrphanedConfirmedDeliveries(),
        ConsistencyService.repairPaidPaymentMismatches(),
      ]);

      const report = await this.generateReport();
      report.repairs = {
        expiredReservations: expiredReservations.length,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
        repairedPaidPaymentMismatches,
      };

      const durationMs = Date.now() - startTime;

      const hasRepairs = expiredReservations.length > 0 ||
        phantomRedisLocks > 0 ||
        staleSeatReservations > 0 ||
        eventInventoryMismatchesRepaired > 0 ||
        logicallyExpiredBookings > 0 ||
        reEnqueuedUnticketedBookings > 0 ||
        resetStuckNotifications > 0 ||
        reEnqueuedOrphanedDeliveries > 0 ||
        repairedPaidPaymentMismatches > 0;

      const context = getTraceContext();
      const isManual = !!(context?.userId || context?.sessionId);

      if (hasRepairs || isManual) {
        auditLog({
          action: 'CONSISTENCY_REPAIR_CYCLE',
          status: 'success',
          metadata: {
            durationMs,
            repairs: report.repairs,
            drift: report.drift,
            counts: report.counts,
          },
          description: `Consistency repair cycle finished in ${durationMs}ms with ${expiredReservations.length} expired reservations, ${phantomRedisLocks} phantom locks, ${staleSeatReservations} stale seats, ${eventInventoryMismatchesRepaired} inventory mismatches, ${resetStuckNotifications} stuck notifications, ${reEnqueuedOrphanedDeliveries} orphaned deliveries, and ${repairedPaidPaymentMismatches} paid payment mismatches repaired.`,
        });
      }

      if (hasRepairs) {
        logger.warn({ report }, 'Consistency repair cycle completed with repairs');
        emitToAdmin('inventory', 'consistency:repaired', report);
        for (const [eventId, reservations] of ReservationService.groupByEvent(expiredReservations).entries()) {
          emitToEvent(eventId, 'inventory:sync-required', {
            eventId,
            reservationIds: reservations.map((reservation) => reservation.reservationId),
          });
        }
      }

      return report;
    });
  }

  static async generateReport(): Promise<ConsistencyReport> {
    const now = new Date();
    const [
      activeReservations,
      expiredReservations,
      redisLocks,
      awaitingPaymentBookings,
      orphanPayments,
      eventInventoryMismatches,
      unticketedConfirmedBookings,
      stuckNotifications,
      orphanedConfirmedDeliveries,
      paidPaymentMismatches,
    ] = await Promise.all([
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] } }),
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }, expiresAt: { $lte: now } }),
      countRedisLocks(),
      Booking.countDocuments({ status: BookingStatus.AWAITING_PAYMENT }),
      Payment.countDocuments({ status: PaymentStatus.PENDING, bookingId: { $exists: false } }),
      countEventInventoryMismatches(),
      ConsistencyService.countUnticketedConfirmedBookings(),
      ConsistencyService.countStuckNotifications(),
      ConsistencyService.countOrphanedConfirmedDeliveries(),
      ConsistencyService.countPaidPaymentMismatches(),
    ]);

    const staleSeatReservations = await Reservation.countDocuments({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    });

    return {
      generatedAt: now.toISOString(),
      counts: {
        activeReservations,
        expiredReservations,
        redisLocks,
        awaitingPaymentBookings,
        orphanPayments,
      },
      drift: {
        staleSeatReservations,
        phantomRedisLocks: 0,
        eventInventoryMismatches,
        unticketedConfirmedBookings,
        stuckNotifications,
        orphanedConfirmedDeliveries,
        paidPaymentMismatches,
      },
    };
  }
}

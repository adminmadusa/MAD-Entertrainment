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
import { PaymentRefundService } from './public/payment-refund.service';
import { fullRefundHtml, partialRefundHtml, eventCancellationHtml, paymentFailureHtml } from '../lib/email';
import { getEnv } from '../config/env';
import { createNotificationSafe } from './notification.service';
import { expireBooking } from './admin/booking.service';

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
  const events = await Event.find({}).select('_id soldCount reservedCount totalCapacity isSoldOut').lean();
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
    const shouldBeSoldOut = event.totalCapacity > 0 && soldTotal >= event.totalCapacity;
    if (
      event.soldCount !== soldTotal ||
      event.reservedCount !== reservedTotal ||
      event.isSoldOut !== shouldBeSoldOut
    ) {
      mismatches++;
    }
  }

  return mismatches;
}

async function repairEventInventoryMismatches(): Promise<number> {
  const events = await Event.find({}).select('_id soldCount reservedCount totalCapacity isSoldOut ticketTiers eventVersion');
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
    const shouldBeSoldOut = event.totalCapacity > 0 && soldTotal >= event.totalCapacity;

    if (
      event.soldCount !== soldTotal ||
      event.reservedCount !== reservedTotal ||
      event.isSoldOut !== shouldBeSoldOut
    ) {
      // Also update individual tier soldCounts based on confirmed bookings
      const tierSoldCounts = new Map<string, number>();
      const confirmedBookingsDocs = await Booking.find({ eventId: event._id, status: BookingStatus.CONFIRMED }).lean();
      for (const bookingDoc of confirmedBookingsDocs) {
        if (!Array.isArray(bookingDoc.tickets)) {
          logger.warn(
            {
              bookingId: bookingDoc._id,
              bookingRef: bookingDoc.bookingId,
              ticketsType: typeof bookingDoc.tickets,
              ticketsValue: bookingDoc.tickets === null ? 'null' : 'non-array',
            },
            'Consistency: Booking has invalid tickets structure — skipping tier count. Document may be corrupted.'
          );
          continue;
        }
        for (const t of bookingDoc.tickets) {
          const tierConfig = event.ticketTiers.find((tc) => tc.tier === t.tier);
          const groupSize = tierConfig?.groupSize || 1;
          tierSoldCounts.set(t.tier, (tierSoldCounts.get(t.tier) ?? 0) + t.quantity * groupSize);
        }
      }

      const updatedTiers = event.ticketTiers.map(t => {
        const actualSold = tierSoldCounts.get(t.tier) ?? 0;
        t.soldCount = actualSold;
        return t;
      });

      const updateResult = await Event.updateOne(
        { _id: event._id, eventVersion: event.eventVersion },
        { 
          $set: { 
            soldCount: soldTotal, 
            reservedCount: reservedTotal, 
            isSoldOut: shouldBeSoldOut,
            ticketTiers: updatedTiers,
          },
          $inc: {
            eventVersion: 1
          }
        }
      );
      if (updateResult.modifiedCount > 0) {
        repairedCount++;
      } else {
        logger.warn(
          { eventId: event._id, currentVersion: event.eventVersion },
          'Consistency: Optimistic locking version conflict detected while repairing inventory mismatches. Skipping repair.'
        );
      }
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
            const newJobId = `refund-${refund._id}-retry`;
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
            const newJobId = `cancellation-${booking.bookingId}-retry`;
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
            await PaymentRefundService.triggerRefundRequest(booking, payment, 'BOOKING_UNRECOVERABLE');
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
              await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
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
            await PaymentRefundService.triggerRefundRequest(booking, payment, payment.failureReason);
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
      try {
        const expired = await expireBooking(candidate._id.toString(), 'booking-logical-checkout-timeout');
        if (expired) {
          expiredCount++;
        }
      } catch (err) {
        logger.error(
          { err, bookingId: candidate._id },
          'Consistency: Failed to process logical expiration for candidate'
        );
      }
    }
    return expiredCount;
  }
  private static async countStuckProcessingRefunds(): Promise<number> {
    return await Refund.countDocuments({
      status: 'processing',
      updatedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) }
    });
  }

  private static async countOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).select('_id bookingId').lean();

    let count = 0;
    for (const refund of completedRefunds) {
      const hasNotification = await Notification.exists({
        bookingId: refund.bookingId,
        jobId: { $regex: `^refund-${refund._id}` }
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  private static async countOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).select('_id').lean();

    let count = 0;
    for (const booking of cancelledBookings) {
      const hasNotification = await Notification.exists({
        bookingId: booking._id,
        type: NotificationType.EVENT_CANCELLED
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  private static async repairStuckProcessingRefunds(): Promise<number> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    const stuckRefunds = await Refund.find({
      status: 'processing',
      updatedAt: { $lte: threshold }
    }).limit(100);

    let resetCount = 0;
    for (const refund of stuckRefunds) {
      try {
        const updateResult = await Refund.updateOne(
          { _id: refund._id, status: 'processing' },
          { $set: { status: 'requested' } }
        );
        if (updateResult.modifiedCount > 0) {
          resetCount++;
          auditLog({
            action: 'REFUND_PROCESSING_TIMEOUT_RESET',
            actor: { type: 'admin', id: 'system' },
            status: 'success',
            metadata: {
              refundId: refund._id.toString(),
              paymentId: refund.paymentId.toString(),
              bookingId: refund.bookingId.toString(),
              amount: refund.amount,
            },
            description: `Reset stuck processing refund ${refund._id} back to requested due to 15-minute lease expiry.`,
          });
          logger.warn({ refundId: refund._id }, 'Watchdog: Reverted stuck processing refund back to requested status.');
        }
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to reset stuck processing refund.');
      }
    }
    return resetCount;
  }

  private static async repairOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const refund of completedRefunds) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: refund.bookingId,
          jobId: { $regex: `^refund-${refund._id}` }
        });
        if (hasNotification) {
          continue;
        }

        const booking = await Booking.findById(refund.bookingId).populate('eventId');
        if (!booking || !booking.guestEmail) {
          continue;
        }

        const event = booking.eventId as any;
        const totalAmount = booking.totalAmount;

        const allCompleted = await Refund.find({
          paymentId: refund.paymentId,
          status: 'completed'
        });
        const totalRefunded = allCompleted.reduce((sum, r) => sum + r.amount, 0);
        const payment = await Payment.findById(refund.paymentId);
        const isFullRefund = payment ? totalRefunded === payment.amount : false;

        let emailHtml = '';
        let subject = '';
        let notificationType: NotificationType;

        if (isFullRefund) {
          const formattedRefundDate = new Date(refund.processedAt || new Date()).toLocaleDateString('en-IN', {
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
          notificationType = NotificationType.FULL_REFUND;
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
          notificationType = NotificationType.PARTIAL_REFUND;
        }

        const jobId = `refund-${refund._id}-retry`;
        
        await createNotificationSafe([{
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: notificationType,
          channel: 'email',
          recipient: booking.guestEmail,
          subject,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: event?._id
        }]);

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject,
            html: emailHtml,
            notificationType,
            bookingId: booking._id.toString(),
            eventId: event?._id?.toString() || booking.eventId.toString() || '',
          },
          jobId
        );

        recoveredCount++;
        logger.info({ refundId: refund._id }, 'Watchdog successfully recovered and enqueued orphaned refund notification.');
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to repair orphaned refund notification.');
      }
    }
    return recoveredCount;
  }

  private static async repairOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const booking of cancelledBookings) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: booking._id,
          type: NotificationType.EVENT_CANCELLED
        });
        if (hasNotification) {
          continue;
        }

        const event = await Event.findById(booking.eventId);
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

        const jobId = `cancellation-${booking.bookingId}-retry`;

        await createNotificationSafe([{
          jobId,
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
          jobId
        );

        recoveredCount++;
        logger.info({ bookingId: booking._id }, 'Watchdog successfully recovered and enqueued orphaned cancellation notification.');
      } catch (error) {
        logger.error({ bookingId: booking._id, error }, 'Watchdog: Failed to repair orphaned cancellation notification.');
      }
    }
    return recoveredCount;
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
        repairedStuckProcessingRefunds,
        repairedOrphanedRefundNotifications,
        repairedOrphanedCancellationNotifications,
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
        ConsistencyService.repairStuckProcessingRefunds(),
        ConsistencyService.repairOrphanedRefundNotifications(),
        ConsistencyService.repairOrphanedCancellationNotifications(),
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
        repairedStuckProcessingRefunds,
        repairedOrphanedRefundNotifications,
        repairedOrphanedCancellationNotifications,
      } as any;

      const durationMs = Date.now() - startTime;

      const hasRepairs = expiredReservations.length > 0 ||
        phantomRedisLocks > 0 ||
        staleSeatReservations > 0 ||
        eventInventoryMismatchesRepaired > 0 ||
        logicallyExpiredBookings > 0 ||
        reEnqueuedUnticketedBookings > 0 ||
        resetStuckNotifications > 0 ||
        reEnqueuedOrphanedDeliveries > 0 ||
        repairedPaidPaymentMismatches > 0 ||
        repairedStuckProcessingRefunds > 0 ||
        repairedOrphanedRefundNotifications > 0 ||
        repairedOrphanedCancellationNotifications > 0;

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
          description: `Consistency repair cycle finished in ${durationMs}ms with ${expiredReservations.length} expired reservations, ${phantomRedisLocks} phantom locks, ${staleSeatReservations} stale seats, ${eventInventoryMismatchesRepaired} inventory mismatches, ${resetStuckNotifications} stuck notifications, ${reEnqueuedOrphanedDeliveries} orphaned deliveries, ${repairedPaidPaymentMismatches} paid payment mismatches, ${repairedStuckProcessingRefunds} stuck refunds, ${repairedOrphanedRefundNotifications} orphaned refund emails, and ${repairedOrphanedCancellationNotifications} orphaned cancellation emails repaired.`,
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
      stuckProcessingRefunds,
      orphanedRefundNotifications,
      orphanedCancellationNotifications,
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
      ConsistencyService.countStuckProcessingRefunds(),
      ConsistencyService.countOrphanedRefundNotifications(),
      ConsistencyService.countOrphanedCancellationNotifications(),
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
        stuckProcessingRefunds,
        orphanedRefundNotifications,
        orphanedCancellationNotifications,
      } as any,
    };
  }
}

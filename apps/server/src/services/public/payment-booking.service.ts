import { ClientSession } from 'mongoose';

import { BookingStatus, PaymentStatus, ReservationStatus, NotificationType } from '@mad/shared';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { logger } from '../../utils/logger';
import { createNotificationSafe } from '../notification.service';
import { ReservationService } from '../reservation.service';
import { PaymentInventoryService } from './payment-inventory.service';
import { PaymentRefundService } from './payment-refund.service';
import { canBook } from '@mad/shared';

export interface ConfirmationTransactionResult {
  success: boolean;
  booking: IBooking | null;
  updatedEvent?: any;
  generatedTickets?: any[];
  syncNotification?: any;
}

export interface ConfirmationOptions {
  triggerRefundRequest?: (
    booking: IBooking,
    payment: IPayment,
    reason: string,
    session?: ClientSession,
    origin?: 'manual' | 'auto_recovery',
    recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ) => Promise<void>;
}

export class PaymentBookingService {
  /**
   * Core transactional booking confirmation logic.
   * Runs strictly inside the provided MongoDB ClientSession.
   */
  public static async confirmBooking(
    booking: IBooking,
    _payment: IPayment,
    session: ClientSession,
    event: any,
    allSeatIds: string[],
    isLateRecovery: boolean,
    options?: ConfirmationOptions
  ): Promise<ConfirmationTransactionResult> {
    // 0. Atomic payment status transition inside transaction
    if (_payment.status === PaymentStatus.PENDING) {
      const claimedPayment = await Payment.findOneAndUpdate(
        { _id: _payment._id, status: PaymentStatus.PENDING },
        {
          $set: {
            status: PaymentStatus.PAID,
            gatewayPaymentId: _payment.gatewayPaymentId,
            gatewaySignature: _payment.gatewaySignature,
            paidAt: _payment.paidAt || new Date(),
          }
        },
        { new: true, session }
      );

      if (!claimedPayment) {
        throw new Error('PAYMENT_ALREADY_CLAIMED_OR_NOT_PENDING');
      }

      // Sync back memory object status
      _payment.status = PaymentStatus.PAID;
      _payment.gatewayPaymentId = claimedPayment.gatewayPaymentId;
      _payment.gatewaySignature = claimedPayment.gatewaySignature;
      _payment.paidAt = claimedPayment.paidAt;
    }

    // Check event ticket sales closure constraints
    const now = new Date();
    if (!canBook(event as any)) {
      throw new Error('EVENT_EXPIRED_DURING_CONFIRMATION');
    }

    // 1. Pre-validation for Late Recovery
    if (isLateRecovery) {
      try {
        await PaymentInventoryService.validateLateRecoveryCapacity(booking, event, allSeatIds, session);
      } catch (err: any) {
        _payment.status = PaymentStatus.FAILED;
        _payment.failedAt = new Date();
        _payment.failureReason = err.message === 'SEAT_ALLOCATION_FAILED'
          ? 'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN'
          : 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED';
        await _payment.save({ session });

        const refundTrigger = options?.triggerRefundRequest || PaymentRefundService.triggerRefundRequest;
        await refundTrigger(
          booking,
          _payment,
          _payment.failureReason,
          session,
          'auto_recovery',
          'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
        );
        return { success: false, booking: null };
      }
    }

    // 2. Allocate Seats (SeatLayout update)
    await PaymentInventoryService.allocateSeats(booking, event, allSeatIds, session);

    // 3. Allocate Event Capacity
    const updatedEvent = await PaymentInventoryService.allocateEventCapacity(booking, event, isLateRecovery, session);

    // Check if user already exists matching the guestEmail
    const user = await UserModel.findOne({
      email: booking.guestEmail?.trim().toLowerCase()
    }).session(session || null);

    const setFields: any = {
      status: BookingStatus.CONFIRMED,
      paymentId: _payment._id,
      confirmedAt: new Date(),
    };
    const unsetFields: any = {
      expiresAt: 1,
      logicalExpiresAt: 1,
    };

    if (user) {
      setFields.userId = user._id;
    }

    // 4. Booking Confirmation Status Transition
    const previousBookingDoc = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] } },
      {
        $set: setFields,
        $unset: unsetFields,
        $inc: { bookingVersion: 1 }
      },
      { new: false, session }
    );
    if (!previousBookingDoc) {
      throw new Error('CONCURRENT_CONFIRMATION_OR_NOT_FOUND');
    }

    await PaymentBookingService.redeemCouponForConfirmedBooking(previousBookingDoc, _payment, session);

    // 5. Update Reservation status to CONFIRMED
    await ReservationService.transitionForBooking(previousBookingDoc._id, ReservationStatus.CONFIRMED, {
      paymentReference: _payment.gatewayPaymentId ?? _payment.gatewayOrderId,
      paymentId: _payment._id as any,
      reason: 'payment-confirmed',
      correlationId: previousBookingDoc.bookingId,
      includeTerminal: isLateRecovery,
    }, session);

    const confirmedBooking = previousBookingDoc;
    confirmedBooking.status = BookingStatus.CONFIRMED;
    confirmedBooking.paymentId = _payment._id as any;
    confirmedBooking.bookingVersion += 1;
    booking = confirmedBooking;

    if (updatedEvent && updatedEvent.soldCount >= updatedEvent.totalCapacity && !updatedEvent.isSoldOut) {
      await Event.updateOne({ _id: booking.eventId }, { $set: { isSoldOut: true } }, { session });
    }

    // 6. Generate Tickets & Notification (sync path only)
    let generatedTickets = [];
    let syncNotification = null;
    if (!getEnv().ENABLE_ASYNC_CHECKOUT) {
      // Mid-Flight Booking Protection: Verify and repair totalTickets if needed
      let expectedTotalTickets = 0;
      for (const t of booking.tickets) {
        const tierConfig = event?.ticketTiers?.find((tc: any) => tc.tier === t.tier);
        expectedTotalTickets += t.quantity * (tierConfig?.groupSize || 1);
      }
      if (booking.totalTickets !== expectedTotalTickets) {
        booking.totalTickets = expectedTotalTickets;
        if (typeof Booking.updateOne === 'function') {
          await Booking.updateOne({ _id: booking._id }, { $set: { totalTickets: expectedTotalTickets } }, { session });
        }
      }

      let ticketIndex = 1;
      for (const bookedTicket of booking.tickets) {
        if (event && event.bookingMode === 'seat_based' && bookedTicket.seats) {
          for (const seat of bookedTicket.seats) {
            const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
            const qrCodeText = ticketId;

            const ticket = await Ticket.findOneAndUpdate(
              { ticketId },
              {
                $setOnInsert: {
                  bookingId: booking._id,
                  eventId: booking.eventId,
                  tierName: bookedTicket.tierName,
                  tier: bookedTicket.tier,
                  admits: 1,
                  seatId: seat.seatId,
                  row: seat.row,
                  seatNumber: seat.number,
                  section: seat.section,
                  qrCode: qrCodeText,
                  qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
                  assignmentStatus: 'unassigned',
                },
              },
              { upsert: true, new: true, setDefaultsOnInsert: true, session }
            );
            generatedTickets.push(ticket);
            ticketIndex++;
          }
        } else {
          const tierConfig = event?.ticketTiers?.find((t: any) => t.tier === bookedTicket.tier);
          const groupSize = tierConfig?.groupSize || 1;
          const totalAdmissions = bookedTicket.quantity * groupSize;

          for (let i = 0; i < totalAdmissions; i++) {
            const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
            const qrCodeText = ticketId;

            const ticket = await Ticket.findOneAndUpdate(
              { ticketId },
              {
                $setOnInsert: {
                  bookingId: booking._id,
                  eventId: booking.eventId,
                  tierName: bookedTicket.tierName,
                  tier: bookedTicket.tier,
                  admits: 1,
                  qrCode: qrCodeText,
                  qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
                  assignmentStatus: 'unassigned',
                },
              },
              { upsert: true, new: true, setDefaultsOnInsert: true, session }
            );
            generatedTickets.push(ticket);
            ticketIndex++;
          }
        }
      }

      const jobId = `email:dispatch:${booking._id}`;
      syncNotification = await createNotificationSafe({
        jobId,
        status: 'processing',
        queuedAt: new Date(),
        processedAt: new Date(),
        type: NotificationType.BOOKING_CONFIRMED,
        bookingId: booking._id,
        eventId: booking.eventId,
        channel: 'email',
        recipient: booking.guestEmail,
        subject: `Your Ticket for ${event?.title || 'MAD Event'} [${booking.bookingId}]`,
        isSent: false,
        retryCount: 0,
      }, { session });
    }

    return {
      success: true,
      booking,
      updatedEvent,
      generatedTickets,
      syncNotification,
    };
  }

  /**
   * Redeems coupon inside the transactional session.
   */
  private static async redeemCouponForConfirmedBooking(
    booking: IBooking,
    payment: IPayment,
    session?: ClientSession
  ): Promise<void> {
    if (!booking.couponId) {
      return;
    }

    const result = await Coupon.updateOne(
      {
        _id: booking.couponId,
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      },
      { $inc: { usedCount: 1 } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      logger.warn(
        {
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          paymentId: payment._id,
          couponId: booking.couponId,
        },
        'Coupon redemption rejected because usage limit has been reached'
      );

      const err = AppError.conflict('Coupon usage limit reached');
      err.code = 'COUPON_USAGE_LIMIT_REACHED';
      throw err;
    }
  }
}

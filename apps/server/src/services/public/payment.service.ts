import crypto from 'crypto';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { getEnv } from '../../config/env';
import { getRazorpay, isRazorpayEnabled } from '../../config/razorpay';
import { getStripe, isStripeEnabled } from '../../config/stripe';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';
import { sendEmail } from '../../utils/email';
import { generateTicketPDF } from '../../utils/pdf';
import { ReservationService } from '../reservation.service';
import { QueueService } from '../queue.service';

export class PaymentService {
  static async createPaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay') {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
    }

    const env = getEnv();

    if (gateway === 'razorpay') {
      return this.handleRazorpayIntent(booking, env);
    }

    return this.handleStripeIntent(booking, env);
  }

  private static async handleRazorpayIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
    if (!isRazorpayEnabled()) {
      throw AppError.badRequest('Razorpay is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (amountPaise < 100) {
      throw AppError.badRequest('Amount must be at least 1 INR (100 paise) for Razorpay transactions');
    }

    try {
      const rzp = getRazorpay();
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: booking.bookingId,
      });

      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'razorpay',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: 'INR',
        gatewayOrderId: order.id,
      });

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: order.id,
        paymentId: payment._id as any,
        reason: 'razorpay-intent-created',
        correlationId: booking.bookingId,
      });

      return {
        gateway: 'razorpay',
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: booking._id,
      };
    } catch (err: any) {
      logger.error({ err }, 'Razorpay API call failed');
      const statusCode = err.statusCode || 400;
      const description = err.error?.description || err.message || 'Razorpay order creation failed';
      throw new AppError(`Razorpay payment intent failed: ${description}`, statusCode);
    }
  }

  private static async handleStripeIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
    if (!isStripeEnabled()) {
      throw AppError.badRequest('Stripe is not enabled / credentials missing');
    }

    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.totalAmount * 100),
        currency: booking.currency?.toLowerCase() || 'inr',
        metadata: {
          bookingId: booking._id.toString(),
          bookingRef: booking.bookingId,
        },
      });

      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        gatewayOrderId: paymentIntent.id,
      });

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: paymentIntent.id,
        paymentId: payment._id as any,
        reason: 'stripe-intent-created',
        correlationId: booking.bookingId,
      });

      return {
        gateway: 'stripe',
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        clientSecret: paymentIntent.client_secret,
        amount: booking.totalAmount,
        currency: booking.currency,
        bookingId: booking._id,
      };
    } catch (err: any) {
      logger.error({ err }, 'Stripe API call failed');
      const statusCode = err.statusCode || 400;
      const description = err.message || 'Stripe payment intent creation failed';
      throw new AppError(`Stripe payment intent failed: ${description}`, statusCode);
    }
  }

  static async verifyPayment(bookingId: string, gatewayPayload: any) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    if (!payment) {
      throw AppError.notFound('Payment record not found for booking');
    }

    if (payment.status === PaymentStatus.PAID) {
      return booking; // Already verified & confirmed
    }

    const env = getEnv();

    if (payment.gateway === 'razorpay') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw AppError.badRequest('Missing Razorpay credentials in payment payload');
      }

      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
        .update(text)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        await this.failPaymentAndReleaseInventory(booking, payment, 'Signature verification failed');

        throw AppError.badRequest('Razorpay signature verification failed');
      }

      payment.status = PaymentStatus.PAID;
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.gatewaySignature = razorpay_signature;
      payment.paidAt = new Date();
      await payment.save();

      await this.confirmBooking(booking, payment);
    } else {
      const { paymentIntentId } = gatewayPayload;
      if (!paymentIntentId) {
        throw AppError.badRequest('Missing Stripe paymentIntentId in payment payload');
      }

      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status !== 'succeeded') {
        await this.failPaymentAndReleaseInventory(booking, payment, `Stripe status: ${intent.status}`);

        throw AppError.badRequest(`Stripe payment verification failed. Status is ${intent.status}`);
      }

      payment.status = PaymentStatus.PAID;
      payment.gatewayPaymentId = intent.id;
      payment.paidAt = new Date();
      await payment.save();

      await this.confirmBooking(booking, payment);
    }

    return booking;
  }

  private static safeEmit(label: string, emit: () => void, data: Record<string, unknown>) {
    try {
      emit();
    } catch (err) {
      logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
    }
  }

  private static async failPaymentAndReleaseInventory(booking: IBooking, payment: IPayment, reason: string) {
    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

    booking.status = BookingStatus.FAILED;
    booking.bookingVersion += 1;
    await booking.save();
    const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
      paymentReference: payment.gatewayPaymentId ?? payment.gatewayOrderId,
      paymentId: payment._id as any,
      reason,
      correlationId: booking.bookingId,
    });
    await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

    const event = await Event.findById(booking.eventId);
    const releasedSeatIds: string[] = [];

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
        releasedSeatIds.push(...allSeatIds);
      }
    }

    if (event && releasedSeatIds.length > 0) {
      this.safeEmit(
        'seat:unlocked',
        () => emitToEvent(event._id.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }),
        { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: releasedSeatIds }
      );
    }

    this.safeEmit(
      'booking:updated',
      () => emitToBooking(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin booking:updated',
      () => emitToAdmin('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );

    logger.info({ bookingId: booking._id, paymentId: payment._id, releasedSeatIds, reason }, 'Payment failed and reserved inventory released');
  }

  private static async confirmBooking(booking: IBooking, _payment: IPayment) {
    // 1. Confirm booking status exactly once. Concurrent payment callbacks must
    // not double-increment event inventory or create duplicate tickets.
    const confirmedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: BookingStatus.AWAITING_PAYMENT },
      { $set: { status: BookingStatus.CONFIRMED }, $unset: { expiresAt: 1 }, $inc: { bookingVersion: 1 } },
      { new: true }
    );

    if (!confirmedBooking) {
      logger.info({ bookingId: booking._id }, 'Booking confirmation skipped because booking is no longer awaiting payment');
      return;
    }

    booking = confirmedBooking;
    const confirmedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.CONFIRMED, {
      paymentReference: _payment.gatewayPaymentId ?? _payment.gatewayOrderId,
      paymentId: _payment._id as any,
      reason: 'payment-confirmed',
      correlationId: booking.bookingId,
    });
    await ReservationService.confirmCapacity(confirmedReservations);

    // 2. Update Event statistics
    const event = await Event.findById(booking.eventId);
    if (event) {
      event.soldCount += booking.totalTickets;
      if (event.soldCount >= event.totalCapacity) {
        event.isSoldOut = true;
      }

      // Update sold count per ticket tier
      for (const bookedTicket of booking.tickets) {
        const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
        if (tierIndex !== -1) {
          event.ticketTiers[tierIndex].soldCount += bookedTicket.quantity;
        }
      }
      event.eventVersion += 1;
      await event.save();
    }

    // 3. Update Seat Layout statuses from LOCKED to BOOKED
    if (event && event.bookingMode === 'seat_based') {
      const allSeatIds = booking.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
      await SeatLayout.updateOne(
        { eventId: event._id },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.BOOKED,
          },
          $unset: {
            'seats.$[seat].lockedBy': '',
            'seats.$[seat].lockedAt': '',
          },
          $inc: {
            'seats.$[seat].seatVersion': 1,
          },
        },
        {
          arrayFilters: [{ 'seat.seatId': { $in: allSeatIds } }],
        }
      );

      this.safeEmit(
        'seat:booked',
        () => emitToEvent(event._id.toString(), 'seat:booked', {
          eventId: event._id.toString(),
          bookingId: booking._id.toString(),
          seatIds: allSeatIds,
        }),
        { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: allSeatIds }
      );
    }

    this.safeEmit(
      'booking:updated',
      () => emitToBooking(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin booking:updated',
      () => emitToAdmin('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin analytics:changed',
      () => emitToAdmin('analytics', 'analytics:changed', { bookingId: booking._id.toString(), eventId: booking.eventId.toString() }),
      { bookingId: booking._id.toString(), eventId: booking.eventId.toString() }
    );

    // 4. Update Coupon used count if applied
    if (booking.couponId) {
      await Coupon.findByIdAndUpdate(booking.couponId, { $inc: { usedCount: 1 } });
    }

    // Feature Flag Rollout: if asynchronous checkout is enabled, offload ticket & PDF generation
    if (getEnv().ENABLE_ASYNC_CHECKOUT) {
      await QueueService.enqueue(
        'booking-queue',
        'booking:confirm',
        { bookingId: booking._id.toString() },
        `booking:confirm:${booking._id}`
      );
      logger.info({ bookingId: booking._id }, 'Asynchronous checkout enabled. Handed off confirmation tasks to background queue.');
      return;
    }

    // 5. Generate scan-ready QR Tickets
    let ticketIndex = 1;
    for (const bookedTicket of booking.tickets) {
      if (event && event.bookingMode === 'seat_based' && bookedTicket.seats) {
        for (const seat of bookedTicket.seats) {
          const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
          const qrCodeText = JSON.stringify({
            ticketId,
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
            tier: bookedTicket.tier,
            seatId: seat.seatId,
            admits: 1,
          });

          await Ticket.create({
            ticketId,
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
            qrCodeImage: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeText)}`,
          });
          ticketIndex++;
        }
      } else {
        // General admission - generate QRs matching count
        const tierConfig = event?.ticketTiers?.find(t => t.tier === bookedTicket.tier);
        const admits = tierConfig?.groupSize || 1;

        for (let i = 0; i < bookedTicket.quantity; i++) {
          const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
          const qrCodeText = JSON.stringify({
            ticketId,
            bookingId: booking._id.toString(),
            eventId: booking.eventId.toString(),
            tier: bookedTicket.tier,
            admits,
          });

          await Ticket.create({
            ticketId,
            bookingId: booking._id,
            eventId: booking.eventId,
            tierName: bookedTicket.tierName,
            tier: bookedTicket.tier,
            admits,
            qrCode: qrCodeText,
            qrCodeImage: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeText)}`,
          });
          ticketIndex++;
        }
      }
    }

    // 6. Generate PDF and Send Email asynchronously
    try {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Hi ${booking.guestName},</h2>
          <p>Your booking <strong>${booking.bookingId}</strong> for the event <strong>"${event?.title || 'MAD Event'}"</strong> has been successfully confirmed!</p>
          <p>Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.</p>
          <p>Enjoy the show!</p>
          <br/>
          <p>MAD Entertainment Team</p>
        </div>
      `;

      // Generate the PDF buffer
      const pdfBuffer = await generateTicketPDF(booking, event);

      // Send the email with the PDF attachment
      if (booking.guestEmail) {
        await sendEmail({
          to: booking.guestEmail,
          subject: `Your Ticket for ${event?.title || 'MAD Event'} [${booking.bookingId}]`,
          html: emailBody,
          attachments: [
            {
              filename: `MAD_Ticket_${booking.bookingId}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
      }

      await Notification.create({
        type: NotificationType.BOOKING_CONFIRMED,
        bookingId: booking._id,
        eventId: booking.eventId,
        channel: 'email',
        recipient: booking.guestEmail,
        subject: `Booking Confirmed: ${booking.bookingId}`,
        body: 'Email dispatched with PDF ticket attached.',
        isSent: true,
        retryCount: 0,
      });

      logger.info({ bookingId: booking._id }, 'Notification log created for confirmed booking and email dispatched');
    } catch (err) {
      logger.error({ err }, 'Failed to record notification confirmation log or send email');
    }
  }
}

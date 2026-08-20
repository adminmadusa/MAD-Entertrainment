import mongoose from 'mongoose';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { Booking } from '../../../models/booking.schema';
import { Payment } from '../../../models/payment.schema';
import { Refund } from '../../../models/refund.schema';
import { Ticket } from '../../../models/ticket.schema';
import type { BookingsSummaryResponse } from '../../../types/admin/booking.types';
import { CacheService } from '../../cache.service';

/**
 * Fetch booking summary stats, optionally filtered by event ID.
 */
export const getBookingsSummary = async (
  eventId?: string
): Promise<BookingsSummaryResponse & { grossRevenue: number; refundAmount: number; netRevenue: number }> => {
  const cacheKey = eventId ? `bookings:summary:event:${eventId}` : 'bookings:summary:global';
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached as any;
  }

  const matchStage: any = {};
  if (eventId) {
    matchStage.eventId = new mongoose.Types.ObjectId(eventId);
  }

  const bookingAgg = await Booking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalTickets: { $sum: '$totalTickets' },
        confirmed: {
          $sum: {
            $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  [BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRING],
                ],
              },
              1,
              0,
            ],
          },
        },
        cancelled: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.FAILED, BookingStatus.EXPIRED],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const bookingStats = bookingAgg[0] || {
    totalBookings: 0,
    totalTickets: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  };

  // Gross Revenue aggregate using Payment record as source of truth
  const paymentAggPipeline: any[] = [
    {
      $match: {
        status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
      },
    },
    {
      $lookup: {
        from: 'bookings',
        localField: 'bookingId',
        foreignField: '_id',
        as: 'booking',
      },
    },
    { $unwind: '$booking' },
  ];

  if (eventId) {
    paymentAggPipeline.push({
      $match: {
        'booking.eventId': new mongoose.Types.ObjectId(eventId),
      },
    });
  }

  paymentAggPipeline.push({
    $group: {
      _id: null,
      totalGross: { $sum: '$amount' },
    },
  });

  const paymentAgg = await Payment.aggregate(paymentAggPipeline);
  const grossRevenue = paymentAgg[0]?.totalGross || 0;

  // Refund Amount aggregate using Refund record as source of truth
  const refundAggPipeline: any[] = [];
  if (eventId) {
    refundAggPipeline.push(
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking',
        },
      },
      { $unwind: '$booking' },
      {
        $match: {
          'booking.eventId': new mongoose.Types.ObjectId(eventId),
          status: 'completed',
        },
      }
    );
  } else {
    refundAggPipeline.push({
      $match: { status: 'completed' },
    });
  }
  refundAggPipeline.push({
    $group: {
      _id: null,
      totalRefunded: { $sum: '$amount' },
    },
  });

  const refundAgg = await Refund.aggregate(refundAggPipeline);
  const refundAmount = refundAgg[0]?.totalRefunded || 0;

  const netRevenue = grossRevenue - refundAmount;

  const ticketMatchStage: any = { scannedAt: { $ne: null } };
  if (eventId) {
    ticketMatchStage.eventId = new mongoose.Types.ObjectId(eventId);
  }

  const ticketAgg = await Ticket.aggregate([
    { $match: ticketMatchStage },
    {
      $group: {
        _id: null,
        checkedIn: { $sum: '$admits' },
      },
    },
  ]);

  const checkedIn = ticketAgg[0]?.checkedIn || 0;

  const result = {
    totalBookings: bookingStats.totalBookings,
    totalTickets: bookingStats.totalTickets,
    grossRevenue,
    refundAmount,
    netRevenue,
    revenue: netRevenue, // Compatibility mapping
    confirmed: bookingStats.confirmed,
    pending: bookingStats.pending,
    cancelled: bookingStats.cancelled,
    checkedIn,
  };

  await CacheService.set(cacheKey, result, 60);

  return result;
};

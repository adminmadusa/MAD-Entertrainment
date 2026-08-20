import { BookingStatus, PaymentStatus } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { CacheService } from '../cache.service';

export class AnalyticsService {
  /**
   * Generates administrative summary metrics across bookings, revenue, and top events.
   */
  static async getSummary(): Promise<any> {
    const CACHE_KEY = 'analytics:summary';
    const cachedData = await CacheService.get(CACHE_KEY);
    if (cachedData) {
      return cachedData;
    }

    const totalBookings = await Booking.countDocuments({ status: BookingStatus.CONFIRMED });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const paymentResult = await Payment.aggregate([
      { $match: { status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const grossRevenue = paymentResult[0]?.total || 0;

    const refundResult = await Refund.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const refundAmount = refundResult[0]?.total || 0;

    const netRevenue = grossRevenue - refundAmount;
    const totalRevenue = netRevenue;

    const topEventsGroup = await Payment.aggregate([
      {
        $match: {
          status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] }
        }
      },
      {
        $lookup: {
          from: 'bookings',
          let: { bookingId: '$bookingId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$bookingId'] } } },
            { $project: { _id: 1, eventId: 1, status: 1 } }
          ],
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $group: {
          _id: '$booking.eventId',
          count: { $sum: { $cond: [{ $eq: ['$booking.status', BookingStatus.CONFIRMED] }, 1, 0] } },
          grossRevenue: { $sum: '$amount' },
          bookingIds: { $push: '$bookingId' }
        }
      },
      {
        $lookup: {
          from: 'refunds',
          let: { bIds: '$bookingIds' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$bookingId', '$$bIds'] },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                totalRefund: { $sum: '$amount' }
              }
            }
          ],
          as: 'refundInfo'
        }
      },
      {
        $addFields: {
          refundAmount: { $ifNull: [{ $arrayElemAt: ['$refundInfo.totalRefund', 0] }, 0] }
        }
      },
      {
        $addFields: {
          netRevenue: { $subtract: ['$grossRevenue', '$refundAmount'] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          let: { eventId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$eventId'] } } },
            { $project: { title: 1, startDate: 1 } }
          ],
          as: 'eventDetails'
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          grossRevenue: 1,
          refundAmount: 1,
          netRevenue: 1,
          revenue: '$netRevenue',
          event: {
            $let: {
              vars: { ev: { $arrayElemAt: ['$eventDetails', 0] } },
              in: {
                $cond: [
                  { $not: ['$$ev'] },
                  null,
                  {
                    title: '$$ev.title',
                    startDate: '$$ev.startDate'
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    const topEvents = topEventsGroup.map((item) => ({
      _id: item._id,
      count: item.count,
      grossRevenue: item.grossRevenue,
      refundAmount: item.refundAmount,
      netRevenue: item.netRevenue,
      revenue: item.revenue,
      event: item.event
        ? {
            title: item.event.title,
            startDate: item.event.startDate instanceof Date
              ? item.event.startDate.toISOString()
              : new Date(item.event.startDate).toISOString()
          }
        : null
    }));

    const pendingRefundsCount = await Refund.countDocuments({ status: 'requested' });

    const responseData = {
      totalBookings,
      recentBookings,
      grossRevenue,
      refundAmount,
      netRevenue,
      totalRevenue,
      topEvents,
      pendingRefundsCount
    };

    await CacheService.set(CACHE_KEY, responseData, 60);
    return responseData;
  }

  /**
   * Aggregates historical revenue and refund trends grouped by day.
   */
  static async getRevenue(days: number = 30): Promise<any[]> {
    const CACHE_KEY = `analytics:revenue:${days}`;
    const cachedData = await CacheService.get<any[]>(CACHE_KEY);
    if (cachedData) {
      return cachedData;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const paymentsData = await Payment.aggregate([
      {
        $match: {
          status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$paidAt', '$createdAt'] }
            }
          },
          dailyGrossRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const refundsData = await Refund.aggregate([
      {
        $match: {
          status: 'completed',
          processedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$processedAt', '$createdAt'] }
            }
          },
          refundAmount: { $sum: '$amount' }
        }
      }
    ]);

    const trendMap: Record<string, {
      _id: string;
      dailyGrossRevenue: number;
      dailyRefundAmount: number;
      dailyNetRevenue: number;
      revenue: number;
      count: number;
    }> = {};

    for (const p of paymentsData) {
      const date = p._id;
      trendMap[date] = {
        _id: date,
        dailyGrossRevenue: p.dailyGrossRevenue || 0,
        dailyRefundAmount: 0,
        dailyNetRevenue: p.dailyGrossRevenue || 0,
        revenue: p.dailyGrossRevenue || 0,
        count: p.count || 0
      };
    }

    for (const r of refundsData) {
      const date = r._id;
      if (!trendMap[date]) {
        trendMap[date] = {
          _id: date,
          dailyGrossRevenue: 0,
          dailyRefundAmount: r.refundAmount || 0,
          dailyNetRevenue: -(r.refundAmount || 0),
          revenue: -(r.refundAmount || 0),
          count: 0
        };
      } else {
        trendMap[date].dailyRefundAmount = r.refundAmount || 0;
        trendMap[date].dailyNetRevenue = trendMap[date].dailyGrossRevenue - trendMap[date].dailyRefundAmount;
        trendMap[date].revenue = trendMap[date].dailyNetRevenue;
      }
    }

    const sortedDates = Object.keys(trendMap).sort();
    const revenueData = sortedDates.map(date => trendMap[date]);

    await CacheService.set(CACHE_KEY, revenueData, 60);
    return revenueData;
  }

  /**
   * Retrieves overarching ticket check-in and attendance metrics.
   */
  static async getAttendanceSummary(): Promise<any> {
    const CACHE_KEY = 'analytics:attendance:summary';
    const cachedData = await CacheService.get(CACHE_KEY);
    if (cachedData) {
      return cachedData;
    }

    const totalEvents = await Event.countDocuments({ isDeleted: { $ne: true } });

    const ticketStats = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      {
        $lookup: {
          from: 'events',
          let: { eventId: '$eventId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$eventId'] } } },
            { $project: { isDeleted: 1 } }
          ],
          as: 'event'
        }
      },
      { $unwind: '$event' },
      { $match: { 'event.isDeleted': { $ne: true } } },
      {
        $lookup: {
          from: 'tickets',
          let: { bookingId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$bookingId', '$$bookingId'] } } },
            { $project: { admits: 1, scannedAt: 1 } }
          ],
          as: 'tickets'
        }
      },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$tickets.admits' },
          totalCheckedIn: {
            $sum: {
              $cond: [{ $ne: ['$tickets.scannedAt', null] }, '$tickets.admits', 0]
            }
          }
        }
      }
    ]);

    const totalTicketsSold = ticketStats[0]?.totalSold || 0;
    const totalCheckIns = ticketStats[0]?.totalCheckedIn || 0;

    const attendanceRate = totalTicketsSold > 0
      ? Math.min(100, Number(((totalCheckIns / totalTicketsSold) * 100).toFixed(2)))
      : 0;
    const noShowRate = totalTicketsSold > 0
      ? Math.max(0, Number((((totalTicketsSold - totalCheckIns) / totalTicketsSold) * 100).toFixed(2)))
      : 0;

    const responseData = {
      totalEvents,
      totalTicketsSold,
      totalCheckIns,
      attendanceRate,
      noShowRate
    };

    await CacheService.set(CACHE_KEY, responseData, 60);
    return responseData;
  }

  /**
   * Ranks events by highest attendance rate and highest no-show rate.
   */
  static async getAttendanceRankings(): Promise<any> {
    const CACHE_KEY = 'analytics:attendance:rankings';
    const cachedData = await CacheService.get(CACHE_KEY);
    if (cachedData) {
      return cachedData;
    }

    const eventsData = await Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'tickets',
          let: { eventId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$eventId', '$$eventId'] } } },
            {
              $lookup: {
                from: 'bookings',
                let: { bookingId: '$bookingId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$bookingId'] } } },
                  { $project: { status: 1 } }
                ],
                as: 'booking'
              }
            },
            { $unwind: '$booking' },
            { $match: { 'booking.status': BookingStatus.CONFIRMED } },
            {
              $group: {
                _id: null,
                totalSold: { $sum: '$admits' },
                totalCheckedIn: {
                  $sum: {
                    $cond: [{ $ne: ['$scannedAt', null] }, '$admits', 0]
                  }
                }
              }
            }
          ],
          as: 'ticketStats'
        }
      },
      {
        $project: {
          eventId: '$_id',
          eventName: '$title',
          startDate: 1,
          ticketsSold: { $ifNull: [{ $arrayElemAt: ['$ticketStats.totalSold', 0] }, 0] },
          ticketsCheckedIn: { $ifNull: [{ $arrayElemAt: ['$ticketStats.totalCheckedIn', 0] }, 0] }
        }
      },
      {
        $project: {
          _id: 0,
          eventId: 1,
          eventName: 1,
          startDate: 1,
          ticketsSold: 1,
          ticketsCheckedIn: 1,
          ticketsRemaining: {
            $max: [0, { $subtract: ['$ticketsSold', '$ticketsCheckedIn'] }]
          },
          attendancePercentage: {
            $cond: [
              { $gt: ['$ticketsSold', 0] },
              {
                $min: [
                  100,
                  { $multiply: [{ $divide: ['$ticketsCheckedIn', '$ticketsSold'] }, 100] }
                ]
              },
              0
            ]
          },
          noShowCount: {
            $max: [0, { $subtract: ['$ticketsSold', '$ticketsCheckedIn'] }]
          },
          noShowPercentage: {
            $cond: [
              { $gt: ['$ticketsSold', 0] },
              {
                $min: [
                  100,
                  {
                    $multiply: [
                      { $divide: [{ $max: [0, { $subtract: ['$ticketsSold', '$ticketsCheckedIn'] }] }, '$ticketsSold'] },
                      100
                    ]
                  }
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    const topAttended = [...eventsData]
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage || b.ticketsCheckedIn - a.ticketsCheckedIn)
      .slice(0, 10);

    const lowestAttendance = [...eventsData]
      .sort((a, b) => b.noShowPercentage - a.noShowPercentage || b.noShowCount - a.noShowCount)
      .slice(0, 10);

    const responseData = {
      topAttended,
      lowestAttendance
    };

    await CacheService.set(CACHE_KEY, responseData, 60);
    return responseData;
  }
}

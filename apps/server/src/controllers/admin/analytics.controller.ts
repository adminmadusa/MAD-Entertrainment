import { Request, Response, NextFunction } from 'express';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Ticket } from '../../models/ticket.schema';
import { BookingStatus } from '@mad/shared';

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalBookings = await Booking.countDocuments({ status: BookingStatus.CONFIRMED });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const revenueResult = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get top events by booking count
    const topEventsGroup = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      { $group: { _id: '$eventId', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Populate event details manually
    const topEvents = await Promise.all(
      topEventsGroup.map(async (item) => {
        const event = await Event.findById(item._id).select('title startDate');
        return {
          _id: item._id,
          count: item.count,
          revenue: item.revenue,
          event: event ? { title: event.title, startDate: event.startDate.toISOString() } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        recentBookings,
        totalRevenue,
        topEvents
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Group bookings by date
    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalEvents = await Event.countDocuments({ isDeleted: { $ne: true } });

    const soldResult = await Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$soldCount' } } }
    ]);
    const totalTicketsSold = soldResult[0]?.total || 0;

    const checkedInResult = await Ticket.aggregate([
      { $match: { scannedAt: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$admits' } } }
    ]);
    const totalCheckIns = checkedInResult[0]?.total || 0;

    const attendanceRate = totalTicketsSold > 0 ? Number(((totalCheckIns / totalTicketsSold) * 100).toFixed(2)) : 0;
    const noShowRate = totalTicketsSold > 0 ? Number((((totalTicketsSold - totalCheckIns) / totalTicketsSold) * 100).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        totalTicketsSold,
        totalCheckIns,
        attendanceRate,
        noShowRate
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceRankings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventsData = await Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'tickets',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$eventId', '$$eventId'] },
                    { $ne: ['$scannedAt', null] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                scannedCount: { $sum: '$admits' }
              }
            }
          ],
          as: 'scannedData'
        }
      },
      {
        $project: {
          eventId: '$_id',
          eventName: '$title',
          startDate: 1,
          ticketsSold: { $ifNull: ['$soldCount', 0] },
          ticketsCheckedIn: {
            $ifNull: [
              { $arrayElemAt: ['$scannedData.scannedCount', 0] },
              0
            ]
          }
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
              { $multiply: [{ $divide: ['$ticketsCheckedIn', '$ticketsSold'] }, 100] },
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
                $multiply: [
                  { $divide: [{ $max: [0, { $subtract: ['$ticketsSold', '$ticketsCheckedIn'] }] }, '$ticketsSold'] },
                  100
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    // Sort in memory
    const topAttended = [...eventsData]
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage || b.ticketsCheckedIn - a.ticketsCheckedIn)
      .slice(0, 10);

    const lowestAttendance = [...eventsData]
      .sort((a, b) => b.noShowPercentage - a.noShowPercentage || b.noShowCount - a.noShowCount)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        topAttended,
        lowestAttendance
      }
    });
  } catch (error) {
    next(error);
  }
};

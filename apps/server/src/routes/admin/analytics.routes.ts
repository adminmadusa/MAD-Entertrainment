import { Router } from "express";
import { Booking } from "../../models/booking.schema";
import { Event } from "../../models/event.schema";
import { BookingStatus } from "@mad/shared";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// Require admin for all analytics routes
router.use(requireAdmin);

router.get("/summary", async (req, res, next) => {
  try {
    const totalBookings = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = await Booking.countDocuments({
      status: BookingStatus.CONFIRMED,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const revenueResult = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get top events by booking count
    const topEventsGroup = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Populate event details manually
    const topEvents = await Promise.all(
      topEventsGroup.map(async (item) => {
        const event = await Event.findById(item._id).select("title startDate");
        return {
          _id: item._id,
          count: item.count,
          revenue: item.revenue,
          event: event
            ? { title: event.title, startDate: event.startDate.toISOString() }
            : null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        recentBookings,
        totalRevenue,
        topEvents,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/revenue", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Group bookings by date
    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: BookingStatus.CONFIRMED,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: revenueData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

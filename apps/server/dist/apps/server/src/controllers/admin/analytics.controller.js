"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = getDashboardSummary;
exports.getEventAnalytics = getEventAnalytics;
exports.getRevenueChart = getRevenueChart;
const analytics_schema_1 = require("../../models/analytics.schema");
const booking_schema_1 = require("../../models/booking.schema");
const response_1 = require("../../utils/response");
async function getDashboardSummary(req, res) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalBookings, recentBookings, totalRevenue, topEvents] = await Promise.all([
        booking_schema_1.Booking.countDocuments({}),
        booking_schema_1.Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        booking_schema_1.Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        booking_schema_1.Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: '$eventId', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'event',
                },
            },
            { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
            { $project: { count: 1, revenue: 1, 'event.title': 1, 'event.startDate': 1 } },
        ]),
    ]);
    (0, response_1.sendSuccess)(res, {
        totalBookings,
        recentBookings,
        totalRevenue: totalRevenue[0]?.total ?? 0,
        topEvents,
    });
}
async function getEventAnalytics(req, res) {
    const { eventId } = req.params;
    const { days = '30' } = req.query;
    const daysNum = Math.min(parseInt(days, 10) || 30, 365);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    const analytics = await analytics_schema_1.EventAnalytics.find({
        eventId,
        date: { $gte: since },
    }).sort({ date: 1 });
    (0, response_1.sendSuccess)(res, analytics);
}
async function getRevenueChart(req, res) {
    const { days = '30' } = req.query;
    const daysNum = Math.min(parseInt(days, 10) || 30, 365);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    const revenue = await booking_schema_1.Booking.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: since } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                revenue: { $sum: '$totalAmount' },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    (0, response_1.sendSuccess)(res, revenue);
}
//# sourceMappingURL=analytics.controller.js.map
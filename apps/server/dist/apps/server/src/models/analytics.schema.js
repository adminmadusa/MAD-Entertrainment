"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventAnalytics = void 0;
const mongoose_1 = require("mongoose");
const analyticsSchema = new mongoose_1.Schema({
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    date: { type: Date, required: true },
    bookingsCount: { type: Number, default: 0 },
    ticketsSold: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    refundsCount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
}, { timestamps: true });
// Unique daily analytics per event
analyticsSchema.index({ eventId: 1, date: 1 }, { unique: true });
exports.EventAnalytics = (0, mongoose_1.model)('EventAnalytics', analyticsSchema);
//# sourceMappingURL=analytics.schema.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    type: { type: String, enum: Object.values(shared_1.NotificationType), required: true, index: true },
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', index: true },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', index: true },
    channel: { type: String, required: true },
    recipient: String,
    subject: String,
    body: String,
    isSent: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
//# sourceMappingURL=notification.schema.js.map
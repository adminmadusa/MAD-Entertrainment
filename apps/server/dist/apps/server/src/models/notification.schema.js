"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    type: { type: String, enum: Object.values(shared_1.NotificationType), required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking' },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event' },
    channel: { type: String, enum: ['email', 'sms', 'push'], required: true },
    recipient: { type: String, required: true },
    subject: String,
    body: { type: String, required: true },
    isSent: { type: Boolean, default: false, index: true },
    sentAt: Date,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
}, { timestamps: true });
notificationSchema.index({ isSent: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
//# sourceMappingURL=notification.schema.js.map
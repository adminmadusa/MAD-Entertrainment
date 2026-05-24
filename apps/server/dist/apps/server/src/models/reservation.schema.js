"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reservation = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const transitionSchema = new mongoose_1.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: String,
    correlationId: String,
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const reservationSchema = new mongoose_1.Schema({
    reservationId: { type: String, required: true, unique: true, index: true },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    seatId: { type: String, index: true, sparse: true },
    section: String,
    tier: { type: String, enum: Object.values(shared_1.TicketTier) },
    sessionId: { type: String, index: true },
    socketId: String,
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(shared_1.ReservationStatus), required: true, index: true },
    inventoryState: { type: String, enum: Object.values(shared_1.InventoryState), required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    paymentReference: String,
    bookingReference: { type: String, index: true },
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', index: true },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment', index: true },
    correlationId: { type: String, index: true },
    reservationVersion: { type: Number, default: 1, min: 1 },
    eventVersion: { type: Number, default: 1, min: 1 },
    seatVersion: { type: Number, default: 1, min: 1 },
    transitionLog: { type: [transitionSchema], default: [] },
}, { timestamps: true });
reservationSchema.index({ eventId: 1, seatId: 1 }, {
    unique: true,
    partialFilterExpression: {
        seatId: { $exists: true },
        status: { $in: [shared_1.ReservationStatus.RESERVED, shared_1.ReservationStatus.PENDING_PAYMENT, shared_1.ReservationStatus.CONFIRMED] },
    },
});
reservationSchema.index({ eventId: 1, tier: 1, status: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 });
reservationSchema.index({ bookingId: 1, status: 1 });
reservationSchema.pre('validate', function (next) {
    if (!this.reservationId) {
        this.reservationId = `RSV-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    }
    next();
});
exports.Reservation = (0, mongoose_1.model)('Reservation', reservationSchema);
//# sourceMappingURL=reservation.schema.js.map
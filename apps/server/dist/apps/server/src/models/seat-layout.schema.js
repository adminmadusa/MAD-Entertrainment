"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatLayout = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const seatSchema = new mongoose_1.Schema({
    seatId: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: Number, required: true },
    section: String,
    status: {
        type: String,
        enum: Object.values(shared_1.SeatStatus),
        default: shared_1.SeatStatus.AVAILABLE,
    },
    tier: { type: String, enum: Object.values(shared_1.TicketTier), required: true },
    price: { type: Number, required: true, min: 0 },
    lockedBy: String, // socket session ID
    lockedAt: Date,
    bookedByBookingId: String,
    reservationId: String,
    seatVersion: { type: Number, default: 1, min: 1 },
}, { _id: false });
const seatLayoutSchema = new mongoose_1.Schema({
    eventId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        unique: true,
        index: true,
    },
    rows: { type: Number, required: true, min: 1 },
    columns: { type: Number, required: true, min: 1 },
    sections: [
        {
            name: String,
            rows: [String],
            tier: { type: String, enum: Object.values(shared_1.TicketTier) },
            color: String,
            _id: false,
        },
    ],
    seats: [seatSchema],
}, { timestamps: true });
seatLayoutSchema.index({ 'seats.seatId': 1, eventId: 1 });
seatLayoutSchema.index({ 'seats.status': 1, eventId: 1 });
exports.SeatLayout = (0, mongoose_1.model)('SeatLayout', seatLayoutSchema);
//# sourceMappingURL=seat-layout.schema.js.map
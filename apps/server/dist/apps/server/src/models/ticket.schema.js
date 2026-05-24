"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const ticketSchema = new mongoose_1.Schema({
    ticketId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    tierName: { type: String, required: true },
    tier: { type: String, enum: Object.values(shared_1.TicketTier), required: true },
    admits: { type: Number, default: 1 },
    seatId: String,
    row: String,
    seatNumber: Number,
    section: String,
    qrCode: { type: String, required: true, unique: true },
    qrCodeImage: String,
    isScanned: { type: Boolean, default: false, index: true },
    scannedAt: Date,
    scannedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Admin' },
    isExpired: { type: Boolean, default: false },
    expiredAt: Date,
}, { timestamps: true });
ticketSchema.index({ eventId: 1, isScanned: 1 });
exports.Ticket = (0, mongoose_1.model)('Ticket', ticketSchema);
//# sourceMappingURL=ticket.schema.js.map
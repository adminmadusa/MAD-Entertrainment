"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const bookingSchema = new mongoose_1.Schema({
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        // Format: MAD-YYYY-XXXXX
    },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: String,
    guestEmail: { type: String, lowercase: true, trim: true },
    guestPhone: String,
    sessionId: { type: String, index: true },
    tickets: [
        {
            tier: { type: String, enum: Object.values(shared_1.TicketTier), required: true },
            tierName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            pricePerTicket: { type: Number, required: true, min: 0 },
            subtotal: { type: Number, required: true, min: 0 },
            seats: [
                {
                    seatId: String,
                    row: String,
                    number: Number,
                    section: String,
                    _id: false,
                },
            ],
            _id: false,
        },
    ],
    totalTickets: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    couponCode: String,
    couponId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
    status: {
        type: String,
        enum: Object.values(shared_1.BookingStatus),
        default: shared_1.BookingStatus.AWAITING_PAYMENT,
        index: true,
    },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment' },
    reservationIds: [{ type: String }],
    bookingVersion: { type: Number, default: 1, min: 1 },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL for pending bookings
    cancellationReason: String,
    cancelledAt: Date,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
bookingSchema.virtual('price').get(function () {
    return this.tickets?.[0]?.pricePerTicket;
});
bookingSchema.virtual('amount').get(function () {
    return this.totalAmount;
});
bookingSchema.index({ guestEmail: 1, createdAt: -1 });
bookingSchema.index({ guestPhone: 1, createdAt: -1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.pre('validate', function (next) {
    if (!this.bookingId) {
        const year = new Date().getFullYear();
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 5; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.bookingId = `MAD-${year}-${randomPart}`;
    }
    next();
});
exports.Booking = (0, mongoose_1.model)('Booking', bookingSchema);
//# sourceMappingURL=booking.schema.js.map
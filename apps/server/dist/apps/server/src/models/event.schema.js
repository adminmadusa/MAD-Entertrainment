"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const cloudinaryImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    format: String,
    blurDataUrl: String,
}, { _id: false });
const ticketTierConfigSchema = new mongoose_1.Schema({
    tier: { type: String, enum: Object.values(shared_1.TicketTier), required: true },
    name: { type: String, required: true },
    slug: { type: String, lowercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    totalCapacity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    groupSize: { type: Number, default: 1, min: 1 },
    minPerBooking: { type: Number, default: 1, min: 1 },
    description: String,
    perks: [String],
    tags: [String],
    discount: { type: Number, min: 0 },
    taxPercent: { type: Number, min: 0, max: 100 },
    availabilityWindow: {
        startDate: Date,
        endDate: Date,
    },
    isActive: { type: Boolean, default: true },
    maxPerBooking: { type: Number, default: 10 },
}, { _id: false });
const eventSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, enum: Object.values(shared_1.EventCategory), required: true, index: true },
    status: { type: String, enum: Object.values(shared_1.EventStatus), default: shared_1.EventStatus.DRAFT, index: true },
    bookingMode: { type: String, enum: Object.values(shared_1.BookingMode), required: true },
    bannerImage: { type: cloudinaryImageSchema, required: true },
    posterImage: cloudinaryImageSchema,
    galleryImages: [cloudinaryImageSchema],
    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    doorsOpenTime: String,
    showTime: { type: String, required: true },
    venueId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    onlineStreamUrl: String,
    isOnline: { type: Boolean, default: false },
    artistIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Artist' }],
    djOperatorIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'DJOperator' }],
    ticketTiers: { type: [ticketTierConfigSchema], default: [] },
    totalCapacity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    reservedCount: { type: Number, default: 0, min: 0 },
    eventVersion: { type: Number, default: 1, min: 1 },
    isFeatured: { type: Boolean, default: false, index: true },
    isSoldOut: { type: Boolean, default: false },
    seatLayoutId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SeatLayout' },
    tags: [String],
    ageRestriction: Number,
    dresscode: String,
    additionalInfo: String,
    showCountdown: { type: Boolean, default: false },
    isEarlyBird: { type: Boolean, default: false },
    earlyBirdDeadline: Date,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
// ─── Indexes ──────────────────────────────────────────────────
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1, startDate: 1 });
eventSchema.index({ isFeatured: 1, status: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
exports.Event = (0, mongoose_1.model)('Event', eventSchema);
//# sourceMappingURL=event.schema.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Venue = void 0;
const mongoose_1 = require("mongoose");
const venueSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    address: {
        street: String,
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true, default: 'India' },
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number,
        },
    },
    capacity: { type: Number, required: true, min: 1 },
    amenities: [String],
    images: [
        {
            url: String,
            publicId: String,
            _id: false,
        },
    ],
    contactEmail: String,
    contactPhone: String,
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
venueSchema.index({ 'address.city': 1, isActive: 1 });
exports.Venue = (0, mongoose_1.model)('Venue', venueSchema);
//# sourceMappingURL=venue.schema.js.map
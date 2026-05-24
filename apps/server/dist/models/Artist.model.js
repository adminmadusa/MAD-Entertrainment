"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Artist = void 0;
const mongoose_1 = require("mongoose");
const artistSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    bio: { type: String, maxlength: 2000 },
    genre: [String],
    profileImage: { url: String, publicId: String, _id: false },
    galleryImages: [{ url: String, publicId: String, _id: false }],
    socialLinks: {
        instagram: String,
        youtube: String,
        spotify: String,
        twitter: String,
        facebook: String,
        _id: false,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
artistSchema.index({ name: 'text' });
exports.Artist = (0, mongoose_1.model)('Artist', artistSchema);
//# sourceMappingURL=Artist.model.js.map
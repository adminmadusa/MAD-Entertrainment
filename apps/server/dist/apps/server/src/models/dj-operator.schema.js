"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DJOperator = void 0;
const mongoose_1 = require("mongoose");
const djOperatorSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    bio: { type: String, maxlength: 2000 },
    specialties: [String],
    profileImage: { url: String, publicId: String, _id: false },
    galleryImages: [{ url: String, publicId: String, _id: false }],
    socialLinks: {
        instagram: String,
        soundcloud: String,
        youtube: String,
        _id: false,
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
djOperatorSchema.index({ name: 'text' });
exports.DJOperator = (0, mongoose_1.model)('DJOperator', djOperatorSchema);
//# sourceMappingURL=dj-operator.schema.js.map
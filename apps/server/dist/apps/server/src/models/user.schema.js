"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, index: true },
    phone: { type: String, trim: true, sparse: true, index: true },
    passwordHash: { type: String },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isGuest: { type: Boolean, default: true },
    googleId: { type: String, sparse: true, index: true },
    profileImage: {
        url: String,
        publicId: String,
    },
    preferredCurrency: { type: String, default: 'INR' },
    otpHash: { type: String },
    otpExpiry: { type: Date },
}, {
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            ret['passwordHash'] = undefined;
            ret['otpHash'] = undefined;
            ret['otpExpiry'] = undefined;
            return ret;
        },
    },
});
exports.User = (0, mongoose_1.model)('User', userSchema);
//# sourceMappingURL=user.schema.js.map
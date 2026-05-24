"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const mongoose_1 = require("mongoose");
const shared_1 = require("@mad/shared");
const adminSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(shared_1.AdminRole),
        default: shared_1.AdminRole.ADMIN,
        index: true,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    permissions: [String],
}, {
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            ret['passwordHash'] = undefined;
            return ret;
        },
    },
});
exports.Admin = (0, mongoose_1.model)('Admin', adminSchema);
//# sourceMappingURL=Admin.model.js.map
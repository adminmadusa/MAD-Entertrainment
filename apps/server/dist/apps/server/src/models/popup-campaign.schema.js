"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupCampaign = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const popupCampaignSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: String,
    image: { url: String, publicId: String, _id: false },
    ctaText: String,
    ctaUrl: String,
    trigger: {
        type: String,
        enum: Object.values(shared_1.PopupTrigger),
        default: shared_1.PopupTrigger.ON_LOAD,
    },
    triggerDelay: { type: Number, default: 3000 }, // ms
    cooldownHours: { type: Number, default: 24 },
    isActive: { type: Boolean, default: true, index: true },
    showOnPages: [String],
    linkedEventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event' },
    startDate: Date,
    endDate: Date,
    priority: { type: Number, default: 0 }, // Higher = shown first
}, { timestamps: true });
popupCampaignSchema.index({ isActive: 1, priority: -1 });
popupCampaignSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
exports.PopupCampaign = (0, mongoose_1.model)('PopupCampaign', popupCampaignSchema);
//# sourceMappingURL=popup-campaign.schema.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupCampaign = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cloudinaryImageSchema = new mongoose_1.Schema({ url: { type: String, required: true }, publicId: { type: String, required: true } }, { _id: false });
const popupCampaignSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    image: cloudinaryImageSchema,
    ctaUrl: String,
    ctaText: String,
    trigger: {
        type: String,
        enum: ['onLoad', 'onExit', 'onScroll', 'onTimer'],
        required: true,
        default: 'onLoad',
    },
    triggerDelay: { type: Number, min: 0, default: 0 },
    cooldownHours: { type: Number, min: 0, default: 24 },
    showOnPages: [String],
    isActive: { type: Boolean, default: true, index: true },
    startDate: Date,
    endDate: { type: Date, index: true },
    linkedEvent: new mongoose_1.Schema({
        eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event' },
        showCountdown: { type: Boolean, default: false },
        earlyBirdDeadline: Date,
    }, { _id: false }),
}, { timestamps: true });
exports.PopupCampaign = mongoose_1.default.models.PopupCampaign ||
    mongoose_1.default.model('PopupCampaign', popupCampaignSchema);
//# sourceMappingURL=popup-campaign.schema.js.map
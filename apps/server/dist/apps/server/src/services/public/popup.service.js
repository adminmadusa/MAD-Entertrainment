"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicPopupService = void 0;
const popup_campaign_schema_1 = require("../../models/popup-campaign.schema");
class PublicPopupService {
    /**
     * Returns active popup campaigns valid at the current time,
     * sorted by priority (highest first).
     * The frontend is responsible for applying cooldown logic using localStorage.
     */
    static async getActivePopups() {
        const now = new Date();
        const popups = await popup_campaign_schema_1.PopupCampaign.find({
            isActive: true,
            $and: [
                { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
                { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
            ],
        })
            .sort({ priority: -1 })
            .select('-__v')
            .lean();
        return popups;
    }
}
exports.PublicPopupService = PublicPopupService;
//# sourceMappingURL=popup.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicPopupService = void 0;
const popup_campaign_schema_1 = require("../../models/popup-campaign.schema");
class PublicPopupService {
    static async getActivePopups() {
        const now = new Date();
        const popups = await popup_campaign_schema_1.PopupCampaign.find({
            isActive: true,
            $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
            $and: [
                {
                    $or: [{ endDate: { $exists: false } }, { endDate: { $gt: now } }],
                },
            ],
        })
            .select('-__v')
            .lean();
        return popups;
    }
}
exports.PublicPopupService = PublicPopupService;
//# sourceMappingURL=popup.service.js.map
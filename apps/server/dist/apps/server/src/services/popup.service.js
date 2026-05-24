"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupService = void 0;
const PopupCampaign_model_1 = require("../models/PopupCampaign.model");
const error_middleware_1 = require("../middleware/error.middleware");
class PopupService {
    static async listPopups(page, limit) {
        const skip = (page - 1) * limit;
        const [popups, total] = await Promise.all([
            PopupCampaign_model_1.PopupCampaign.find()
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PopupCampaign_model_1.PopupCampaign.countDocuments(),
        ]);
        return { popups, total };
    }
    static async getPopupById(id) {
        const popup = await PopupCampaign_model_1.PopupCampaign.findById(id);
        if (!popup) {
            throw error_middleware_1.AppError.notFound('Popup Campaign');
        }
        return popup;
    }
    static async createPopup(data) {
        return await PopupCampaign_model_1.PopupCampaign.create(data);
    }
    static async updatePopup(id, data) {
        const popup = await PopupCampaign_model_1.PopupCampaign.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!popup) {
            throw error_middleware_1.AppError.notFound('Popup Campaign');
        }
        return popup;
    }
    static async deletePopup(id) {
        const popup = await PopupCampaign_model_1.PopupCampaign.findByIdAndDelete(id);
        if (!popup) {
            throw error_middleware_1.AppError.notFound('Popup Campaign');
        }
    }
    static async togglePopup(id) {
        const popup = await PopupCampaign_model_1.PopupCampaign.findById(id);
        if (!popup) {
            throw error_middleware_1.AppError.notFound('Popup Campaign');
        }
        popup.isActive = !popup.isActive;
        await popup.save();
        return popup.isActive;
    }
}
exports.PopupService = PopupService;
//# sourceMappingURL=popup.service.js.map
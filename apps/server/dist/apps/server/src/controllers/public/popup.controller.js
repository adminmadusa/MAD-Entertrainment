"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePopups = getActivePopups;
const popup_service_1 = require("../../services/public/popup.service");
const cache_service_1 = require("../../services/cache.service");
const response_1 = require("../../utils/response");
async function getActivePopups(req, res, next) {
    try {
        const cacheKey = 'popups:active';
        const cached = await cache_service_1.CacheService.get(cacheKey);
        if (cached) {
            (0, response_1.sendSuccess)(res, cached, 'Active popups retrieved (cached)');
            return;
        }
        const popups = await popup_service_1.PublicPopupService.getActivePopups();
        // Cache for 5 minutes — popups don't change frequently
        await cache_service_1.CacheService.set(cacheKey, popups, 300);
        (0, response_1.sendSuccess)(res, popups, 'Active popups retrieved');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=popup.controller.js.map
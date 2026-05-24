"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePopups = getActivePopups;
const popup_service_1 = require("../../services/public/popup.service");
const response_1 = require("../../utils/response");
async function getActivePopups(req, res) {
    const popups = await popup_service_1.PublicPopupService.getActivePopups();
    (0, response_1.sendSuccess)(res, popups);
}
//# sourceMappingURL=popup.controller.js.map
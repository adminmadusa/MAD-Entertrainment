"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPopups = listPopups;
exports.getPopup = getPopup;
exports.createPopup = createPopup;
exports.updatePopup = updatePopup;
exports.deletePopup = deletePopup;
exports.togglePopup = togglePopup;
const popup_service_1 = require("../../services/admin/popup.service");
const response_1 = require("../../utils/response");
async function listPopups(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { popups, total } = await popup_service_1.PopupService.listPopups(page, limit);
    (0, response_1.sendPaginated)(res, popups, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getPopup(req, res) {
    const popup = await popup_service_1.PopupService.getPopupById(req.params.id);
    (0, response_1.sendSuccess)(res, popup);
}
async function createPopup(req, res) {
    const body = req.body;
    const popup = await popup_service_1.PopupService.createPopup(body);
    (0, response_1.sendCreated)(res, popup, 'Popup campaign created');
}
async function updatePopup(req, res) {
    const body = req.body;
    const popup = await popup_service_1.PopupService.updatePopup(req.params.id, body);
    (0, response_1.sendSuccess)(res, popup, 'Popup campaign updated');
}
async function deletePopup(req, res) {
    await popup_service_1.PopupService.deletePopup(req.params.id);
    (0, response_1.sendSuccess)(res, null, 'Popup campaign deleted');
}
async function togglePopup(req, res) {
    const isActive = await popup_service_1.PopupService.togglePopup(req.params.id);
    (0, response_1.sendSuccess)(res, { isActive }, `Popup ${isActive ? 'activated' : 'deactivated'}`);
}
//# sourceMappingURL=popup.controller.js.map
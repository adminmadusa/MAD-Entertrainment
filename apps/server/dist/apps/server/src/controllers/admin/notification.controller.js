"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.retryNotification = retryNotification;
const notification_service_1 = require("../../services/admin/notification.service");
const response_1 = require("../../utils/response");
async function listNotifications(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { sent, channel } = req.query;
    const { notifications, total } = await notification_service_1.NotificationService.listNotifications({ sent, channel }, page, limit);
    (0, response_1.sendPaginated)(res, notifications, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function retryNotification(req, res) {
    const notification = await notification_service_1.NotificationService.retryNotification(req.params.id);
    (0, response_1.sendSuccess)(res, notification, 'Notification queued for retry');
}
//# sourceMappingURL=notification.controller.js.map
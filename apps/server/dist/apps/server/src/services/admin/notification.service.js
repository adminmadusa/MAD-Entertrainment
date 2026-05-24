"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const error_middleware_1 = require("../../middleware/error.middleware");
const notification_schema_1 = require("../../models/notification.schema");
class NotificationService {
    static async listNotifications(filters, page, limit) {
        const skip = (page - 1) * limit;
        const filter = {};
        if (filters.sent === 'true')
            filter['isSent'] = true;
        if (filters.sent === 'false')
            filter['isSent'] = false;
        if (filters.channel)
            filter['channel'] = filters.channel;
        const [notifications, total] = await Promise.all([
            notification_schema_1.Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            notification_schema_1.Notification.countDocuments(filter),
        ]);
        return { notifications, total };
    }
    static async retryNotification(id) {
        const notification = await notification_schema_1.Notification.findById(id);
        if (!notification) {
            throw error_middleware_1.AppError.notFound('Notification');
        }
        if (notification.isSent) {
            throw error_middleware_1.AppError.badRequest('Notification was already sent successfully');
        }
        notification.retryCount += 1;
        notification.failureReason = undefined;
        await notification.save();
        return notification;
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map
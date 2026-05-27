import { Router } from "express";
import * as notificationController from "../../controllers/admin/notification.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.get("/", notificationController.getNotifications);
router.post("/:id/retry", notificationController.retryNotification);

export default router;

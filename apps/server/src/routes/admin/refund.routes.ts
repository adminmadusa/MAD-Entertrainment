import { Router } from "express";
import * as refundController from "../../controllers/admin/refund.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post("/", refundController.createRefund);
router.get("/", refundController.getRefunds);
router.patch("/:id/process", refundController.processRefund);

export default router;

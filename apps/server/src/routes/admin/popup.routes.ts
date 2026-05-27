import { Router } from "express";
import * as popupController from "../../controllers/admin/popup.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All administrative popup routes require administrator credentials
router.use(requireAdmin);

router.post("/", popupController.createPopup);
router.get("/", popupController.getPopups);
router.get("/:id", popupController.getPopupById);
router.put("/:id", popupController.updatePopup);
router.delete("/:id", popupController.deletePopup);
router.patch("/:id/toggle", popupController.togglePopup);

export default router;

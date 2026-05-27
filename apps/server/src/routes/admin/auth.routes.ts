import { Router } from "express";
import { adminAuthController } from "../../controllers/admin/auth.controller";
import { requireAdmin } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { adminLoginSchema } from "../../validations/admin.validation";

const router: Router = Router();

router.post("/login", validate(adminLoginSchema), adminAuthController.login);
router.get("/me", requireAdmin, adminAuthController.getMe);
router.post("/logout", requireAdmin, adminAuthController.logout);

export default router;

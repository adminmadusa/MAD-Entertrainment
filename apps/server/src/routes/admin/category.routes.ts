import { Router } from "express";
import * as categoryController from "../../controllers/admin/category.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post("/", categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;

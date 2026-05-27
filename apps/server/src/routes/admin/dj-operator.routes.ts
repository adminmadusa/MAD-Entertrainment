import { Router } from "express";
import * as djOperatorController from "../../controllers/admin/dj-operator.controller";
import { validate } from "../../middleware/validation.middleware";
import {
  createDJOperatorSchema,
  updateDJOperatorSchema,
} from "../../validations/admin-content.validation";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post(
  "/",
  validate(createDJOperatorSchema),
  djOperatorController.createDJOperator,
);
router.get("/", djOperatorController.getDJOperators);
router.get("/:id", djOperatorController.getDJOperatorById);
router.put(
  "/:id",
  validate(updateDJOperatorSchema),
  djOperatorController.updateDJOperator,
);
router.delete("/:id", djOperatorController.deleteDJOperator);

export default router;

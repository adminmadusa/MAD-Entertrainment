import { Router } from "express";

import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  retryFailedJob,
  retryAllFailedJobs,
} from "../../controllers/admin/diagnostics.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

import {
  validateQuery,
  validateParams,
} from "../../middleware/validation.middleware";
import {
  listReservationsQuerySchema,
  retryFailedJobParamSchema,
} from "../../validations/payment.validation";

const router: Router = Router();

router.use(requireAdmin);
router.get("/consistency", getConsistencyDiagnostics);
router.post("/consistency/repair", repairConsistency);
router.get(
  "/reservations",
  validateQuery(listReservationsQuerySchema),
  listReservations,
);
router.get("/system", getSystemDiagnostics);
router.post(
  "/dlq/:id/retry",
  validateParams(retryFailedJobParamSchema),
  retryFailedJob,
);
router.post("/dlq/retry-all", retryAllFailedJobs);

export default router;

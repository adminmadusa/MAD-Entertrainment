import { Router } from "express";

import { getPrometheusMetrics } from "../controllers/metrics.controller";

const router: Router = Router();

router.get("/", getPrometheusMetrics);

export default router;

import { Router } from "express";
import {
  listDJOperators,
  getDJOperatorBySlug,
} from "../../controllers/public/dj-operator.controller";
import { cdnCache } from "../../middleware/cache.middleware";

const router: Router = Router();

router.get("/", cdnCache(60, 120), listDJOperators);
router.get("/:slug", cdnCache(60, 300), getDJOperatorBySlug);

export default router;

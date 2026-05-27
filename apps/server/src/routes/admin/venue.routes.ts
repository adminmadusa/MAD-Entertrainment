import { Router } from "express";
import * as venueController from "../../controllers/admin/venue.controller";
import { validate } from "../../middleware/validation.middleware";
import {
  createVenueSchema,
  updateVenueSchema,
} from "../../validations/admin-content.validation";
import { requireAdmin } from "../../middleware/auth.middleware";

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post("/", validate(createVenueSchema), venueController.createVenue);
router.get("/", venueController.getVenues);
router.get("/:id", venueController.getVenueById);
router.put("/:id", validate(updateVenueSchema), venueController.updateVenue);
router.delete("/:id", venueController.deleteVenue);

export default router;

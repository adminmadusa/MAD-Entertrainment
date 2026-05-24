"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const venue_controller_1 = require("../../controllers/admin/venue.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', venue_controller_1.listVenues);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createVenueSchema), venue_controller_1.createVenue);
router.get('/:id', venue_controller_1.getVenue);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updateVenueSchema), venue_controller_1.updateVenue);
router.delete('/:id', venue_controller_1.deleteVenue);
exports.default = router;
//# sourceMappingURL=venue.routes.js.map
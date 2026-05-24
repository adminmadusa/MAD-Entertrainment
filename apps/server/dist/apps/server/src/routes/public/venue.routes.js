"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const venue_controller_1 = require("../../controllers/public/venue.controller");
const router = (0, express_1.Router)();
router.get('/', venue_controller_1.listPublicVenues);
router.get('/:slug', venue_controller_1.getPublicVenueBySlug);
exports.default = router;
//# sourceMappingURL=venue.routes.js.map
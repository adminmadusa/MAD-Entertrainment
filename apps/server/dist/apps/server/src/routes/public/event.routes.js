"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../../controllers/public/event.controller");
const router = (0, express_1.Router)();
router.get('/', event_controller_1.listEvents);
router.get('/:slug', event_controller_1.getEventBySlug);
router.get('/:id/seats', event_controller_1.getEventSeatLayout);
exports.default = router;
//# sourceMappingURL=event.routes.js.map
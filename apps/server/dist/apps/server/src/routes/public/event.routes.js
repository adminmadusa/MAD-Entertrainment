"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../../controllers/public/event.controller");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const router = (0, express_1.Router)();
router.get('/', (0, cache_middleware_1.cdnCache)(60, 300), event_controller_1.listEvents);
router.get('/:slug', (0, cache_middleware_1.cdnCache)(60, 600), event_controller_1.getEventBySlug);
router.get('/:eventId/seats', event_controller_1.getEventSeatLayout);
exports.default = router;
//# sourceMappingURL=event.routes.js.map
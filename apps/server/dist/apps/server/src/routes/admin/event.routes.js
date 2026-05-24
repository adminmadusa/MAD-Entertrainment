"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const event_controller_1 = require("../../controllers/admin/event.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', event_controller_1.listEvents);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createEventSchema), event_controller_1.createEvent);
router.get('/:id', event_controller_1.getEvent);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updateEventSchema), event_controller_1.updateEvent);
router.delete('/:id', event_controller_1.deleteEvent);
router.patch('/:id/featured', event_controller_1.toggleFeatured);
router.patch('/:id/status', event_controller_1.updateEventStatus);
exports.default = router;
//# sourceMappingURL=event.routes.js.map
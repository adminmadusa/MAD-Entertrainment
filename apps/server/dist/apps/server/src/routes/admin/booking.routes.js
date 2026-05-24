"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../../controllers/admin/booking.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', booking_controller_1.listBookings);
router.get('/:id', booking_controller_1.getBooking);
router.patch('/:id/cancel', booking_controller_1.cancelBooking);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map
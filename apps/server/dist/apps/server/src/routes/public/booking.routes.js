"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../../controllers/public/booking.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.optionalAuth, booking_controller_1.createBooking);
router.get('/me', auth_middleware_1.requireAuth, booking_controller_1.getMyBookings);
router.get('/:bookingId', booking_controller_1.getBooking);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map
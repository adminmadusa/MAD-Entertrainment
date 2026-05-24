"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_routes_1 = __importDefault(require("./health.routes"));
// Public routes (future phases)
// import eventRoutes from './public/events.routes';
// import bookingRoutes from './public/bookings.routes';
// import paymentRoutes from './public/payments.routes';
// import authRoutes from './public/auth.routes';
// import venueRoutes from './public/venues.routes';
// Admin routes (future phases)
// import adminAuthRoutes from './admin/auth.routes';
// import adminEventRoutes from './admin/events.routes';
// import adminBookingRoutes from './admin/bookings.routes';
// import adminAnalyticsRoutes from './admin/analytics.routes';
const router = (0, express_1.Router)();
// ─── Health ──────────────────────────────────────────────────
router.use('/health', health_routes_1.default);
// ─── Public Routes ────────────────────────────────────────────
// router.use('/events', eventRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/auth', authRoutes);
// router.use('/venues', venueRoutes);
// ─── Admin Routes ─────────────────────────────────────────────
// router.use('/admin/auth', adminAuthRoutes);
// router.use('/admin/events', requireAdmin, adminEventRoutes);
// router.use('/admin/bookings', requireAdmin, adminBookingRoutes);
// router.use('/admin/analytics', requireAdmin, adminAnalyticsRoutes);
exports.default = router;
//# sourceMappingURL=index.js.map
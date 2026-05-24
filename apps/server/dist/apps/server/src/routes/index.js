"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const diagnostics_routes_1 = __importDefault(require("./admin/diagnostics.routes"));
const health_routes_1 = __importDefault(require("./health.routes"));
const booking_routes_1 = __importDefault(require("./public/booking.routes"));
const event_routes_1 = __importDefault(require("./public/event.routes"));
const payment_routes_1 = __importDefault(require("./public/payment.routes"));
const router = (0, express_1.Router)();
const unreconstructed = (0, express_1.Router)();
unreconstructed.use((_req, res) => {
    res.status(501).json({
        success: false,
        message: 'This route is pending source reconstruction',
    });
});
// ─── Health ───────────────────────────────────────────────────
router.use('/health', health_routes_1.default);
// ─── Public routes ───────────────────────────────────────────
router.use('/auth', unreconstructed);
router.use('/events', event_routes_1.default);
router.use('/bookings', booking_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/dj-operators', unreconstructed);
router.use('/artists', unreconstructed);
router.use('/venues', unreconstructed);
router.use('/popups', unreconstructed);
// ─── Admin: Auth ──────────────────────────────────────────────
router.use('/admin/auth', unreconstructed);
// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
router.use('/admin/uploads', unreconstructed);
// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
router.use('/admin/events', unreconstructed);
router.use('/admin/venues', unreconstructed);
router.use('/admin/artists', unreconstructed);
router.use('/admin/dj-operators', unreconstructed);
// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
router.use('/admin/bookings', unreconstructed);
router.use('/admin/refunds', unreconstructed);
// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
router.use('/admin/coupons', unreconstructed);
router.use('/admin/analytics', unreconstructed);
router.use('/admin/diagnostics', diagnostics_routes_1.default);
// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
router.use('/admin/popups', unreconstructed);
router.use('/admin/notifications', unreconstructed);
router.use('/admin/team', unreconstructed);
router.use('/admin/scanner', unreconstructed);
exports.default = router;
//# sourceMappingURL=index.js.map
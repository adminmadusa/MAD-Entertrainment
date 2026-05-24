"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_routes_1 = __importDefault(require("./admin/analytics.routes"));
const artist_routes_1 = __importDefault(require("./admin/artist.routes"));
const auth_routes_1 = __importDefault(require("./admin/auth.routes"));
const booking_routes_1 = __importDefault(require("./admin/booking.routes"));
const coupon_routes_1 = __importDefault(require("./admin/coupon.routes"));
const dj_routes_1 = __importDefault(require("./admin/dj.routes"));
const diagnostics_routes_1 = __importDefault(require("./admin/diagnostics.routes"));
const event_routes_1 = __importDefault(require("./admin/event.routes"));
const notification_routes_1 = __importDefault(require("./admin/notification.routes"));
const popup_routes_1 = __importDefault(require("./admin/popup.routes"));
const refund_routes_1 = __importDefault(require("./admin/refund.routes"));
const scanner_routes_1 = __importDefault(require("./admin/scanner.routes"));
const upload_routes_1 = __importDefault(require("./admin/upload.routes"));
const user_routes_1 = __importDefault(require("./admin/user.routes"));
const venue_routes_1 = __importDefault(require("./admin/venue.routes"));
const health_routes_1 = __importDefault(require("./health.routes"));
// Public routes
const artist_routes_2 = __importDefault(require("./public/artist.routes"));
const auth_routes_2 = require("./public/auth.routes");
const booking_routes_2 = __importDefault(require("./public/booking.routes"));
const dj_routes_2 = __importDefault(require("./public/dj.routes"));
const event_routes_2 = __importDefault(require("./public/event.routes"));
const payment_routes_1 = __importDefault(require("./public/payment.routes"));
const popup_routes_2 = __importDefault(require("./public/popup.routes"));
const venue_routes_2 = __importDefault(require("./public/venue.routes"));
const dev_routes_1 = __importDefault(require("./public/dev.routes"));
const router = (0, express_1.Router)();
// ─── Health ───────────────────────────────────────────────────
router.use('/health', health_routes_1.default);
// ─── Public routes ───────────────────────────────────────────
router.use('/auth', auth_routes_2.authRouter);
router.use('/events', event_routes_2.default);
router.use('/bookings', booking_routes_2.default);
router.use('/payments', payment_routes_1.default);
router.use('/dj-operators', dj_routes_2.default);
router.use('/artists', artist_routes_2.default);
router.use('/venues', venue_routes_2.default);
router.use('/popups', popup_routes_2.default);
// ─── Dev utilities (development only) ─────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    router.use('/dev', dev_routes_1.default);
}
// ─── Admin: Auth ──────────────────────────────────────────────
router.use('/admin/auth', auth_routes_1.default);
// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
router.use('/admin/uploads', upload_routes_1.default);
// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
router.use('/admin/events', event_routes_1.default);
router.use('/admin/venues', venue_routes_1.default);
router.use('/admin/artists', artist_routes_1.default);
router.use('/admin/dj-operators', dj_routes_1.default);
// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
router.use('/admin/bookings', booking_routes_1.default);
router.use('/admin/refunds', refund_routes_1.default);
// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
router.use('/admin/coupons', coupon_routes_1.default);
router.use('/admin/analytics', analytics_routes_1.default);
router.use('/admin/diagnostics', diagnostics_routes_1.default);
// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
router.use('/admin/popups', popup_routes_1.default);
router.use('/admin/notifications', notification_routes_1.default);
router.use('/admin/team', user_routes_1.default);
router.use('/admin/scanner', scanner_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map
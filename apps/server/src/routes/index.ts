import { Router } from 'express';

import adminDiagnosticsRoutes from './admin/diagnostics.routes';
import healthRoutes from './health.routes';
import publicBookingRoutes from './public/booking.routes';
import publicDJOperatorRoutes from './public/dj-operator.routes';
import publicEventRoutes from './public/event.routes';
import publicPaymentRoutes from './public/payment.routes';
import publicPopupRoutes from './public/popup.routes';

const router: Router = Router();
const unreconstructed: Router = Router();

unreconstructed.use((_req, res) => {
  res.status(501).json({
    success: false,
    message: 'This route is pending source reconstruction',
  });
});

// ─── Health ───────────────────────────────────────────────────
router.use('/health', healthRoutes);

// ─── Public routes ───────────────────────────────────────────
router.use('/auth', unreconstructed);
router.use('/events', publicEventRoutes);
router.use('/bookings', publicBookingRoutes);
router.use('/payments', publicPaymentRoutes);
router.use('/dj-operators', publicDJOperatorRoutes);
router.use('/artists', unreconstructed);
router.use('/venues', unreconstructed);
router.use('/popups', publicPopupRoutes);

// ─── Admin: Auth ──────────────────────────────────────────────
import adminAuthRoutes from './admin/auth.routes';
router.use('/admin/auth', adminAuthRoutes);

// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
import adminUploadRoutes from './admin/upload.routes';
router.use('/admin/uploads', adminUploadRoutes);

// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
import adminEventRoutes from './admin/event.routes';
import adminVenueRoutes from './admin/venue.routes';
import adminArtistRoutes from './admin/artist.routes';
import adminDjOperatorRoutes from './admin/dj-operator.routes';

router.use('/admin/events', adminEventRoutes);
router.use('/admin/venues', adminVenueRoutes);
router.use('/admin/artists', adminArtistRoutes);
router.use('/admin/dj-operators', adminDjOperatorRoutes);

// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
import adminBookingRoutes from './admin/booking.routes';
import adminRefundRoutes from './admin/refund.routes';
router.use('/admin/bookings', adminBookingRoutes);
router.use('/admin/refunds', adminRefundRoutes);

// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
import adminCouponRoutes from './admin/coupon.routes';
router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/analytics', unreconstructed);
router.use('/admin/diagnostics', adminDiagnosticsRoutes);

// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
import adminScannerRoutes from './admin/scanner.routes';
import adminNotificationRoutes from './admin/notification.routes';
import adminTeamRoutes from './admin/team.routes';
import adminPopupRoutes from './admin/popup.routes';
router.use('/admin/popups', adminPopupRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/admin/team', adminTeamRoutes);
router.use('/admin/scanner', adminScannerRoutes);

export default router;

import { Router } from 'express';

import adminAnalyticsRoutes from './admin/analytics.routes';
import adminArtistRoutes from './admin/artist.routes';
import adminAuthRoutes from './admin/auth.routes';
import adminBookingRoutes from './admin/booking.routes';
import adminCouponRoutes from './admin/coupon.routes';
import adminDJRoutes from './admin/dj.routes';
import adminDiagnosticsRoutes from './admin/diagnostics.routes';
import adminEventRoutes from './admin/event.routes';
import adminNotificationRoutes from './admin/notification.routes';
import adminPopupRoutes from './admin/popup.routes';
import adminRefundRoutes from './admin/refund.routes';
import adminScannerRoutes from './admin/scanner.routes';
import adminUploadRoutes from './admin/upload.routes';
import adminTeamRoutes from './admin/user.routes';
import adminVenueRoutes from './admin/venue.routes';
import healthRoutes from './health.routes';

// Public routes
import publicArtistRoutes from './public/artist.routes';
import { authRouter as publicAuthRoutes } from './public/auth.routes';
import publicBookingRoutes from './public/booking.routes';
import publicDJRoutes from './public/dj.routes';
import publicEventRoutes from './public/event.routes';
import publicPaymentRoutes from './public/payment.routes';
import publicPopupRoutes from './public/popup.routes';
import publicVenueRoutes from './public/venue.routes';

const router = Router();

// ─── Health ───────────────────────────────────────────────────
router.use('/health', healthRoutes);

// ─── Public routes ───────────────────────────────────────────
router.use('/auth', publicAuthRoutes);
router.use('/events', publicEventRoutes);
router.use('/bookings', publicBookingRoutes);
router.use('/payments', publicPaymentRoutes);
router.use('/dj-operators', publicDJRoutes);
router.use('/artists', publicArtistRoutes);
router.use('/venues', publicVenueRoutes);
router.use('/popups', publicPopupRoutes);

// ─── Admin: Auth ──────────────────────────────────────────────
router.use('/admin/auth', adminAuthRoutes);

// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
router.use('/admin/uploads', adminUploadRoutes);

// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
router.use('/admin/events', adminEventRoutes);
router.use('/admin/venues', adminVenueRoutes);
router.use('/admin/artists', adminArtistRoutes);
router.use('/admin/dj-operators', adminDJRoutes);

// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
router.use('/admin/bookings', adminBookingRoutes);
router.use('/admin/refunds', adminRefundRoutes);

// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);
router.use('/admin/diagnostics', adminDiagnosticsRoutes);

// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
router.use('/admin/popups', adminPopupRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/admin/team', adminTeamRoutes);
router.use('/admin/scanner', adminScannerRoutes);

export default router;

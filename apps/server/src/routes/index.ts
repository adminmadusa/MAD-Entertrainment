import { Router } from 'express';

import adminAnalyticsRoutes from './admin/analytics.routes';
import adminAuthRoutes from './admin/auth.routes';
import adminBookingRoutes from './admin/booking.routes';
import adminCategoryRoutes from './admin/category.routes';
import adminCouponRoutes from './admin/coupon.routes';
import adminDiagnosticsRoutes from './admin/diagnostics.routes';
import adminDjOperatorRoutes from './admin/dj-operator.routes';
import adminEventRoutes from './admin/event.routes';
import adminMarketingRoutes from './admin/marketing.routes';
import adminNotificationRoutes from './admin/notification.routes';
import adminPopupRoutes from './admin/popup.routes';
import adminRefundRoutes from './admin/refund.routes';
import adminScannerRoutes from './admin/scanner.routes';
import adminTeamRoutes from './admin/team.routes';
import adminTicketProfileRoutes from './admin/ticket-profile.routes';
import adminTierRoutes from './admin/tier.routes';
import adminUploadRoutes from './admin/upload.routes';
import adminUserRoutes from './admin/user.routes';
import adminWebhookRoutes from './admin/webhook.routes';
import devRoutes from './dev.routes';
import healthRoutes from './health.routes';
import publicAuthRoutes from './public/auth.routes';
import publicBookingRoutes from './public/booking.routes';
import publicCategoryRoutes from './public/category.routes';
import publicDJOperatorRoutes from './public/dj-operator.routes';
import publicEventRoutes from './public/event.routes';
import publicMarketingRoutes from './public/marketing.routes';
import publicPaymentRoutes from './public/payment.routes';
import publicPopupRoutes from './public/popup.routes';
import publicTicketRoutes from './public/ticket.routes';

const router: Router = Router();

// ─── Health ───────────────────────────────────────────────────
router.use('/health', healthRoutes);

// Dev Diagnostics (Exposed in development only)
if (process.env.NODE_ENV !== 'production') {
  router.use('/dev', devRoutes);
}

// ─── Public routes ───────────────────────────────────────────
router.use('/auth', publicAuthRoutes);
router.use('/events', publicEventRoutes);
router.use('/bookings', publicBookingRoutes);
router.use('/payments', publicPaymentRoutes);
router.use('/dj-operators', publicDJOperatorRoutes);
router.use('/categories', publicCategoryRoutes);
router.use('/popups', publicPopupRoutes);
router.use('/public/tickets', publicTicketRoutes);
router.use('/marketing', publicMarketingRoutes);

// ─── Admin: Auth ──────────────────────────────────────────────
router.use('/admin/auth', adminAuthRoutes);

// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
router.use('/admin/uploads', adminUploadRoutes);

// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
router.use('/admin/events', adminEventRoutes);
router.use('/admin/dj-operators', adminDjOperatorRoutes);

// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
router.use('/admin/bookings', adminBookingRoutes);
router.use('/admin/refunds', adminRefundRoutes);

// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);
router.use('/admin/diagnostics', adminDiagnosticsRoutes);
router.use('/admin/webhooks', adminWebhookRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/tiers', adminTierRoutes);
router.use('/admin/ticket-profiles', adminTicketProfileRoutes);

// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
router.use('/admin/popups', adminPopupRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/admin/team', adminTeamRoutes);
router.use('/admin/scanner', adminScannerRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/marketing', adminMarketingRoutes);

export default router;

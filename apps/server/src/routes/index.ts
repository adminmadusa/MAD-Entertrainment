import { Router } from 'express';

import adminDiagnosticsRoutes from './admin/diagnostics.routes';
import devRoutes from './dev.routes';
import healthRoutes from './health.routes';
import publicBookingRoutes from './public/booking.routes';
import publicDJOperatorRoutes from './public/dj-operator.routes';
import publicEventRoutes from './public/event.routes';
import publicMarketingRoutes from './public/marketing.routes';
import publicPaymentRoutes from './public/payment.routes';
import publicPopupRoutes from './public/popup.routes';
import publicTicketRoutes from './public/ticket.routes';

const router: Router = Router();

import publicAuthRoutes from './public/auth.routes';
import publicCategoryRoutes from './public/category.routes';


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
import adminAuthRoutes from './admin/auth.routes';
router.use('/admin/auth', adminAuthRoutes);

// ─── Admin: Uploads (Cloudinary) ─────────────────────────────
import adminUploadRoutes from './admin/upload.routes';
router.use('/admin/uploads', adminUploadRoutes);

// ─── Admin: Phase 3 — Content CRUD ───────────────────────────
import adminEventRoutes from './admin/event.routes';
import adminDjOperatorRoutes from './admin/dj-operator.routes';

router.use('/admin/events', adminEventRoutes);
router.use('/admin/dj-operators', adminDjOperatorRoutes);

// ─── Admin: Phase 4 — Bookings & Refunds ─────────────────────
import adminBookingRoutes from './admin/booking.routes';
import adminRefundRoutes from './admin/refund.routes';
router.use('/admin/bookings', adminBookingRoutes);
router.use('/admin/refunds', adminRefundRoutes);

// ─── Admin: Phase 5 — Coupons & Analytics ────────────────────
import adminCouponRoutes from './admin/coupon.routes';
import adminAnalyticsRoutes from './admin/analytics.routes';
import adminCategoryRoutes from './admin/category.routes';
import adminTierRoutes from './admin/tier.routes';
import adminTicketProfileRoutes from './admin/ticket-profile.routes';
import adminWebhookRoutes from './admin/webhook.routes';

router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);
router.use('/admin/diagnostics', adminDiagnosticsRoutes);
router.use('/admin/webhooks', adminWebhookRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/tiers', adminTierRoutes);
router.use('/admin/ticket-profiles', adminTicketProfileRoutes);


// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
import adminScannerRoutes from './admin/scanner.routes';
import adminNotificationRoutes from './admin/notification.routes';
import adminTeamRoutes from './admin/team.routes';
import adminPopupRoutes from './admin/popup.routes';
import adminUserRoutes from './admin/user.routes';
import adminMarketingRoutes from './admin/marketing.routes';

router.use('/admin/popups', adminPopupRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/admin/team', adminTeamRoutes);
router.use('/admin/scanner', adminScannerRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/marketing', adminMarketingRoutes);

export default router;

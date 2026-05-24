import { Router } from 'express';

import adminDiagnosticsRoutes from './admin/diagnostics.routes';
import healthRoutes from './health.routes';
import publicBookingRoutes from './public/booking.routes';
import publicEventRoutes from './public/event.routes';
import publicPaymentRoutes from './public/payment.routes';
import { adminLimiter } from '../middleware/rate.middleware';

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
router.use('/dj-operators', unreconstructed);
router.use('/artists', unreconstructed);
router.use('/venues', unreconstructed);
router.use('/popups', unreconstructed);

// ─── Admin: Auth ──────────────────────────────────────────────
router.use('/admin', adminLimiter as any);
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
router.use('/admin/diagnostics', adminDiagnosticsRoutes);

// ─── Admin: Phase 7 — Popups, Notifications, Team ────────────
router.use('/admin/popups', unreconstructed);
router.use('/admin/notifications', unreconstructed);
router.use('/admin/team', unreconstructed);
router.use('/admin/scanner', unreconstructed);

export default router;

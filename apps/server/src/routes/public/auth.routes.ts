import { Router } from 'express';
import { AuthController } from '../../controllers/public/auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate.middleware';

const router: Router = Router();

// Google OAuth Login (protected by auth-specific rate limiter)
router.post('/google', authLimiter, AuthController.loginWithGoogle);

// Request Magic Link / OTP Email (protected by auth-specific rate limiter to prevent email queue spam)
router.post('/magic-link', authLimiter, AuthController.requestMagicLink);

// Verify Magic Link Click (GET redirect to web frontend)
router.get('/verify', AuthController.redirectMagicLink);

// Verify Magic Link token or OTP input (protected by auth-specific rate limiter to block brute-force codes)
router.post('/verify', authLimiter, AuthController.verifyMagicLinkOrOTP);

// Refresh Session Token (protected by auth-specific rate limiter)
router.post('/refresh', authLimiter, AuthController.refresh);

// User Logout
router.post('/logout', AuthController.logout);

// Retrieve currently logged-in user profile details
router.get('/me', requireAuth, AuthController.getMe);

// Retrieve historical bookings linked to the user account
router.get('/my-bookings', requireAuth, AuthController.getMyBookings);

export default router;

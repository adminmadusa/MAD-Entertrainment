import { Router } from 'express';
import { AuthController } from '../../controllers/public/auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate.middleware';

const router: Router = Router();

// Google OAuth Login (protected by auth-specific rate limiter)
router.post('/google', authLimiter, AuthController.loginWithGoogle);

// Check if email exists
router.post('/check-email', authLimiter, AuthController.checkEmail);

// Request Magic Link / OTP Email (protected by auth-specific rate limiter to prevent email queue spam)
router.post('/magic-link', authLimiter, AuthController.requestMagicLink);

// Verify Magic Link token or OTP input (protected by auth-specific rate limiter to block brute-force codes)
router.post('/verify', authLimiter, AuthController.verifyMagicLinkOrOTP);

// Refresh Session Token (protected by auth-specific rate limiter)
router.post('/refresh', authLimiter, AuthController.refresh);

// User Logout
router.post('/logout', AuthController.logout);

// Retrieve currently logged-in user profile details
router.get('/me', requireAuth, AuthController.getMe);

export default router;

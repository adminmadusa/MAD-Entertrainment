import { Router } from 'express';

import { AuthController } from '../../controllers/public/auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate.middleware';
import { csrfProtection } from '../../middleware/security/csrf.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  checkEmailSchema,
  googleAuthSchema,
  logoutAuthSchema,
  magicLinkSchema,
  refreshAuthSchema,
  verifyAuthSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from '../../validations/auth.validation';

const router: Router = Router();

// Google OAuth Login (protected by auth-specific rate limiter)
router.post('/google', authLimiter, validateBody(googleAuthSchema), AuthController.loginWithGoogle);

// Check if email exists
router.post('/check-email', authLimiter, validateBody(checkEmailSchema), AuthController.checkEmail);

// Request Magic Link / OTP Email (protected by auth-specific rate limiter to prevent email queue spam)
router.post('/magic-link', authLimiter, validateBody(magicLinkSchema), AuthController.requestMagicLink);

// Verify Magic Link token or OTP input (protected by auth-specific rate limiter to block brute-force codes)
router.post('/verify', authLimiter, validateBody(verifyAuthSchema), AuthController.verifyMagicLinkOrOTP);

// Refresh Session Token (protected by auth-specific rate limiter + CSRF)
router.post('/refresh', authLimiter, csrfProtection, validateBody(refreshAuthSchema), AuthController.refresh);

// User Logout (protected by CSRF)
router.post('/logout', csrfProtection, validateBody(logoutAuthSchema), AuthController.logout);

// Retrieve currently logged-in user profile details
router.get('/me', requireAuth, AuthController.getMe);

// Update currently logged-in user profile details safely
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), AuthController.updateProfile);

// Profile photo management routes
router.post('/profile/photo', requireAuth, uploadMiddleware.single('photo'), AuthController.uploadProfilePhoto);
router.delete('/profile/photo', requireAuth, AuthController.deleteProfilePhoto);

// Permanently delete user account
router.delete('/account', requireAuth, validateBody(deleteAccountSchema), AuthController.deleteAccount);

export default router;

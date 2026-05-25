import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { uploadImage } from '../../controllers/admin/upload.controller';

const router: Router = Router();

// Apply admin protection to the entire router
router.use(requireAdmin);

/**
 * @route POST /api/admin/uploads/image
 * @desc Securely upload an image to Cloudinary via backend parsing
 * @access Private/Admin
 */
router.post(
  '/image',
  uploadMiddleware.single('image'),
  uploadImage
);

export default router;

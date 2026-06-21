import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { uploadImage, deleteUpload } from '../../controllers/admin/upload.controller';
import { validate } from '../../middleware/validation.middleware';
import { deleteUploadSchema } from '../../validations/admin-content.validation';

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

/**
 * @route DELETE /api/admin/uploads
 * @desc Securely delete an image from Cloudinary using its public ID
 * @access Private/Admin
 */
router.delete(
  '/',
  validate(deleteUploadSchema),
  deleteUpload
);

export default router;

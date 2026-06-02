import { Router } from 'express';
import { AdminRole } from '@mad/shared';

import * as userController from '../../controllers/admin/user.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import {
  adminUsersQuerySchema,
  adminUserByIdSchema,
  adminUserByEmailSchema,
} from '../../validations/admin-user.validation';

const router: Router = Router();

// All administrative user routes require admin authentication
router.use(requireAdmin);

// Fetch paginated listing of customers (registered or guest)
router.get(
  '/',
  requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT),
  validateQuery(adminUsersQuerySchema),
  userController.getUsers
);

// Fetch detailed guest purchaser profile by email
router.get(
  '/guest/:email',
  requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT),
  validate(adminUserByEmailSchema),
  userController.getGuestUserByEmail
);

// Fetch detailed registered user profile
router.get(
  '/:id',
  requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT),
  validate(adminUserByIdSchema),
  userController.getUserById
);

// Toggle registered user account active status (suspend / reactivate)
router.patch(
  '/:id/toggle-active',
  requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
  validate(adminUserByIdSchema),
  userController.toggleUserActive
);

export default router;

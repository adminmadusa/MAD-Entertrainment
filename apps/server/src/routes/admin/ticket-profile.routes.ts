import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as ticketProfileController from '../../controllers/admin/ticket-profile.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createTicketProfileSchema, updateTicketProfileSchema, adminBulkIdsSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createTicketProfileSchema), ticketProfileController.createTicketProfile);
router.get('/', ticketProfileController.getTicketProfiles);
router.get('/:id', validate(adminIdParamSchema), ticketProfileController.getTicketProfileById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updateTicketProfileSchema), ticketProfileController.updateTicketProfile);
router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), ticketProfileController.deleteTicketProfile);

router.post('/bulk/delete', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminBulkIdsSchema), ticketProfileController.bulkDeleteTicketProfiles);
router.post('/bulk/status', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminBulkIdsSchema), ticketProfileController.bulkUpdateTicketProfileStatus);

export default router;

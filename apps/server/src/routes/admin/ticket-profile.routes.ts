import { Router } from 'express';
import { AdminRole } from '@mad/shared';
import * as ticketProfileController from '../../controllers/admin/ticket-profile.controller';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createTicketProfileSchema, updateTicketProfileSchema } from '../../validations/admin-content.validation';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createTicketProfileSchema), ticketProfileController.createTicketProfile);
router.get('/', ticketProfileController.getTicketProfiles);
router.get('/:id', validate(adminIdParamSchema), ticketProfileController.getTicketProfileById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updateTicketProfileSchema), ticketProfileController.updateTicketProfile);
router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), ticketProfileController.deleteTicketProfile);

export default router;

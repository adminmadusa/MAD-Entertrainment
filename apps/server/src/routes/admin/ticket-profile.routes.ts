import { Router } from 'express';
import * as ticketProfileController from '../../controllers/admin/ticket-profile.controller';
import { validate } from '../../middleware/validation.middleware';
import { createTicketProfileSchema, updateTicketProfileSchema } from '../../validations/admin-content.validation';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createTicketProfileSchema), ticketProfileController.createTicketProfile);
router.get('/', ticketProfileController.getTicketProfiles);
router.get('/:id', ticketProfileController.getTicketProfileById);
router.put('/:id', validate(updateTicketProfileSchema), ticketProfileController.updateTicketProfile);
router.delete('/:id', ticketProfileController.deleteTicketProfile);

export default router;

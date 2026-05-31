import { Router } from 'express';
import * as eventController from '../../controllers/admin/event.controller';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createEventSchema, updateEventSchema } from '../../validations/admin-content.validation';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createEventSchema), eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:id', validate(adminIdParamSchema), eventController.getEventById);
router.put('/:id', validate(updateEventSchema), eventController.updateEvent);
router.delete('/:id', validate(adminIdParamSchema), eventController.deleteEvent);

export default router;

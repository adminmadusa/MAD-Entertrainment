import { Router } from 'express';
import * as artistController from '../../controllers/admin/artist.controller';
import { validate } from '../../middleware/validation.middleware';
import { createArtistSchema, updateArtistSchema } from '../../validations/admin-content.validation';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createArtistSchema), artistController.createArtist);
router.get('/', artistController.getArtists);
router.get('/:id', artistController.getArtistById);
router.put('/:id', validate(updateArtistSchema), artistController.updateArtist);
router.delete('/:id', artistController.deleteArtist);

export default router;

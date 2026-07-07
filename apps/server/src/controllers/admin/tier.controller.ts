import * as tierService from '../../services/admin/tier.service';
import { createCrudController } from '../../utils/crud-controller';

const controller = createCrudController({
  create: tierService.createTier,
  getAll: tierService.getTiers,
  update: tierService.updateTier,
  delete: tierService.deleteTier
}, 'Tier', 'tier');

export const createTier = controller.create;
export const getTiers = controller.getAll;
export const updateTier = controller.update;
export const deleteTier = controller.delete;

import { Tier, ITier } from '../../models/tier.schema';
import { createCrudService } from '../../utils/crud-service';

const service = createCrudService<ITier>(Tier, 'events:*', { sortIndex: 1, name: 1 });

export const createTier = service.create;
export const getTiers = service.getAll;
export const updateTier = service.update;
export const deleteTier = service.delete;

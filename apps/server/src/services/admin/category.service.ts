import { Category, ICategory } from '../../models/category.schema';
import { createCrudService } from '../../utils/crud-service';

const service = createCrudService<ICategory>(Category, 'events:*', { name: 1 });

export const createCategory = service.create;
export const getCategories = service.getAll;
export const updateCategory = service.update;
export const deleteCategory = service.delete;

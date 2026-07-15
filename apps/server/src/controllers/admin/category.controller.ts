import * as categoryService from '../../services/admin/category.service';
import { createCrudController } from '../../utils/crud-controller';

const controller = createCrudController({
  create: categoryService.createCategory,
  getAll: categoryService.getCategories,
  update: categoryService.updateCategory,
  delete: categoryService.deleteCategory
}, 'Category', 'category');

export const createCategory = controller.create;
export const getCategories = controller.getAll;
export const updateCategory = controller.update;
export const deleteCategory = controller.delete;

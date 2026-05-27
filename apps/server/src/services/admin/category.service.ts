import { Category, ICategory } from "../../models/category.schema";
import { CacheService } from "../cache.service";

export const createCategory = async (
  data: Partial<ICategory>,
): Promise<ICategory> => {
  if (data.name) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const category = new Category(data);
  const result = await category.save();
  await CacheService.delPattern("events:*");
  return result;
};

export const getCategories = async (): Promise<ICategory[]> => {
  return await Category.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
};

export const updateCategory = async (
  id: string,
  data: Partial<ICategory>,
): Promise<ICategory | null> => {
  if (data.name) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const updated = await Category.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern("events:*");
  return updated;
};

export const deleteCategory = async (id: string): Promise<ICategory | null> => {
  const deleted = await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  await CacheService.delPattern("events:*");
  return deleted;
};

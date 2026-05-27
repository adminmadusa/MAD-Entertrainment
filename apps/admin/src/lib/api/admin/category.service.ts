import { adminApiClient } from "@/lib/api/client";

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export async function adminGetCategories(): Promise<AdminCategory[]> {
  const { data } = await adminApiClient.get<{ data: AdminCategory[] }>(
    "/admin/categories",
  );
  return Array.isArray(data?.data)
    ? data.data
    : (data?.data && Object.values(data.data).find((v) => Array.isArray(v))) ||
        [];
}

export async function adminCreateCategory(
  payload: Partial<AdminCategory>,
): Promise<AdminCategory> {
  const { data } = await adminApiClient.post<{
    data: { category: AdminCategory };
  }>("/admin/categories", payload);
  return data.data.category;
}

export async function adminUpdateCategory(
  id: string,
  payload: Partial<AdminCategory>,
): Promise<AdminCategory> {
  const { data } = await adminApiClient.put<{
    data: { category: AdminCategory };
  }>(`/admin/categories/${id}`, payload);
  return data.data.category;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/categories/${id}`);
}

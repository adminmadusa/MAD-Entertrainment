import { adminApiClient } from '../client';

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export type ListResponse<T = any> = {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export async function unwrap<T = any>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export const list = <T = any>(path: string, params?: Record<string, unknown>) =>
  unwrap<ListResponse<T>>(adminApiClient.get(path, { params }));
export const getOne = <T = any>(path: string) => unwrap<T>(adminApiClient.get(path));
export const createOne = <T = any>(path: string, payload: unknown) => unwrap<T>(adminApiClient.post(path, payload));
export const updateOne = <T = any>(path: string, payload: unknown) => unwrap<T>(adminApiClient.patch(path, payload));
export const deleteOne = <T = any>(path: string) => unwrap<T>(adminApiClient.delete(path));

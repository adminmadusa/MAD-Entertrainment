import { adminApiClient } from "@/lib/api/client";

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: AdminUser;
}

export async function adminLogin(
  payload: AdminLoginPayload,
): Promise<AdminLoginResponse> {
  const { data } = await adminApiClient.post<{ data: AdminLoginResponse }>(
    "/admin/auth/login",
    payload,
  );
  return data.data;
}

export async function adminGetMe(): Promise<AdminUser> {
  const { data } = await adminApiClient.get<{ data: AdminUser }>(
    "/admin/auth/me",
  );
  return data.data;
}

export async function adminLogout(): Promise<void> {
  await adminApiClient.post("/admin/auth/logout");
}

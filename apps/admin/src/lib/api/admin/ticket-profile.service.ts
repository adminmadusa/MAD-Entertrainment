import { adminApiClient } from "@/lib/api/client";
import { TicketProfile } from "@mad/types";

export async function adminGetTicketProfiles(): Promise<TicketProfile[]> {
  const { data } = await adminApiClient.get<{
    data: { profiles: TicketProfile[] };
  }>("/admin/ticket-profiles");
  return data?.data?.profiles || [];
}

export async function adminGetTicketProfile(
  id: string,
): Promise<TicketProfile> {
  const { data } = await adminApiClient.get<{
    data: { profile: TicketProfile };
  }>(`/admin/ticket-profiles/${id}`);
  return data?.data?.profile;
}

export async function adminCreateTicketProfile(
  payload: Partial<TicketProfile>,
): Promise<TicketProfile> {
  const { data } = await adminApiClient.post<{
    data: { profile: TicketProfile };
  }>("/admin/ticket-profiles", payload);
  return data?.data?.profile;
}

export async function adminUpdateTicketProfile(
  id: string,
  payload: Partial<TicketProfile>,
): Promise<TicketProfile> {
  const { data } = await adminApiClient.put<{
    data: { profile: TicketProfile };
  }>(`/admin/ticket-profiles/${id}`, payload);
  return data?.data?.profile;
}

export async function adminDeleteTicketProfile(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/ticket-profiles/${id}`);
}

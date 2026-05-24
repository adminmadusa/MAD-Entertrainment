import { adminApiClient } from '@/lib/api/client';

export interface DashboardSummary {
  totalBookings: number;
  recentBookings: number;
  totalRevenue: number;
  topEvents: { _id: string; count: number; revenue: number; event: { title: string; startDate: string } }[];
}

export interface RevenuePoint { _id: string; revenue: number; count: number; }

export async function adminGetDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await adminApiClient.get<{ data: DashboardSummary }>('/admin/analytics/summary');
  return data.data;
}

export async function adminGetRevenueChart(days = 30): Promise<RevenuePoint[]> {
  const { data } = await adminApiClient.get<{ data: RevenuePoint[] }>(`/admin/analytics/revenue?days=${days}`);
  return data.data;
}

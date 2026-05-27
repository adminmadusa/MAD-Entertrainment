import { adminApiClient } from "@/lib/api/client";

export interface DashboardSummary {
  totalBookings: number;
  recentBookings: number;
  totalRevenue: number;
  topEvents: {
    _id: string;
    count: number;
    revenue: number;
    event: { title: string; startDate: string };
  }[];
}

export interface RevenuePoint {
  _id: string;
  revenue: number;
  count: number;
}

export async function adminGetDashboardSummary(): Promise<DashboardSummary> {
  try {
    const { data } = await adminApiClient.get<{ data: DashboardSummary }>(
      "/admin/analytics/summary",
    );
    const summary = data?.data;
    return {
      totalBookings: summary?.totalBookings ?? 0,
      recentBookings: summary?.recentBookings ?? 0,
      totalRevenue: summary?.totalRevenue ?? 0,
      topEvents: Array.isArray(summary?.topEvents) ? summary.topEvents : [],
    };
  } catch (error) {
    console.error(
      "[Analytics Service] Failed to fetch dashboard summary, returning default DTO:",
      error,
    );
    return {
      totalBookings: 0,
      recentBookings: 0,
      totalRevenue: 0,
      topEvents: [],
    };
  }
}

export async function adminGetRevenueChart(days = 30): Promise<RevenuePoint[]> {
  try {
    const { data } = await adminApiClient.get<{ data: RevenuePoint[] }>(
      `/admin/analytics/revenue?days=${days}`,
    );
    return Array.isArray(data?.data)
      ? data.data
      : (data?.data &&
          Object.values(data.data).find((v) => Array.isArray(v))) ||
          [];
  } catch (error) {
    console.error(
      "[Analytics Service] Failed to fetch revenue chart, returning empty list:",
      error,
    );
    return [];
  }
}

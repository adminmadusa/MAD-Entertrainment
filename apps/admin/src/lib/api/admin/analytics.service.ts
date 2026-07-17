import { adminApiClient } from '@/lib/api/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Analytics Service');

export interface DashboardSummary {
  totalBookings: number;
  recentBookings: number;
  totalRevenue: number;
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  topEvents: { _id: string; count: number; revenue: number; event: { title: string; startDate: string } }[];
  pendingRefundsCount: number;
}

export interface RevenuePoint {
  _id: string;
  revenue: number;
  count: number;
  dailyGrossRevenue?: number;
  dailyRefundAmount?: number;
  dailyNetRevenue?: number;
}

export async function adminGetDashboardSummary(): Promise<DashboardSummary> {
  try {
    const { data } = await adminApiClient.get<{ data: DashboardSummary }>('/admin/analytics/summary');
    const summary = data?.data;
    return {
      totalBookings: summary?.totalBookings ?? 0,
      recentBookings: summary?.recentBookings ?? 0,
      totalRevenue: summary?.totalRevenue ?? 0,
      grossRevenue: summary?.grossRevenue ?? 0,
      refundAmount: summary?.refundAmount ?? 0,
      netRevenue: summary?.netRevenue ?? 0,
      topEvents: Array.isArray(summary?.topEvents) ? summary.topEvents : [],
      pendingRefundsCount: summary?.pendingRefundsCount ?? 0,
    };
  } catch (error) {
    logger.error('Failed to fetch dashboard summary, returning default DTO:', error);
    return {
      totalBookings: 0,
      recentBookings: 0,
      totalRevenue: 0,
      grossRevenue: 0,
      refundAmount: 0,
      netRevenue: 0,
      topEvents: [],
      pendingRefundsCount: 0,
    };
  }
}

export async function adminGetRevenueChart(days = 30): Promise<RevenuePoint[]> {
  try {
    const { data } = await adminApiClient.get<{ data: RevenuePoint[] }>(`/admin/analytics/revenue?days=${days}`);
    return Array.isArray(data?.data) ? data.data : (data?.data && Object.values(data.data).find(v => Array.isArray(v)) || []);
  } catch (error) {
    logger.error('Failed to fetch revenue chart, returning empty list:', error);
    return [];
  }
}

export interface AttendanceSummary {
  totalEvents: number;
  totalTicketsSold: number;
  totalCheckIns: number;
  attendanceRate: number;
  noShowRate: number;
}

export interface EventAttendanceRank {
  eventId: string;
  eventName: string;
  startDate: string;
  ticketsSold: number;
  ticketsCheckedIn: number;
  attendancePercentage: number;
  noShowCount: number;
  noShowPercentage: number;
}

export interface AttendanceRankings {
  topAttended: EventAttendanceRank[];
  lowestAttendance: EventAttendanceRank[];
}

export async function adminGetAttendanceSummary(): Promise<AttendanceSummary> {
  try {
    const { data } = await adminApiClient.get<{ data: AttendanceSummary }>('/admin/analytics/attendance/summary');
    const summary = data?.data;
    return {
      totalEvents: summary?.totalEvents ?? 0,
      totalTicketsSold: summary?.totalTicketsSold ?? 0,
      totalCheckIns: summary?.totalCheckIns ?? 0,
      attendanceRate: summary?.attendanceRate ?? 0,
      noShowRate: summary?.noShowRate ?? 0,
    };
  } catch (error) {
    logger.error('Failed to fetch attendance summary, returning default DTO:', error);
    return { totalEvents: 0, totalTicketsSold: 0, totalCheckIns: 0, attendanceRate: 0, noShowRate: 0 };
  }
}

export async function adminGetAttendanceRankings(): Promise<AttendanceRankings> {
  try {
    const { data } = await adminApiClient.get<{ data: AttendanceRankings }>('/admin/analytics/attendance/rankings');
    return {
      topAttended: Array.isArray(data?.data?.topAttended) ? data.data.topAttended : [],
      lowestAttendance: Array.isArray(data?.data?.lowestAttendance) ? data.data.lowestAttendance : [],
    };
  } catch (error) {
    logger.error('Failed to fetch attendance rankings, returning empty lists:', error);
    return { topAttended: [], lowestAttendance: [] };
  }
}

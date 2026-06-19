import { adminApiClient } from '@/lib/api/client';

export interface UserListItem {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  accountType: 'registered' | 'guest';
  loginVia?: 'google' | 'otp' | 'guest';
  isActive?: boolean;
  totalBookings: number;
  createdAt: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    items: UserListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface UserDetailResponse {
  success: boolean;
  data: {
    profile: {
      id: string | null;
      name: string;
      email: string;
      phone: string;
      accountType: 'registered' | 'guest';
      loginVia?: 'google' | 'otp' | 'guest';
      isActive?: boolean;
      lastLogin: string | null;
      createdAt: string;
      totalBookings: number;
      totalTickets: number;
      totalSpend: number;
      lifetimeGrossSpend: number;
      lifetimeRefunds: number;
      lifetimeNetSpend: number;
    };
    bookings: Array<{
      _id: string;
      bookingId: string;
      eventId: {
        _id: string;
        title: string;
        startDate: string;
      } | null;
      status: string;
      purchaseDate: string;
      ticketCount: number;
      totalAmount: number;
      currency: string;
      tickets: Array<{
        ticketId: string;
        tierName: string;
        admits: number;
        seatInfo?: {
          row?: string;
          number?: number;
          section?: string;
        } | null;
        scannedAt: string | null;
      }>;
      ticketsScanned: number;
      ticketsRemaining: number;
      refunds: Array<{
        refundId: string;
        amount: number;
        currency: string;
        reason?: string;
        status: string;
        processedAt: string | null;
      }>;
    }>;
  };
  message?: string;
}

export interface UserToggleActiveResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    isActive: boolean;
  };
  message?: string;
}

export async function adminGetUsers(params: {
  page: number;
  limit: number;
  search?: string;
  type: 'registered' | 'guest';
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<UsersResponse['data']> {
  const { page, limit, search, type, sortField, sortOrder } = params;
  let url = `/admin/users?page=${page}&limit=${limit}&type=${type}`;
  if (search?.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  if (sortField) {
    url += `&sortField=${sortField}`;
  }
  if (sortOrder) {
    url += `&sortOrder=${sortOrder}`;
  }

  const { data } = await adminApiClient.get<UsersResponse>(url);
  return data.data;
}

export async function adminGetRegisteredDetail(id: string): Promise<UserDetailResponse['data']> {
  const { data } = await adminApiClient.get<UserDetailResponse>(`/admin/users/${id}`);
  return data.data;
}

export async function adminGetGuestDetail(email: string): Promise<UserDetailResponse['data']> {
  const { data } = await adminApiClient.get<UserDetailResponse>(`/admin/users/guest/${encodeURIComponent(email)}`);
  return data.data;
}

export async function adminToggleUserActive(id: string): Promise<UserToggleActiveResponse['data']> {
  const { data } = await adminApiClient.patch<UserToggleActiveResponse>(`/admin/users/${id}/toggle-active`);
  return data.data;
}

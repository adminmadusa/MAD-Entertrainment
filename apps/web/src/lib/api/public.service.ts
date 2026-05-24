import { Event, SeatLayout, Booking, Ticket, DJOperator, Artist, Venue, PopupCampaign } from '@mad/types';

import { apiClient } from './client';

export interface PublicEventsResponse {
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function publicGetEvents(filters: { category?: string; search?: string; page?: number; limit?: number } = {}): Promise<PublicEventsResponse> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const { data } = await apiClient.get<PublicEventsResponse>(`/events?${params}`);
  return data;
}

export async function publicGetEventBySlug(slug: string): Promise<Event> {
  const { data } = await apiClient.get<{ data: Event }>(`/events/${slug}`);
  return data.data;
}

// ─── DJ Operators ─────────────────────────────────────────────

export interface PublicDJsResponse {
  data: DJOperator[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function publicGetDJs(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<PublicDJsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const { data } = await apiClient.get<PublicDJsResponse>(`/dj-operators?${params}`);
  return data;
}

export async function publicGetEventSeatLayout(eventId: string): Promise<SeatLayout> {
  const { data } = await apiClient.get<{ data: SeatLayout }>(`/events/${eventId}/seats`);
  return data.data;
}

export async function publicCreateBooking(
  payload: {
    eventId: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    tickets: {
      tier: string;
      quantity: number;
      seats?: {
        seatId: string;
        row: string;
        number: number;
        section?: string;
      }[];
    }[];
    couponCode?: string;
  },
  sessionId: string
): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>('/bookings', payload, {
    headers: {
      'x-session-id': sessionId,
    },
  });
  return data.data;
}

export async function publicGetBookingDetails(bookingId: string): Promise<{ booking: Booking; tickets: Ticket[] }> {
  const { data } = await apiClient.get<{ data: { booking: Booking; tickets: Ticket[] } }>(`/bookings/${bookingId}`);
  return data.data;
}

export async function publicGetMyBookings(): Promise<{ bookings: Booking[]; tickets: Ticket[] }> {
  const { data } = await apiClient.get<{ data: { bookings: Booking[]; tickets: Ticket[] } }>('/bookings/me');
  return data.data;
}

export interface PaymentIntentResponse {
  gateway: 'stripe' | 'razorpay';
  keyId?: string;       // Razorpay Key
  orderId?: string;     // Razorpay Order ID
  publishableKey?: string; // Stripe Key
  clientSecret?: string;   // Stripe Secret
  amount: number;
  currency: string;
  bookingId: string;
  isMock?: boolean;     // Sandbox mock indicator
}

export async function publicCreatePaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay'): Promise<PaymentIntentResponse> {
  const { data } = await apiClient.post<{ data: PaymentIntentResponse }>('/payments/create-intent', {
    bookingId,
    gateway,
  });
  return data.data;
}

export async function publicVerifyPayment(bookingId: string, gatewayPayload: any): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>('/payments/verify', {
    bookingId,
    ...gatewayPayload,
  });
  return data.data;
}

// ─── Artists ─────────────────────────────────────────────────

export interface PublicArtistsResponse {
  data: Artist[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function publicGetArtists(
  filters: { search?: string; genre?: string; page?: number; limit?: number } = {}
): Promise<PublicArtistsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const { data } = await apiClient.get<PublicArtistsResponse>(`/artists?${params}`);
  return data;
}

export async function publicGetArtistBySlug(slug: string): Promise<Artist> {
  const { data } = await apiClient.get<{ data: Artist }>(`/artists/${slug}`);
  return data.data;
}

// ─── Venues ──────────────────────────────────────────────────

export interface PublicVenuesResponse {
  data: Venue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function publicGetVenues(
  filters: { search?: string; city?: string; page?: number; limit?: number } = {}
): Promise<PublicVenuesResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.city) params.set('city', filters.city);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const { data } = await apiClient.get<PublicVenuesResponse>(`/venues?${params}`);
  return data;
}

export async function publicGetVenueBySlug(slug: string): Promise<Venue> {
  const { data } = await apiClient.get<{ data: Venue }>(`/venues/${slug}`);
  return data.data;
}

// ─── Popup Campaigns ─────────────────────────────────────────

export async function publicGetActivePopups(): Promise<PopupCampaign[]> {
  const { data } = await apiClient.get<{ data: PopupCampaign[] }>('/popups/active');
  return data.data;
}

// ─── Auth ────────────────────────────────────────────────────

export async function publicLogin(payload: any) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data.data;
}

export async function publicRegister(payload: any) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data.data;
}

export async function publicGetMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
}

export async function publicLogout() {
  const { data } = await apiClient.post('/auth/logout');
  return data.data;
}

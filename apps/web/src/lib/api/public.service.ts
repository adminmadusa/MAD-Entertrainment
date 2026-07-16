import { STORAGE_VERSION } from '@mad/shared';
import type { Booking, DJOperator, Event, PaginatedDataResponse, PopupCampaign, Ticket } from '@mad/types';
import { CheckoutDetailsInput, ReserveTicketsInput } from '@mad/validations';

import type { AuthResponse, AuthUser, VerificationCodeRequestResponse, VerifyVerificationCodeOrOTPPayload } from '../../types/auth';
import { apiClient } from './client';

export interface VerifyPaymentPayload {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  paymentIntentId?: string;
  [key: string]: unknown;
}

export interface GuestBookingSession {
  sessionId: string;
  token: string;
}

const guestSessionIdKey = `mad_checkout_session_${STORAGE_VERSION}`;
const guestSessionTokenKey = `mad_checkout_session_token_${STORAGE_VERSION}`;

function getGuestSessionHeaders(sessionToken?: string): Record<string, string> {
  if (!sessionToken) return {};
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

export function getStoredGuestBookingSession(): GuestBookingSession | null {
  if (typeof window === 'undefined') return null;

  const sessionId = sessionStorage.getItem(guestSessionIdKey);
  const token = sessionStorage.getItem(guestSessionTokenKey);

  if (!sessionId || !token) return null;
  return { sessionId, token };
}

export async function publicGetBookingSession(): Promise<GuestBookingSession> {
  const { data } = await apiClient.get<{ data: GuestBookingSession }>('/bookings/session');
  return data.data;
}

export async function ensureGuestBookingSession(): Promise<GuestBookingSession> {
  const existing = getStoredGuestBookingSession();
  if (existing) return existing;

  const session = await publicGetBookingSession();
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(guestSessionIdKey, session.sessionId);
    sessionStorage.setItem(guestSessionTokenKey, session.token);
  }

  return session;
}

export interface PublicEventsApiResponse {
  data: {
    events: Event[];
    total: number;
  };
}

export interface PublicDJsApiResponse {
  data: {
    data?: DJOperator[];
    djOperators?: DJOperator[];
    djs?: DJOperator[];
    total?: number;
    pagination?: {
      total?: number;
      totalPages?: number;
    };
  };
}

export type PublicEventsResponse = PaginatedDataResponse<Event>;

export async function publicGetEvents(filters: { page?: number; limit?: number } = {}): Promise<PublicEventsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const { data } = await apiClient.get<PublicEventsApiResponse>(`/events?${params}`);
  const payload = data?.data || { events: [], total: 0 };
  const items = Array.isArray(payload.events) ? payload.events : [];
  return {
    data: items,
    pagination: {
      page,
      limit,
      total: payload.total || 0,
      totalPages: Math.ceil((payload.total || 0) / limit)
    }
  };
}

export async function publicGetEventBySlug(slug: string): Promise<Event> {
  const { data } = await apiClient.get<{ data: Event }>(`/events/${slug}`);
  return data.data;
}

export async function publicGetGallery(slug: string): Promise<{ items: import('@mad/types').EventGalleryItem[]; settings: import('@mad/types').EventGallerySettings | null }> {
  const { data } = await apiClient.get<{ data: { items: import('@mad/types').EventGalleryItem[]; settings: import('@mad/types').EventGallerySettings | null } }>(`/events/${slug}/gallery`);
  return data.data;
}

// ─── DJ Operators ─────────────────────────────────────────────

export type PublicDJsResponse = PaginatedDataResponse<DJOperator>;

export async function publicGetDJs(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<PublicDJsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const { data } = await apiClient.get<PublicDJsApiResponse>(`/dj-operators?${params}`);
  const payload: PublicDJsApiResponse['data'] = data?.data || {};
  let items: DJOperator[] = [];
  if (Array.isArray(payload.data)) {
    items = payload.data;
  } else if (Array.isArray(payload.djOperators)) {
    items = payload.djOperators;
  } else if (Array.isArray(payload.djs)) {
    items = payload.djs;
  }

  const total = payload.pagination?.total ?? payload.total ?? 0;
  const totalPages = payload.pagination?.totalPages ?? Math.ceil(total / limit);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    }
  };
}

export async function publicGetDJBySlug(slug: string): Promise<DJOperator> {
  const { data } = await apiClient.get<{ data: DJOperator }>(`/dj-operators/${slug}`);
  return data.data;
}

export async function publicCreateBooking(
  payload: ReserveTicketsInput,
  sessionToken: string
): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>('/bookings', payload, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data.data;
}

export async function publicSaveCheckoutDetails(
  bookingId: string,
  payload: CheckoutDetailsInput,
  sessionToken: string
): Promise<Booking> {
  const { data } = await apiClient.put<{ data: Booking }>(`/bookings/${bookingId}/checkout-details`, payload, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data.data;
}

export async function publicGetBookingDetails(
  bookingId: string,
  sessionToken?: string
): Promise<{ booking: Booking; tickets: Ticket[]; ticketsReady: boolean }> {
  const { data } = await apiClient.get<{ data: { booking: Booking; tickets: Ticket[]; ticketsReady: boolean } }>(`/bookings/${bookingId}`, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data.data;
}

export async function publicGetMyBookings(): Promise<{ bookings: Booking[]; tickets: Ticket[]; ticketsReadyMap: Record<string, boolean> }> {
  const { data } = await apiClient.get<{ data: { bookings: Booking[]; tickets: Ticket[]; ticketsReadyMap: Record<string, boolean> } }>('/bookings/me');
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
  isFree?: boolean;     // Free booking indicator
  url?: string;         // Optional checkout URL
}

export async function publicCreatePaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay', sessionToken?: string): Promise<PaymentIntentResponse> {
  const { data } = await apiClient.post<{ data: PaymentIntentResponse }>('/payments/create-intent', {
    bookingId,
    gateway,
  }, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data.data;
}

export async function publicVerifyPayment(
  bookingId: string,
  gatewayPayload: VerifyPaymentPayload,
  sessionToken: string = getStoredGuestBookingSession()?.token || ''
): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>('/payments/verify', {
    bookingId,
    ...gatewayPayload,
  }, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data.data;
}

// ─── Popup Campaigns ─────────────────────────────────────────

export async function publicGetActivePopups(): Promise<PopupCampaign[]> {
  const { data } = await apiClient.get<{ data: PopupCampaign[] }>('/popups/active');
  return data.data;
}

// ─── Auth ────────────────────────────────────────────────────

export async function publicGoogleLogin(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/google', { idToken });
  return data.data;
}

export async function publicRequestVerificationCode(
  email: string,
  registrationData?: { firstName: string; lastName: string; mobileNumber?: string }
): Promise<VerificationCodeRequestResponse> {
  const { data } = await apiClient.post<VerificationCodeRequestResponse>('/auth/magic-link', { email, ...registrationData });
  return data;
}

export async function publicVerifyVerificationCodeOrOTP(payload: VerifyVerificationCodeOrOTPPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/verify', payload);
  return data.data;
}


export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  mobileNumber?: string;
}

export async function publicUpdateProfile(
  payload: UpdateProfilePayload
): Promise<AuthUser> {
  const { data } = await apiClient.patch<{ data: AuthUser }>('/auth/profile', payload);
  return data.data;
}

export async function publicGetMe(): Promise<AuthUser & { onboardingRequired?: boolean }> {
  const { data } = await apiClient.get<{ data: AuthUser & { onboardingRequired?: boolean } }>('/auth/me');
  return data.data;
}

export async function publicLogout(): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ data: { success: boolean } }>('/auth/logout');
  return data.data;
}

export async function publicResendTicketEmail(bookingId: string, sessionToken?: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(`/bookings/${bookingId}/resend`, {}, {
    headers: getGuestSessionHeaders(sessionToken),
  });
  return data;
}

export async function publicRecoverBookingEmail(
  transactionId: string
): Promise<{ success: boolean; bookingId: string; guestEmail: string; maskedEmail: string; otpDispatched: boolean; cooldownSeconds: number }> {
  const { data } = await apiClient.post<{ success: boolean; bookingId: string; guestEmail: string; maskedEmail: string; otpDispatched: boolean; cooldownSeconds: number }>(
    '/bookings/recover',
    { transactionId }
  );
  return data;
}

export async function publicVerifyRecoveredBookingOTP(
  transactionId: string,
  otp: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<{ data: AuthResponse }>(
    '/bookings/recover/verify',
    { transactionId, otp }
  );
  return data.data;
}

export async function publicUploadProfilePhoto(file: File): Promise<{ picture: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  const { data } = await apiClient.post<{ data: { picture: string } }>('/auth/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data;
}

export async function publicDeleteProfilePhoto(): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.delete<{ success: boolean; message: string }>('/auth/profile/photo');
  return data;
}

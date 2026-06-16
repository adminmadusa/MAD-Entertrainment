// ============================================================
// MAD Entertrainment — Shared Constants & Enums
// ============================================================

export * from './query-keys';
export * from './storage-keys';

// ─── Event Categories ────────────────────────────────────────
export enum EventCategory {
  MAD_EVENT = 'mad_event',
  DJ_NIGHT = 'dj_night',
  CONCERT = 'concert',
  FESTIVAL = 'festival',
  COMEDY = 'comedy',
  CELEBRITY = 'celebrity',
  THEATRE = 'theatre',
  CINEMA = 'cinema',
  VIP_EVENT = 'vip_event',
  LIVE_SHOW = 'live_show',
}

// ─── Booking Mode ────────────────────────────────────────────
export enum BookingMode {
  SEAT_BASED = 'seat_based',
  GENERAL_ADMISSION = 'general_admission',
}

// ─── Event Status ────────────────────────────────────────────
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
  COMPLETED = 'completed',
  SOLD_OUT = 'sold_out',
}

// ─── Booking Status ──────────────────────────────────────────
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  AWAITING_PAYMENT = 'awaiting_payment',
  EXPIRED = 'expired',
  EXPIRING = 'expiring',
}

export type BookingStatusTone =
  | 'success'
  | 'warning'
  | 'processing'
  | 'danger'
  | 'neutral'
  | 'refund';

export type BookingStatusMeta = {
  label: string;
  tone: BookingStatusTone;
};

export const BOOKING_STATUS_META: Record<BookingStatus, BookingStatusMeta> = {
  [BookingStatus.AWAITING_PAYMENT]: {
    label: 'Awaiting Payment',
    tone: 'warning',
  },
  [BookingStatus.EXPIRING]: {
    label: 'Processing',
    tone: 'processing',
  },
  [BookingStatus.FAILED]: {
    label: 'Payment Failed',
    tone: 'danger',
  },
  [BookingStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: 'danger',
  },
  [BookingStatus.REFUNDED]: {
    label: 'Refunded',
    tone: 'refund',
  },
  [BookingStatus.EXPIRED]: {
    label: 'Expired',
    tone: 'neutral',
  },
  [BookingStatus.CONFIRMED]: {
    label: 'Confirmed',
    tone: 'success',
  },
  [BookingStatus.PENDING]: {
    label: 'Pending',
    tone: 'warning',
  },
};

function toDisplayLabel(status: string): string {
  return status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function getBookingStatusMeta(status: string | null | undefined): BookingStatusMeta {
  if (status && Object.prototype.hasOwnProperty.call(BOOKING_STATUS_META, status)) {
    return BOOKING_STATUS_META[status as BookingStatus];
  }

  return {
    label: status ? toDisplayLabel(status) : 'Unknown',
    tone: 'neutral',
  };
}

export function getBookingStatusLabel(status: string | null | undefined): string {
  return getBookingStatusMeta(status).label;
}

export function getBookingStatusTone(status: string | null | undefined): BookingStatusTone {
  return getBookingStatusMeta(status).tone;
}

// ─── Payment Status ──────────────────────────────────────────
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// ─── Reservation Status ──────────────────────────────────────
export enum ReservationStatus {
  RESERVED = 'reserved',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ─── Inventory State ─────────────────────────────────────────
export enum InventoryState {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  PENDING_PAYMENT = 'pending_payment',
  BOOKED = 'booked',
  EXPIRED = 'expired',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// ─── Payment Gateway ─────────────────────────────────────────
export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

// ─── Payment Method ──────────────────────────────────────────
export enum PaymentMethod {
  UPI = 'upi',
  CARD = 'card',
  NET_BANKING = 'net_banking',
  WALLET = 'wallet',
  STRIPE_CARD = 'stripe_card',
}

// ─── Ticket Tier ─────────────────────────────────────────────
export enum TicketTier {
  GENERAL = 'general',
  SILVER = 'silver',
  GOLD = 'gold',
  VIP = 'vip',
  VVIP = 'vvip',
  PLATINUM = 'platinum',
  BACKSTAGE = 'backstage',
  COUPLE = 'couple',
  GROUP = 'group',
  FAMILY = 'family',
  EARLY_BIRD = 'early_bird',
  CUSTOM = 'custom',
}

// ─── Event Mode ──────────────────────────────────────────────
export enum EventMode {
  LIVE = 'live',
  ONLINE = 'online',
  HYBRID = 'hybrid',
}

// ─── Seat Status ─────────────────────────────────────────────
export enum SeatStatus {
  AVAILABLE = 'available',
  LOCKED = 'locked',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  WHEELCHAIR = 'wheelchair',
}

// ─── Admin Role ──────────────────────────────────────────────
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPPORT = 'support',
  SCANNER = 'scanner',
}

// ─── Refund Status ───────────────────────────────────────────
export enum RefundStatus {
  REQUESTED = 'requested',
  PROCESSING = 'processing',
  GATEWAY_CONFIRMED = 'gateway_confirmed',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FAILED = 'failed',
  INVESTIGATE = 'investigate',
}

// ─── Popup Trigger ───────────────────────────────────────────
export enum PopupTrigger {
  ON_LOAD = 'on_load',
  ON_EXIT = 'on_exit',
  AFTER_DELAY = 'after_delay',
  ON_SCROLL = 'on_scroll',
}

// ─── Notification Type ───────────────────────────────────────
export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  EVENT_REMINDER = 'event_reminder',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_UPDATED = 'event_updated',
  OTP = 'otp',
  MARKETING = 'marketing',
}

// ─── HTTP Status Codes ───────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── Seat Lock Duration ──────────────────────────────────────
export const SEAT_LOCK_TTL_SECONDS = 10 * 60; // 10 minutes

// ─── Max Tickets Per Booking ─────────────────────────────────
export const MAX_TICKETS_PER_BOOKING = 10;

// ─── Popup Cooldown ──────────────────────────────────────────
export const POPUP_COOLDOWN_HOURS = 24;
export const POPUP_SESSION_KEY_PREFIX = 'mad_popup_';

// ─── API Routes ──────────────────────────────────────────────
export const API_ROUTES = {
  HEALTH: '/api/health',
  EVENTS: '/api/events',
  BOOKINGS: '/api/bookings',
  PAYMENTS: '/api/payments',
  USERS: '/api/users',
  AUTH: '/api/auth',
  ADMIN: '/api/admin',
  DJ_OPERATORS: '/api/dj-operators',
  COUPONS: '/api/coupons',
  POPUP_CAMPAIGNS: '/api/popup-campaigns',
  TICKETS: '/api/tickets',
  NOTIFICATIONS: '/api/notifications',
  ANALYTICS: '/api/analytics',
  MEDIA: '/api/media',
} as const;

// ─── Currency ────────────────────────────────────────────────
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// ─── Event Category Labels ───────────────────────────────────
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MAD_EVENT]: 'MAD Event',
  [EventCategory.DJ_NIGHT]: 'DJ Night',
  [EventCategory.CONCERT]: 'Concert',
  [EventCategory.FESTIVAL]: 'Festival',
  [EventCategory.COMEDY]: 'Comedy Show',
  [EventCategory.CELEBRITY]: 'Celebrity Event',
  [EventCategory.THEATRE]: 'Theatre',
  [EventCategory.CINEMA]: 'Cinema',
  [EventCategory.VIP_EVENT]: 'VIP Event',
  [EventCategory.LIVE_SHOW]: 'Live Show',
};

// ─── LocalStorage Keys ───────────────────────────────────────
export * from './storage-keys';

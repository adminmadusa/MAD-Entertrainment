// ============================================================
// MAD Entertrainment — Application & Operational Constants
// ============================================================

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPPORT = 'support',
  SCANNER = 'scanner',
}

export enum PopupTrigger {
  ON_LOAD = 'on_load',
  ON_EXIT = 'on_exit',
  AFTER_DELAY = 'after_delay',
  ON_SCROLL = 'on_scroll',
}

export const POPUP_COOLDOWN_HOURS = 24;
export const POPUP_SESSION_KEY_PREFIX = 'mad_popup_';

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

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

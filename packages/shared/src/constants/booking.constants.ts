// ============================================================
// MAD Entertrainment — Booking Constants & Enums
// ============================================================

export enum BookingMode {
  SEAT_BASED = 'seat_based',
  GENERAL_ADMISSION = 'general_admission',
}

export enum BookingState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum BookingReason {
  BOOKABLE = 'BOOKABLE',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  BOOKING_CLOSED = 'BOOKING_CLOSED',
  BOOKING_NOT_STARTED = 'BOOKING_NOT_STARTED',
  SOLD_OUT = 'SOLD_OUT',
  CAPACITY_REACHED = 'CAPACITY_REACHED',
  TICKET_DISABLED = 'TICKET_DISABLED',
  EVENT_UNPUBLISHED = 'EVENT_UNPUBLISHED',
  EVENT_ARCHIVED = 'EVENT_ARCHIVED',
}

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

export function toDisplayLabel(status: string): string {
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

export const SEAT_LOCK_TTL_SECONDS = 10 * 60; // 10 minutes
export const MAX_TICKETS_PER_BOOKING = 10;

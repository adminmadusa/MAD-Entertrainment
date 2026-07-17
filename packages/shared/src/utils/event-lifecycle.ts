import { EventStatus, DEFAULT_EVENT_DURATION_HOURS } from '../constants';

export type EventLifecycleState = 
  | 'draft'
  | 'upcoming'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'archived'
  | 'postponed';

export interface BaseEventForLifecycle {
  status: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  bookingStartDate?: Date | string | null;
  bookingEndDate?: Date | string | null;
}

/**
 * Resolves the end date of an event using the preferred order of fallback values.
 */
export function getEventEndDate(event: BaseEventForLifecycle): Date {
  if (event.endDate) {
    return new Date(event.endDate);
  }
  if (event.bookingEndDate) {
    return new Date(event.bookingEndDate);
  }
  const durationHours = (event as any).duration ?? DEFAULT_EVENT_DURATION_HOURS;
  return new Date(new Date(event.startDate).getTime() + durationHours * 60 * 60 * 1000);
}

/**
 * Derives the effective lifecycle state of an event based on its administrative status and dates.
 */
export function deriveEventLifecycleState(event: BaseEventForLifecycle): EventLifecycleState {
  const status = event.status as EventStatus;

  // Administrative statuses that override dates
  if (
    status === EventStatus.DRAFT ||
    status === EventStatus.CANCELLED ||
    status === EventStatus.POSTPONED ||
    status === EventStatus.ARCHIVED
  ) {
    return status as EventLifecycleState;
  }

  // Treat explicit COMPLETED status as legacy override
  if (status === EventStatus.COMPLETED) {
    return 'completed';
  }

  const now = new Date().getTime();
  const start = new Date(event.startDate).getTime();
  const end = getEventEndDate(event).getTime();

  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'live';
  return 'upcoming';
}

/**
 * Determines if an event is currently bookable based on its derived lifecycle
 * and its specific ticket sales close policy.
 * This is the SINGLE SOURCE OF TRUTH for whether an event accepts bookings.
 */
export function canBook(event: BaseEventForLifecycle): boolean {
  const lifecycle = deriveEventLifecycleState(event);
  
  // Must be in an active lifecycle state to book
  if (lifecycle !== 'upcoming' && lifecycle !== 'live') {
    return false;
  }

  const now = new Date().getTime();

  if (event.bookingStartDate && now < new Date(event.bookingStartDate).getTime()) {
    return false;
  }

  const closeTime = event.bookingEndDate
    ? new Date(event.bookingEndDate).getTime()
    : (event.startDate ? new Date(event.startDate).getTime() : null);

  if (closeTime && now >= closeTime) {
    return false;
  }

  return true;
}

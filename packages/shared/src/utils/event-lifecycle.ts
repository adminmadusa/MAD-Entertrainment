import { EventStatus } from '../constants';

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

  // If status is PUBLISHED (or COMPLETED as legacy), we calculate based on dates
  const now = new Date().getTime();
  const start = new Date(event.startDate).getTime();
  
  if (event.endDate) {
    const end = new Date(event.endDate).getTime();
    if (now > end) return 'completed';
    if (now >= start && now <= end) return 'live';
    return 'upcoming';
  } else {
    // If no endDate, we just rely on startDate
    // Technically an event without an endDate doesn't have a defined "live" window,
    // but typically it means it starts and ends roughly around the same time.
    if (now >= start) return 'live';
    return 'upcoming';
  }
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

import { BookingStatus, EventStatus } from '../constants';
import { deriveEventLifecycleState, type BaseEventForLifecycle } from './event-lifecycle';

export type BookingLifecycleState =
  | 'upcoming'
  | 'live'
  | 'past'
  | 'cancelled'
  | 'refunded';

export interface BookingForLifecycle {
  status: string;
  eventId?: BaseEventForLifecycle | null;
}

/**
 * Derives the effective lifecycle state of a booking.
 * Precedence:
 * 1. Booking Cancelled
 * 2. Booking Refunded
 * 3. Event Cancelled
 * 4. Event Date calculations (Upcoming, Live, Past)
 */
export function getBookingLifecycle(booking: BookingForLifecycle): BookingLifecycleState {
  if (booking.status === BookingStatus.CANCELLED) {
    return 'cancelled';
  }

  if (booking.status === BookingStatus.REFUNDED) {
    return 'refunded';
  }

  const event = booking.eventId;
  if (!event) {
    return 'upcoming';
  }

  if (event.status === EventStatus.CANCELLED) {
    return 'cancelled';
  }

  const eventState = deriveEventLifecycleState(event);

  if (eventState === 'live') {
    return 'live';
  }

  if (eventState === 'completed' || eventState === 'archived') {
    return 'past';
  }

  return 'upcoming';
}

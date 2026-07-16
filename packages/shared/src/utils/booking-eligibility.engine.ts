import { EventState, BookingReason, EventStatus } from '../constants';
import { deriveEventLifecycleState, canBook } from './event-lifecycle';

export interface BaseEventForBooking {
  status: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  bookingStartDate?: Date | string | null;
  bookingEndDate?: Date | string | null;
  isSoldOut?: boolean;
  totalCapacity?: number;
  ticketsSold?: number;
}

export interface EventBookingCTA {
  text: string;
  disabled: boolean;
  variant: 'primary' | 'secondary' | 'disabled';
  action: 'BOOK' | 'VIEW' | 'NONE';
}

export interface EventBookingState {
  bookingAllowed: boolean;
  bookingReason: BookingReason;
  eventState: EventState;
  bookingCTA: EventBookingCTA;
}

/**
 * Single Source of Truth for computing event booking eligibility.
 * All backends and APIs must use this engine to produce the booking state.
 * 
 * @param event The event data
 * @returns The comprehensive booking state including the computed CTA
 */
export function deriveBookingEligibility(event: BaseEventForBooking): EventBookingState {
  // 1. Determine base lifecycle state using existing shared logic
  const lifecycle = deriveEventLifecycleState(event);
  
  // 2. Map lifecycle to exact UI EventState
  let eventState = EventState.UPCOMING;
  
  if (lifecycle === 'draft') eventState = EventState.DRAFT;
  else if (lifecycle === 'cancelled') eventState = EventState.CANCELLED;
  else if (lifecycle === 'archived') eventState = EventState.ARCHIVED;
  else if (lifecycle === 'postponed') eventState = EventState.PENDING; // Assuming postponed means pending schedule
  else if (lifecycle === 'completed') eventState = EventState.COMPLETED;
  else if (lifecycle === 'live') eventState = EventState.LIVE;
  else if (lifecycle === 'upcoming') eventState = EventState.UPCOMING;

  // 3. Determine booking rules
  let bookingReason: BookingReason = BookingReason.BOOKABLE;
  let bookingAllowed = false;

  if (event.status !== EventStatus.PUBLISHED) {
    bookingReason = BookingReason.EVENT_UNPUBLISHED;
  } else if (lifecycle === 'cancelled') {
    bookingReason = BookingReason.EVENT_CANCELLED;
  } else if (lifecycle === 'completed') {
    bookingReason = BookingReason.EVENT_COMPLETED;
  } else if (lifecycle === 'archived') {
    bookingReason = BookingReason.EVENT_ARCHIVED;
  } else if (event.isSoldOut) {
    eventState = EventState.SOLD_OUT; // Override state to sold out
    bookingReason = BookingReason.SOLD_OUT;
  } else if (event.totalCapacity !== undefined && event.ticketsSold !== undefined && event.ticketsSold >= event.totalCapacity) {
    eventState = EventState.SOLD_OUT;
    bookingReason = BookingReason.CAPACITY_REACHED;
  } else if (!canBook(event)) {
    eventState = EventState.BOOKING_CLOSED;
    bookingReason = BookingReason.BOOKING_CLOSED;
  } else {
    // All checks passed
    bookingAllowed = true;
  }

  // 4. Derive CTA metadata based on computed state
  let cta: EventBookingCTA = {
    text: 'Book Now',
    disabled: false,
    variant: 'primary',
    action: 'BOOK'
  };

  if (!bookingAllowed) {
    cta.disabled = true;
    cta.variant = 'disabled';
    cta.action = 'NONE';
    
    switch (bookingReason) {
      case BookingReason.SOLD_OUT:
      case BookingReason.CAPACITY_REACHED:
        cta.text = 'Sold Out';
        break;
      case BookingReason.BOOKING_CLOSED:
        cta.text = 'Booking Closed';
        break;
      case BookingReason.EVENT_COMPLETED:
        cta.text = 'Event Ended';
        break;
      case BookingReason.EVENT_CANCELLED:
        cta.text = 'Cancelled';
        break;
      case BookingReason.EVENT_UNPUBLISHED:
      case BookingReason.EVENT_ARCHIVED:
        cta.text = 'Unavailable';
        break;
      default:
        cta.text = 'Unavailable';
    }
  }

  return {
    bookingAllowed,
    bookingReason,
    eventState,
    bookingCTA: cta
  };
}

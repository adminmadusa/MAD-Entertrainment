import { EventState, BookingReason, BookingState } from '../constants/index';
import { deriveEventCapabilities } from './event-engine';

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
  action: 'BOOK' | 'VIEW' | 'NONE' | 'GALLERY';
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
  const result = deriveEventCapabilities(event as any);

  let eventState = EventState.UPCOMING;
  if (result.lifecycle === 'LIVE') eventState = EventState.LIVE;
  else if (result.lifecycle === 'COMPLETED') eventState = EventState.COMPLETED;

  if (event.status === 'draft') eventState = EventState.DRAFT;
  else if (event.status === 'cancelled') eventState = EventState.CANCELLED;
  else if (event.status === 'archived') eventState = EventState.ARCHIVED;
  else if (event.status === 'postponed') eventState = EventState.PENDING;

  if (result.booking.reason === 'SOLD_OUT' || result.booking.reason === 'CAPACITY_REACHED') {
    eventState = EventState.SOLD_OUT;
  } else if (result.booking.reason === 'BOOKING_CLOSED') {
    eventState = EventState.BOOKING_CLOSED;
  }

  const bookingAllowed = result.booking.status === BookingState.OPEN;
  const bookingReason = result.booking.reason;

  let cta: EventBookingCTA = {
    text: 'Book Now',
    disabled: !bookingAllowed,
    variant: bookingAllowed ? 'primary' : 'disabled',
    action: bookingAllowed ? 'BOOK' : 'NONE'
  };

  if (!bookingAllowed) {
    switch (bookingReason) {
      case 'SOLD_OUT':
      case 'CAPACITY_REACHED':
        cta.text = 'Sold Out';
        break;
      case 'BOOKING_CLOSED':
        cta.text = 'Booking Closed';
        break;
      case 'EVENT_COMPLETED':
        cta.text = 'Event Ended';
        break;
      case 'EVENT_CANCELLED':
        cta.text = 'Cancelled';
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

